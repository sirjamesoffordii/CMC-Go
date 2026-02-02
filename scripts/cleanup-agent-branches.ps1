<#
.SYNOPSIS
  Clean up stale agent branches and worktrees.

.DESCRIPTION
  Removes:
  - Local agent branches that have been merged (exist on remote as merged)
  - Stale worktrees that no longer have active SEs
  
  Run this after PRs are merged to keep the repo clean.

.PARAMETER DryRun
  Show what would be deleted without actually deleting.

.EXAMPLE
  # See what would be cleaned
  .\cleanup-agent-branches.ps1 -DryRun

  # Actually clean up
  .\cleanup-agent-branches.ps1
#>

[CmdletBinding()]
param(
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

Write-Host "=== Agent Branch Cleanup ===" -ForegroundColor Cyan
Write-Host ""

# Fetch and prune remote
if (-not $DryRun) {
  Write-Host "Fetching and pruning remote..." -ForegroundColor Gray
  git fetch --prune origin 2>&1 | Out-Null
}

# Get all local agent branches
$localBranches = git branch --list "agent/*" | ForEach-Object { $_.Trim() -replace '^\*?\s*', '' }
Write-Host "Found $($localBranches.Count) local agent branches" -ForegroundColor Gray

# Get merged branches (those whose tips are ancestors of staging)
$mergedCount = 0
$activeCount = 0

foreach ($branch in $localBranches) {
  # Check if branch tip is merged into staging
  $isMerged = git merge-base --is-ancestor $branch origin/staging 2>$null
  
  if ($LASTEXITCODE -eq 0) {
    # Branch is merged
    if ($DryRun) {
      Write-Host "[DryRun] Would delete: $branch (merged)" -ForegroundColor Yellow
    } else {
      git branch -d $branch 2>&1 | Out-Null
      Write-Host "Deleted: $branch" -ForegroundColor Green
    }
    $mergedCount++
  } else {
    # Branch has unmerged changes
    $activeCount++
    Write-Host "Keeping: $branch (has unmerged changes)" -ForegroundColor Gray
  }
}

Write-Host ""
Write-Host "=== Worktree Cleanup ===" -ForegroundColor Cyan

# Prune stale worktrees
if ($DryRun) {
  Write-Host "[DryRun] Would prune stale worktree references" -ForegroundColor Yellow
  git worktree list
} else {
  git worktree prune -v
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Merged branches removed: $mergedCount"
Write-Host "Active branches kept: $activeCount"
Write-Host ""

if ($DryRun) {
  Write-Host "Run without -DryRun to actually clean up" -ForegroundColor Yellow
}
