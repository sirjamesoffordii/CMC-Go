<#
.SYNOPSIS
  Spawn a persistent Software Engineer agent in an isolated worktree.

.DESCRIPTION
  This script creates a persistent SE workspace by:
  1. Creating a Git worktree (if it doesn't exist) at a fixed location
  2. Opening VS Code in a new window with that worktree
  3. Triggering a Copilot chat session with the SE prompt
  
  The SE agent runs continuously, picking up work via assignment.json.
  It creates per-issue branches from within the worktree.

.PARAMETER Prompt
  The prompt to send to the Copilot agent. If not provided, uses the
  standard persistent SE prompt.

.PARAMETER WorktreeName
  Name of the worktree (defaults to wt-se).

.PARAMETER BaseBranch
  Branch to base the worktree on (defaults to origin/staging).

.PARAMETER Profile
  VS Code profile to use. Optional.

.PARAMETER WorktreeRoot
  Root directory for worktrees. Defaults to C:\Dev\CMC-Go-Worktrees.

.PARAMETER DryRun
  Show what would be done without executing.

.EXAMPLE
  # Spawn persistent SE agent
  .\spawn-worktree-agent.ps1

.EXAMPLE
  # Dry run to see commands
  .\spawn-worktree-agent.ps1 -DryRun
#>

[CmdletBinding()]
param(
  [string]$Prompt,

  [string]$WorktreeName = 'wt-se',

  [string]$BaseBranch = 'origin/staging',

  [string]$Profile,

  [string]$WorktreeRoot = 'C:\Dev\CMC-Go-Worktrees',

  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

# Resolve paths
$RepoRoot = Split-Path -Parent $PSScriptRoot
$WorktreePath = Join-Path $WorktreeRoot $WorktreeName

# Default prompt for persistent SE - CANONICAL ACTIVATION MESSAGE
if (-not $Prompt) {
  $Prompt = "You are Software Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
}

Write-Host "=== Spawn Persistent SE Agent ===" -ForegroundColor Cyan
Write-Host "Worktree:  $WorktreePath"
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
  Write-Host "SE will use existing worktree." -ForegroundColor Yellow
} else {
  # For persistent SE, we checkout staging directly (no branch created here)
  # SE creates per-issue branches from within the worktree
  $gitCmd = "git -C `"$RepoRoot`" worktree add `"$WorktreePath`" `"$BaseBranch`""
  if ($DryRun) {
    Write-Host "[DryRun] Would run: $gitCmd" -ForegroundColor Yellow
  } else {
    Write-Host "Creating worktree..." -ForegroundColor Cyan
    Push-Location $RepoRoot
    try {
      git fetch --prune origin 2>&1 | Out-Null
      git worktree add $WorktreePath $BaseBranch
      Write-Host "Created: $WorktreePath" -ForegroundColor Green
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

# Step 5: Trigger Copilot chat with Software Engineer agent
$chatArgs = @('chat', '-r', '-m', 'Software Engineer', $Prompt)
$chatCmd = "code " + ($chatArgs -join ' ')

if ($DryRun) {
  Write-Host "[DryRun] Would run: code chat -r -m 'Software Engineer' '<prompt>'" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Prompt content:" -ForegroundColor Cyan
  Write-Host $Prompt
} else {
  Write-Host "Triggering Copilot chat with Software Engineer agent..." -ForegroundColor Cyan
  & code @chatArgs
  Write-Host ""
  Write-Host "Persistent SE agent started!" -ForegroundColor Green
  Write-Host "Worktree: $WorktreePath"
  Write-Host ""
  Write-Host "SE will loop continuously, checking for assignments." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
