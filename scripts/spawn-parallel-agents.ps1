<#
.SYNOPSIS
  Spawn multiple Copilot agent sessions in parallel, each in their own worktree.

.DESCRIPTION
  This script enables TRUE parallel agent execution by spawning multiple
  VS Code windows, each with its own worktree and Copilot chat session.
  
  Key insight: The VS Code `code chat -r` command targets the "last active"
  window. By opening windows sequentially with a small delay, we can route
  prompts to specific windows.

.PARAMETER Issues
  Array of issue numbers to work on. Each gets its own worktree and agent.

.PARAMETER Profile
  VS Code profile prefix. Each agent gets its own profile: <prefix>-1, <prefix>-2, etc.
  If not specified, no profile isolation is used.

.PARAMETER WorktreeRoot
  Root directory for worktrees. Defaults to C:\Dev\CMC-Go-Worktrees.

.PARAMETER DelayBetween
  Seconds to wait between spawning agents. Default 4.

.PARAMETER DryRun
  Show what would be done without executing.

.EXAMPLE
  # Spawn agents for issues 42, 43, 44
  .\spawn-parallel-agents.ps1 -Issues 42,43,44

.EXAMPLE
  # Spawn with profile isolation
  .\spawn-parallel-agents.ps1 -Issues 42,43 -Profile "Agent-SWE"

.EXAMPLE
  # Dry run
  .\spawn-parallel-agents.ps1 -Issues 42,43,44 -DryRun

.NOTES
  LIMITATION: The -r (reuse-window) flag targets the "last active" window.
  This means we must spawn agents sequentially to ensure prompts go to
  the correct windows.
  
  For true parallel dispatch with targeting, VS Code would need a
  --window-id or --folder-uri flag for the chat command.
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [int[]]$Issues,

  [string]$Profile,

  [string]$WorktreeRoot = 'C:\Dev\CMC-Go-Worktrees',

  [int]$DelayBetween = 4,

  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$ScriptDir = $PSScriptRoot
$SpawnScript = Join-Path $ScriptDir 'spawn-worktree-agent.ps1'

if (-not (Test-Path $SpawnScript)) {
  throw "spawn-worktree-agent.ps1 not found at: $SpawnScript"
}

Write-Host "=== Spawn Parallel Agents ===" -ForegroundColor Cyan
Write-Host "Issues: $($Issues -join ', ')"
Write-Host "Worktree root: $WorktreeRoot"
Write-Host "Delay between spawns: $DelayBetween seconds"
if ($Profile) { Write-Host "Profile prefix: $Profile" }
Write-Host ""

$count = 0
foreach ($issue in $Issues) {
  $count++
  
  Write-Host "[$count/$($Issues.Count)] Spawning agent for Issue #$issue..." -ForegroundColor Cyan
  
  $spawnArgs = @{
    IssueNumber = $issue
    WorktreeRoot = $WorktreeRoot
  }
  
  if ($Profile) {
    $spawnArgs.Profile = "$Profile-$count"
  }
  
  if ($DryRun) {
    $spawnArgs.DryRun = $true
  }
  
  & $SpawnScript @spawnArgs
  
  # Wait between spawns to ensure window targeting works
  if ($count -lt $Issues.Count) {
    Write-Host "Waiting $DelayBetween seconds before next spawn..." -ForegroundColor Gray
    if (-not $DryRun) {
      Start-Sleep -Seconds $DelayBetween
    }
  }
  
  Write-Host ""
}

Write-Host "=== All agents spawned ===" -ForegroundColor Green
Write-Host ""
Write-Host "Active agent sessions:" -ForegroundColor Cyan
foreach ($issue in $Issues) {
  $wtPath = Join-Path $WorktreeRoot "wt-impl-$issue"
  Write-Host "  Issue #$issue -> $wtPath"
}
Write-Host ""
Write-Host "Monitor progress via:" -ForegroundColor Yellow
Write-Host "  gh pr list   # See PRs created by agents"
Write-Host "  gh issue view <num>  # Check issue comments"
