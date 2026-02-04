[CmdletBinding()]
param(
  [string]$Repo = 'C:\Dev\CMC Go'
)

$ErrorActionPreference = 'Stop'

function RunGit {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args
  )

  & git @Args
  if ($LASTEXITCODE -ne 0) {
    throw ("git failed (exit $LASTEXITCODE): git " + ($Args -join ' '))
  }
}

$tl = Join-Path $Repo '.worktrees\wt-agent-tl'
$swe = Join-Path $Repo '.worktrees\wt-agent-swe'

$helperPe = '!powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:/Dev/CMC Go/scripts/git-credential-gh.ps1" -ConfigDir "C:/Users/sirja/.gh-principal-engineer-agent"'
$helperTl = '!powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:/Dev/CMC Go/scripts/git-credential-gh.ps1" -ConfigDir "C:/Users/sirja/.gh-tech-lead-agent"'
$helperSwe = '!powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:/Dev/CMC Go/scripts/git-credential-gh.ps1" -ConfigDir "C:/Users/sirja/.gh-software-engineer-agent"'

if (-not (Test-Path -LiteralPath $Repo)) { throw "Missing repo path: $Repo" }
if (-not (Test-Path -LiteralPath $tl)) { throw "Missing TL worktree: $tl" }
if (-not (Test-Path -LiteralPath $swe)) { throw "Missing SWE worktree: $swe" }

# Restore a sane default for the main repo config (shared across worktrees)
RunGit -Args @('-C', $Repo, 'config', '--local', 'user.name', 'sirjamesoffordii')
RunGit -Args @('-C', $Repo, 'config', '--local', 'user.email', 'sirjamesoffordii@users.noreply.github.com')

# Worktree-specific identity + auth
RunGit -Args @('-C', $tl, 'config', '--worktree', 'user.name', 'Tech-Lead-Agent')
RunGit -Args @('-C', $tl, 'config', '--worktree', 'user.email', 'techlead@pvchialpha.com')
RunGit -Args @('-C', $tl, 'config', '--worktree', 'credential.helper', $helperTl)

RunGit -Args @('-C', $swe, 'config', '--worktree', 'user.name', 'Software-Engineer-Agent')
RunGit -Args @('-C', $swe, 'config', '--worktree', 'user.email', 'bravo@pvchialpha.com')
RunGit -Args @('-C', $swe, 'config', '--worktree', 'credential.helper', $helperSwe)

Write-Host 'OK' -ForegroundColor Green
