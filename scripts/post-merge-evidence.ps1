param(
  # GitHub repo in owner/name format.
  [string]$Repo = 'sirjamesoffordii/CMC-Go',

  # Issue numbers to comment on.
  [int]$IssueSetupAgentWorkflow = 74,
  [int]$IssueUpdateKeyAgentDocs = 75,

  # Branches to compare against origin/staging.
  [string]$BranchSetupAgentWorkflow = 'origin/agent/setup-agent-workflow',
  [string]$BranchUpdateKeyAgentDocs = 'origin/copilot/update-key-agent-docs',

  # Base ref to compare against.
  [string]$Base = 'origin/staging'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Read-TokenInteractive {
  $sec = Read-Host 'Paste GitHub token (hidden)' -AsSecureString
  if (-not $sec) { return $null }
  return [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  )
}

function Get-NameStatusDiff {
  param([string]$From,[string]$To)
  return (git diff --name-status "$From...$To")
}

function Get-CommitLog {
  param([string]$From,[string]$To,[int]$Count=30)
  return (git log --oneline --decorate "$From..$To" -n $Count)
}

function Post-IssueComment {
  param(
    [hashtable]$Headers,
    [string]$RepoName,
    [int]$IssueNumber,
    [string]$Body
  )

  $uri = "https://api.github.com/repos/$RepoName/issues/$IssueNumber/comments"
  $payload = @{ body = $Body } | ConvertTo-Json
  Invoke-RestMethod -Method Post -Headers $Headers -Uri $uri -Body $payload | Out-Null
}

# Ensure refs are current
git fetch --prune origin | Out-Null

$token = Read-TokenInteractive
if (-not $token) { throw 'No token provided.' }

$headers = @{
  'User-Agent'    = 'CMC-Go-Coordinator'
  'Accept'        = 'application/vnd.github+json'
  'Authorization' = "Bearer $token"
}

$diffSetup = Get-NameStatusDiff -From $Base -To $BranchSetupAgentWorkflow
$logSetup = Get-CommitLog -From $Base -To $BranchSetupAgentWorkflow -Count 30

$diffUpdate = Get-NameStatusDiff -From $Base -To $BranchUpdateKeyAgentDocs
$logUpdate = Get-CommitLog -From $Base -To $BranchUpdateKeyAgentDocs -Count 30

$body74 = @"
STATUS: Ready for Builder

Evidence ($Base...$BranchSetupAgentWorkflow):
$diffSetup

Commits ($Base..$BranchSetupAgentWorkflow):
$logSetup

Risk/Notes:
- Mostly docs/process scaffolding; low runtime risk.
- Expect conflicts if staging already has overlapping .github agent files; prefer keeping staging versions and only bringing over missing additions.

Verification (required):
- pnpm check
- pnpm test
"@

$body75 = @"
STATUS: Needs careful Builder evaluation

Evidence ($Base...$BranchUpdateKeyAgentDocs):
$diffUpdate

Commits ($Base..$BranchUpdateKeyAgentDocs):
$logUpdate

Risk/Notes:
- This is cross-surface (client + server). Merge must be isolated with full gates + independent verify.

Verification (required):
- pnpm check
- pnpm test
- pnpm -s playwright test e2e/smoke.spec.ts
"@

Post-IssueComment -Headers $headers -RepoName $Repo -IssueNumber $IssueSetupAgentWorkflow -Body $body74
Post-IssueComment -Headers $headers -RepoName $Repo -IssueNumber $IssueUpdateKeyAgentDocs -Body $body75

Remove-Variable token,headers -ErrorAction SilentlyContinue
Write-Host "Posted comments to #$IssueSetupAgentWorkflow and #$IssueUpdateKeyAgentDocs." -ForegroundColor Green
