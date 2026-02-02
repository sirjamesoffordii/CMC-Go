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

.PARAMETER Mode
  Chat mode: 'agent', 'ask', or 'edit'. Defaults to 'agent'.

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

  [ValidateSet('agent', 'ask', 'edit')]
  [string]$Mode = 'agent',

  [string]$Profile,

  [string]$WorktreeRoot = 'C:\Dev\CMC-Go-Worktrees',

  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

# Resolve paths
$RepoRoot = Split-Path -Parent $PSScriptRoot
$WorktreePath = Join-Path $WorktreeRoot $WorktreeName

# Default prompt for persistent SE
if (-not $Prompt) {
  $Prompt = @"
You are Software Engineer (SE). You run continuously.

Your workflow:
1. Register heartbeat: .\scripts\update-heartbeat.ps1 -Role SE -Status "idle" -Worktree "$WorktreePath"
2. Check for assignment: .github/agents/assignment.json
3. If no assignment, wait 30 seconds, then loop back to step 1
4. If assignment exists:
   a. Read issue number, delete the file to claim it
   b. Read issue: gh issue view <number>
   c. Create branch: git checkout -b agent/se/<issue>-<slug> origin/staging
   d. Implement the smallest diff that satisfies requirements
   e. Verify: pnpm check && pnpm test
   f. Create PR: gh pr create --base staging
   g. Update heartbeat to "idle"
   h. Loop back to step 1

Start by registering your heartbeat and checking for assignments.
"@
}

Write-Host "=== Spawn Persistent SE Agent ===" -ForegroundColor Cyan
Write-Host "Worktree:  $WorktreePath"
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
  Write-Host "Persistent SE agent started!" -ForegroundColor Green
  Write-Host "Worktree: $WorktreePath"
  Write-Host ""
  Write-Host "SE will loop continuously, checking for assignments." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
