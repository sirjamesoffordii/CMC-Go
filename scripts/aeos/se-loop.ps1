<#
.SYNOPSIS
  One-command SE loop helper.

.DESCRIPTION
  Convenience wrapper to reduce workflow footguns. It:
  - Optionally spawns a worktree via scripts/spawn-worktree-agent.ps1
  - Updates heartbeat (merge-safe)
  - Prints a minimal "SE loop" checklist

.PARAMETER IssueNumber
  GitHub issue number.

.PARAMETER Slug
  URL/branch-friendly slug (e.g., fix-campus-archive).

.PARAMETER AgentKey
  Heartbeat agent key (e.g., SE-1).

.PARAMETER Repo
  GitHub repo owner/name.

.PARAMETER WorktreeRoot
  Root folder for worktrees.

.PARAMETER OpenVSCode
  If set, opens a VS Code window for the worktree.

.PARAMETER StartAgent
  If set, starts a Copilot agent session in that VS Code window.
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [int]$IssueNumber,

  [string]$Slug = 'impl',

  [string]$AgentKey = 'SE-1',

  [string]$Repo = 'sirjamesoffordii/CMC-Go',

  [string]$WorktreeRoot = 'C:\\Dev\\CMC-Go-Worktrees',

  [switch]$OpenVSCode,

  [switch]$StartAgent
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$prompt = "You are SE. Implement Issue #$IssueNumber. Run pnpm check && pnpm test, then open a PR to staging."

$spawnArgs = @(
  '-IssueNumber', $IssueNumber,
  '-WorktreeRoot', $WorktreeRoot,
  '-BaseBranch', 'origin/staging'
)

if ($StartAgent) {
  $spawnArgs += @('-Prompt', $prompt)
}

if ($OpenVSCode -or $StartAgent) {
  & "$PSScriptRoot\\..\\spawn-worktree-agent.ps1" @spawnArgs
}

try {
  $branch = "agent/se/$IssueNumber-$Slug"
  & "$PSScriptRoot\\update-heartbeat.ps1" -AgentKey $AgentKey -Status 'implementing' -Issue $IssueNumber -Branch $branch
} catch {
  Write-Warning "[AEOS] Heartbeat update failed: $($_.Exception.Message)"
}

Write-Host "[AEOS] Suggested commands (run inside the worktree):" -ForegroundColor Cyan
Write-Host "  pnpm check" -ForegroundColor Cyan
Write-Host "  pnpm test" -ForegroundColor Cyan
Write-Host "  git add -A; git commit -m \"agent(se): <summary>\"" -ForegroundColor Cyan
Write-Host "  git push -u origin agent/se/$IssueNumber-$Slug" -ForegroundColor Cyan
Write-Host "  gh pr create --base staging --title \"[#${IssueNumber}] <title>\" --body \"...\"" -ForegroundColor Cyan
