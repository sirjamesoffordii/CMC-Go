param(
  # GitHub repo in owner/name format. If omitted, derived from `git remote get-url origin`.
  [string]$Repo,

  # url  = print prefilled GitHub "new issue" links (works without gh/token)
  # gh   = create issues using GitHub CLI
  # rest = create issues using GitHub REST API (requires -Token or $env:GITHUB_TOKEN)
  # auto = choose gh if available, else rest if token present, else url
  [ValidateSet('url','gh','rest','auto')]
  [string]$Mode = 'url',

  # GitHub token (fine-grained PAT with Issues: Read/Write). Prefer setting $env:GITHUB_TOKEN.
  [string]$Token = $env:GITHUB_TOKEN,

  # When generating URLs, also open each in your default browser.
  [switch]$Open
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Read-TokenInteractive {
  $sec = Read-Host 'Paste GitHub token (input hidden)' -AsSecureString
  if (-not $sec) { return $null }
  return [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  )
}

function Escape-QueryValue {
  param([Parameter(Mandatory=$true)][string]$Value)
  return [System.Uri]::EscapeDataString($Value)
}

function Resolve-RepoFromOrigin {
  $originUrl = (git remote get-url origin 2>$null)
  if (-not $originUrl) {
    throw "Repo not provided and git origin remote not found. Pass -Repo owner/name."
  }

  # Supports: https://github.com/owner/repo.git and git@github.com:owner/repo.git
  $m = [regex]::Match($originUrl, 'github\.com[:/](?<owner>[^/]+)/(?<repo>[^/.]+)(?:\.git)?$')
  if (-not $m.Success) {
    throw "Could not parse GitHub repo from origin URL: $originUrl. Pass -Repo owner/name."
  }

  return "$($m.Groups['owner'].Value)/$($m.Groups['repo'].Value)"
}

function Resolve-Repo {
  param([string]$RepoName)
  if ($RepoName) { return $RepoName }
  return (Resolve-RepoFromOrigin)
}

function Get-WebBaseUrl {
  param([Parameter(Mandatory=$true)][string]$RepoName)
  return "https://github.com/$RepoName"
}

function New-IssuePrefillUrl {
  param(
    [Parameter(Mandatory=$true)][string]$RepoName,
    [Parameter(Mandatory=$true)][string]$Title,
    [Parameter(Mandatory=$true)][string]$Body,
    [string[]]$Labels = @()
  )

  $base = Get-WebBaseUrl -RepoName $RepoName
  $qs = @(
    "title=$(Escape-QueryValue -Value $Title)",
    "body=$(Escape-QueryValue -Value $Body)"
  )
  if ($Labels.Count -gt 0) {
    $qs += "labels=$(Escape-QueryValue -Value ($Labels -join ','))"
  }
  return "$base/issues/new?" + ($qs -join '&')
}

function New-DiscoveryUrl {
  param(
    [Parameter(Mandatory=$true)][string]$RepoName,
    [Parameter(Mandatory=$true)][string]$Label
  )

  $base = Get-WebBaseUrl -RepoName $RepoName
  $q = "is:issue is:open label:`"$Label`""
  return "$base/issues?q=$(Escape-QueryValue -Value $q)"
}

function New-TitleSearchUrl {
  param(
    [Parameter(Mandatory=$true)][string]$RepoName,
    [Parameter(Mandatory=$true)][string]$Title
  )

  $base = Get-WebBaseUrl -RepoName $RepoName
  $q = "is:issue is:open in:title `"$Title`""
  return "$base/issues?q=$(Escape-QueryValue -Value $q)"
}

function Require-Gh {
  $gh = Get-Command gh -ErrorAction SilentlyContinue
  if (-not $gh) {
    throw "Mode=gh requires GitHub CLI (gh). Install it and run 'gh auth login'."
  }
}

function Invoke-GitHubApi {
  param(
    [Parameter(Mandatory=$true)][string]$Method,
    [Parameter(Mandatory=$true)][string]$Url,
    [object]$Body = $null,
    [hashtable]$Headers = $null
  )

  if (-not $Headers) { $Headers = @{} }
  $Headers['Accept'] = 'application/vnd.github+json'
  $Headers['X-GitHub-Api-Version'] = '2022-11-28'
  if (-not $Headers.ContainsKey('User-Agent')) { $Headers['User-Agent'] = 'CMC-Go-issue-bootstrap' }

  if ($Body -ne $null) {
    $json = $Body | ConvertTo-Json -Depth 10
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers -Body $json -ContentType 'application/json'
  }
  return Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers
}

function Ensure-LabelRest {
  param(
    [Parameter(Mandatory=$true)][string]$RepoName,
    [Parameter(Mandatory=$true)][string]$TokenValue,
    [Parameter(Mandatory=$true)][string]$Label
  )

  $colors = @{
    'role:coordinator' = '5319e7'
    'role:explorer' = '0e8a16'
    'role:builder' = '1d76db'
    'role:verifier' = 'fbca04'
    'role:browser' = 'c5def5'
  }
  $color = $colors[$Label]
  if (-not $color) { $color = 'ededed' }

  $headers = @{ Authorization = "Bearer $TokenValue" }
  try {
    Invoke-GitHubApi -Method 'POST' -Url "https://api.github.com/repos/$RepoName/labels" -Headers $headers -Body @{ name = $Label; color = $color } | Out-Null
  } catch {
    # 422 = already exists / validation; ignore for idempotency.
    $msg = $_.Exception.Message
    if ($msg -match '422' -or $msg -match 'already exists' -or $msg -match 'already_exists') {
      return
    }
    throw
  }
}

function Find-ExistingIssueRest {
  param(
    [Parameter(Mandatory=$true)][string]$RepoName,
    [Parameter(Mandatory=$true)][string]$TokenValue,
    [Parameter(Mandatory=$true)][string]$Title
  )

  $headers = @{ Authorization = "Bearer $TokenValue" }
  $q = "repo:$RepoName is:issue is:open in:title `"$Title`""
  $url = "https://api.github.com/search/issues?q=$(Escape-QueryValue -Value $q)"
  $res = Invoke-GitHubApi -Method 'GET' -Url $url -Headers $headers
  if ($res.total_count -gt 0) {
    return $res.items[0]
  }
  return $null
}

function Create-IssueRest {
  param(
    [Parameter(Mandatory=$true)][string]$RepoName,
    [Parameter(Mandatory=$true)][string]$TokenValue,
    [Parameter(Mandatory=$true)][string]$Title,
    [Parameter(Mandatory=$true)][string]$Body,
    [string[]]$Labels = @()
  )

  $headers = @{ Authorization = "Bearer $TokenValue" }
  $payload = @{ title = $Title; body = $Body; labels = $Labels }
  return Invoke-GitHubApi -Method 'POST' -Url "https://api.github.com/repos/$RepoName/issues" -Headers $headers -Body $payload
}

$resolvedRepo = Resolve-Repo -RepoName $Repo

$issues = @(
  @{ Title = 'Explorer: Audit "ahead of staging" branches and propose merge order'; Labels = @('role:explorer'); Body = @'
STATUS: In Progress

CONTEXT:
- `origin/staging` is working truth.
- These remote branches are ahead of `origin/staging` and need triage:
  - `origin/agent/docs/agent-playbook-nav`
  - `origin/agent/setup-agent-workflow`
  - `origin/copilot/update-key-agent-docs`

ACCEPTANCE CRITERIA:
- Produce a short merge plan recommending order (risk-based) and why.
- For each branch: list what surfaces change (docs-only vs client/server/db), likely conflicts, and required gates.
- Identify any dependency constraints (must merge together / must not merge together).

EVIDENCE REQUIRED:
- `git log --oneline --max-count=20 <branch>`
- `git diff --name-only origin/staging...<branch>`

NEXT:
- Post the plan as an Issue comment with the evidence.
'@ },

  @{ Title = 'Builder: Merge docs playbook nav into staging'; Labels = @('role:builder'); Body = @'
STATUS: In Progress

CONTEXT:
- `staging` is working truth. Merge `origin/agent/docs/agent-playbook-nav` into `staging` as a small, reviewable change.

ACCEPTANCE CRITERIA:
- `staging` includes the docs improvements from `origin/agent/docs/agent-playbook-nav`.
- Keep changes tightly scoped (docs/prompts only).
- Push to `origin/staging`.

EVIDENCE REQUIRED:
- `pnpm check`
- `pnpm test`
- `git status -sb` shows `staging...origin/staging` in sync after push.
'@ },

  @{ Title = 'Builder: Merge setup-agent-workflow (onboarding/registration) into staging'; Labels = @('role:builder'); Body = @'
STATUS: In Progress

CONTEXT:
- `staging` is working truth.
- Merge `origin/agent/setup-agent-workflow` separately (contains app behavior changes).

ACCEPTANCE CRITERIA:
- Merge is isolated (not combined with other branches).
- Resolve conflicts with the smallest safe diff.
- Push to `origin/staging`.

EVIDENCE REQUIRED:
- `pnpm check`
- `pnpm test`
- If UI flow changed, run: `pnpm -s playwright test e2e/smoke.spec.ts` (paste output)
'@ },

  @{ Title = 'Builder: Evaluate merge of copilot/update-key-agent-docs into staging'; Labels = @('role:builder'); Body = @'
STATUS: In Progress

CONTEXT:
- `staging` is working truth.
- Branch `origin/copilot/update-key-agent-docs` includes code changes (client + server) and must be merged with full evidence gates.

ACCEPTANCE CRITERIA:
- Either:
  - A) Merge into `staging`, push to `origin/staging`, and provide full evidence gates.
  - OR
  - B) If not safe to merge: post a Coordinator escalation comment explaining why + propose a safe slice (specific commits/files).

EVIDENCE REQUIRED (for option A):
- `pnpm check`
- `pnpm test`
- `pnpm -s playwright test e2e/smoke.spec.ts`
'@ },

  @{ Title = 'Verifier: Run post-merge gates for each staging merge'; Labels = @('role:verifier'); Body = @'
STATUS: In Progress

CONTEXT:
- After each merge lands in `origin/staging`, independently verify.

ACCEPTANCE CRITERIA:
- For each merge commit: comment with commands run + results + verdict.

VERIFICATION CHECKLIST:
- `pnpm check`
- `pnpm test`
- If UI affected: `pnpm -s playwright test e2e/smoke.spec.ts`
'@ },

  @{ Title = 'Browser: Deployed staging smoke check after merges'; Labels = @('role:browser'); Body = @'
STATUS: In Progress

CONTEXT:
- After merges land in `origin/staging`, do a fast deployed smoke check.

ACCEPTANCE CRITERIA:
- Record click-steps + evidence (screenshots/URLs).
- Prefer read-only verification; only change config if explicitly tasked.
- Report regressions with repro steps.
'@ }
)

$allLabels = @()
foreach ($i in $issues) { $allLabels += $i.Labels }
$allLabels = $allLabels | Select-Object -Unique

if ($Mode -eq 'auto') {
  if (Get-Command gh -ErrorAction SilentlyContinue) {
    $Mode = 'gh'
  } elseif ($Token) {
    $Mode = 'rest'
  } else {
    $Mode = 'url'
  }
}

Write-Host "Repo: $resolvedRepo" -ForegroundColor Cyan
Write-Host "Mode: $Mode" -ForegroundColor Cyan

if ($Mode -eq 'gh') {
  Require-Gh
  Write-Host "Creating $($issues.Count) issues using gh..." -ForegroundColor Cyan
  foreach ($i in $issues) {
    $args = @('issue','create','--repo',$resolvedRepo,'--title',$i.Title,'--body',$i.Body)
    foreach ($lab in $i.Labels) { $args += @('--label',$lab) }
    $url = gh @args
    Write-Host $url -ForegroundColor Green
  }
}
elseif ($Mode -eq 'rest') {
  if (-not $Token) {
    $Token = Read-TokenInteractive
  }
  if (-not $Token) {
    throw "Mode=rest requires -Token or $env:GITHUB_TOKEN (fine-grained PAT with Issues: Read/Write)."
  }

  Write-Host "Ensuring role labels exist (REST)..." -ForegroundColor Cyan
  foreach ($lab in $allLabels) {
    Ensure-LabelRest -RepoName $resolvedRepo -TokenValue $Token -Label $lab
  }

  Write-Host "Creating $($issues.Count) issues using GitHub REST API (idempotent by title)..." -ForegroundColor Cyan
  foreach ($i in $issues) {
    $existing = Find-ExistingIssueRest -RepoName $resolvedRepo -TokenValue $Token -Title $i.Title
    if ($existing) {
      Write-Host "Exists: $($existing.html_url)" -ForegroundColor Yellow
      continue
    }
    $created = Create-IssueRest -RepoName $resolvedRepo -TokenValue $Token -Title $i.Title -Body $i.Body -Labels $i.Labels
    Write-Host $created.html_url -ForegroundColor Green
  }
}
else {
  Write-Host "Printing prefilled issue links (manual submit in browser)..." -ForegroundColor Cyan
  foreach ($i in $issues) {
    $searchUrl = New-TitleSearchUrl -RepoName $resolvedRepo -Title $i.Title
    $newUrl = New-IssuePrefillUrl -RepoName $resolvedRepo -Title $i.Title -Body $i.Body -Labels $i.Labels
    Write-Host "" 
    Write-Host "SEARCH: $searchUrl" -ForegroundColor DarkGray
    Write-Host "CREATE: $newUrl" -ForegroundColor Green
    if ($Open) { Start-Process $newUrl | Out-Null }
  }
}

Write-Host "" 
Write-Host "Discovery links:" -ForegroundColor Cyan
foreach ($lab in $allLabels) {
  Write-Host "- $lab => $(New-DiscoveryUrl -RepoName $resolvedRepo -Label $lab)" -ForegroundColor Gray
}
