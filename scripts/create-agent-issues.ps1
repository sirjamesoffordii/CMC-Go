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
    'claimed:alpha' = '5319e7'
    'claimed:bravo' = '1d76db'
    'status:ready' = '0e8a16'
    'status:verify' = 'fbca04'
    'type:ops' = 'c5def5'
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
  @{
    Title  = 'Alpha: Daily sync + triage (Project-first)'
    Labels = @('status:ready')
    Body   = @'
STATUS: Todo

GOAL:
- Produce a 10-minute execution-ready coordination pass.

CHECKLIST:
- Review the GitHub Project (operational board) and open Issues.
- Identify the smallest next steps that advance the current phase.
- Ensure Issues are executable (goal/scope/AC/verification).
- Deconflict collisions (one surface = one owner).

OUTPUT (comment on this Issue):
- Status
- Work queue (3-7 items)
- Blockers/questions (only if needed)
'@
  },

  @{
    Title  = 'Alpha: Convert goal -> executable Issue spec'
    Labels = @('status:ready')
    Body   = @'
STATUS: Todo

GOAL:
- Take an incoming request and rewrite it into an executable Issue.

ACCEPTANCE CRITERIA:
- Includes: Goal, Scope (in/out), Acceptance Criteria, Verification steps, Files likely touched.
- If a human decision is required: ask via GitHub mention @sirjamesoffordII.
'@
  },

  @{
    Title  = 'Bravo: Implement <short title> (evidence-gated)'
    Labels = @('status:ready')
    Body   = @'
STATUS: Todo

GOAL:
- Implement the assigned Issue with the smallest safe diff.

ACCEPTANCE CRITERIA:
- Matches Issue acceptance criteria.
- PR opened against staging and linked to Issue.

VERIFICATION (minimum evidence):
- `pnpm check`
- targeted `pnpm test`
- If UI flow changed: `pnpm -s playwright test e2e/smoke.spec.ts`
'@
  },

  @{
    Title  = 'Bravo: Peer verify PR #<n> (L1/L2)'
    Labels = @('status:verify')
    Body   = @'
STATUS: Verify

PR:
- <link>

VERIFY LEVEL:
- L1 (peer) | L2 (deep)

VERIFICATION:
- `pnpm check`
- `pnpm test`
- Add focused e2e/DB/ops checks as appropriate

OUTPUT (comment on PR):
- Evidence (commands + concise results)
- Verdict: Pass / Pass-with-notes / Fail
'@
  },

  @{
    Title  = 'Ops: Console/visual verification (Railway/Sentry/Codecov)'
    Labels = @('type:ops','status:ready')
    Body   = @'
STATUS: Todo

GOAL:
- Perform the requested console/config change or visual verification.

EVIDENCE REQUIRED:
- What changed (setting name only; no secret values)
- Where (links or navigation path)
- How to confirm (what proves it worked)

NOTES:
- If login/2FA blocks progress, specify the smallest User action needed.
'@
  }
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

  Write-Host "Ensuring labels exist (REST)..." -ForegroundColor Cyan
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
