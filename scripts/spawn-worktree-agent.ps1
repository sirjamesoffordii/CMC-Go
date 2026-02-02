<#
.SYNOPSIS
  Spawn a Copilot agent session in a new VS Code window for a worktree.

.DESCRIPTION
  This script enables worktree-based parallel agent execution by:
  1. Creating a Git worktree (if it doesn't exist)
  2. Opening VS Code in a new window with that worktree
  3. Triggering a Copilot chat session with the specified prompt
  
  This allows running multiple independent agent sessions in parallel,
  each operating on their own worktree (isolated working directory + branch).

.PARAMETER IssueNumber
  GitHub Issue number to work on.

.PARAMETER Prompt
  The prompt to send to the Copilot agent. If not provided, a default
  prompt based on the issue number is used.

.PARAMETER WorktreeName
  Name of the worktree (defaults to wt-impl-<issue>).

.PARAMETER BaseBranch
  Branch to base the worktree on (defaults to origin/staging).

.PARAMETER Mode
  Chat mode: 'agent', 'ask', or 'edit'. Defaults to 'agent'.

.PARAMETER Profile
  VS Code profile to use. Optional - allows profile-based isolation.

.PARAMETER WorktreeRoot
  Root directory for worktrees. Defaults to C:\Dev\CMC-Go-Worktrees.

.PARAMETER DryRun
  Show what would be done without executing.

.EXAMPLE
  # Spawn agent for Issue #42
  .\spawn-worktree-agent.ps1 -IssueNumber 42 -Prompt "Implement the feature described in Issue #42"

.EXAMPLE
  # Spawn with custom profile (for parallel sessions)
  .\spawn-worktree-agent.ps1 -IssueNumber 42 -Profile "Agent-SWE-1"

.EXAMPLE
  # Dry run to see commands
  .\spawn-worktree-agent.ps1 -IssueNumber 42 -DryRun
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [int]$IssueNumber,

  [string]$Prompt,

  [string]$WorktreeName,

  [string]$BaseBranch = 'origin/staging',

  [ValidateSet('agent', 'ask', 'edit')]
  [string]$Mode = 'agent',

  [string]$Profile,

  [string]$WorktreeRoot = 'C:\Dev\CMC-Go-Worktrees',

  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

# Resolve paths
$RepoRoot = Split-Path -Parent $PSScriptRoot
$WorktreeName = if ($WorktreeName) { $WorktreeName } else { "wt-impl-$IssueNumber" }
$WorktreePath = Join-Path $WorktreeRoot $WorktreeName
$BranchName = "agent/swe/$IssueNumber-impl"

# Default prompt if not provided
if (-not $Prompt) {
  $Prompt = @"
You are Software Engineer (SWE) working on Issue #$IssueNumber.

1. First, read the issue details with: gh issue view $IssueNumber
2. Understand the acceptance criteria
3. Implement the smallest diff that satisfies the requirements
4. Run verification: pnpm check && pnpm test
5. Create a PR when done

Start by reading the issue.
"@
}

Write-Host "=== Spawn Worktree Agent ===" -ForegroundColor Cyan
Write-Host "Issue:     #$IssueNumber"
Write-Host "Worktree:  $WorktreePath"
Write-Host "Branch:    $BranchName"
Write-Host "Mode:      $Mode"
if ($Profile) { Write-Host "Profile:   $Profile" }
Write-Host ""

# Step 1: Ensure worktree root exists
if (-not (Test-Path $WorktreeRoot)) {
  if ($DryRun) {
    Write-Host "[DryRun] Would create: $WorktreeRoot" -ForegroundColor Yellow
  } else {
    Write-Host "Creating worktree root: $WorktreeRoot"
    New-Item -ItemType Directory -Path $WorktreeRoot -Force | Out-Null
  }
}

# Step 2: Create worktree if it doesn't exist
if (Test-Path $WorktreePath) {
  Write-Host "Worktree already exists: $WorktreePath" -ForegroundColor Yellow
} else {
  $gitCmd = "git -C `"$RepoRoot`" worktree add -b `"$BranchName`" `"$WorktreePath`" `"$BaseBranch`""
  if ($DryRun) {
    Write-Host "[DryRun] Would run: $gitCmd" -ForegroundColor Yellow
  } else {
    Write-Host "Creating worktree..." -ForegroundColor Cyan
    Push-Location $RepoRoot
    try {
      git fetch --prune origin 2>&1 | Out-Null
      git worktree add -b $BranchName $WorktreePath $BaseBranch
      Write-Host "Created: $WorktreePath" -ForegroundColor Green
      
      # Update heartbeat with workspace info (optional, fails gracefully)
      try {
        & "$PSScriptRoot\aeos\update-heartbeat.ps1" `
          -AgentKey "SE-$IssueNumber" `
          -Status "spawning" `
          -Issue $IssueNumber `
          -Workspace $WorktreePath `
          -Branch $BranchName
      } catch {
        Write-Host "[AEOS] Heartbeat update skipped: $($_.Exception.Message)" -ForegroundColor Yellow
      }
    } finally {
      Pop-Location
    }
  }
}

# Step 3: Open VS Code in new window
$codeArgs = @($WorktreePath, '-n')
if ($Profile) {
  $codeArgs += @('--profile', $Profile)
}

$codeCmd = "code " + ($codeArgs -join ' ')
if ($DryRun) {
  Write-Host "[DryRun] Would run: $codeCmd" -ForegroundColor Yellow
} else {
  Write-Host "Opening VS Code..." -ForegroundColor Cyan
  & code @codeArgs
}

# Step 4: Wait for VS Code to initialize
$waitSeconds = 3
if ($DryRun) {
  Write-Host "[DryRun] Would wait $waitSeconds seconds for VS Code init" -ForegroundColor Yellow
} else {
  Write-Host "Waiting $waitSeconds seconds for VS Code to initialize..."
  Start-Sleep -Seconds $waitSeconds
}

# Step 5: Trigger Copilot chat
$chatArgs = @('chat', '-r', '-m', $Mode, '--maximize', $Prompt)
$chatCmd = "code " + ($chatArgs -join ' ')

if ($DryRun) {
  Write-Host "[DryRun] Would run: code chat -r -m $Mode --maximize '<prompt>'" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Prompt content:" -ForegroundColor Cyan
  Write-Host $Prompt
} else {
  Write-Host "Triggering Copilot chat..." -ForegroundColor Cyan
  & code @chatArgs
  Write-Host ""
  Write-Host "Agent session started!" -ForegroundColor Green
  Write-Host "Window: $WorktreePath"
  Write-Host "Branch: $BranchName"
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
