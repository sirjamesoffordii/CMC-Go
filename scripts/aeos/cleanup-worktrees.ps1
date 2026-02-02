<#
.SYNOPSIS
  Clean up worktrees and branches after SE work is merged.
#>
[CmdletBinding()]
param([int]$IssueNumber, [switch]$All, [switch]$DryRun, [string]$WorktreeRoot = "C:\Dev\CMC-Go-Worktrees")

Write-Host "`n=== WORKTREE CLEANUP ===" -ForegroundColor Yellow

$worktrees = git worktree list 2>&1
$toRemove = @()

foreach ($wt in $worktrees) {
  if ($wt -match "^(.+?)\s+(\w+)\s+\[(.+)\]") {
    $path = $matches[1].Trim(); $branch = $matches[3]
    if ($path -match "CMC Go$" -and -not ($path -match "Worktrees")) {
      Write-Host "  SKIP (main): $path" -ForegroundColor Gray
      continue
    }
    $shouldRemove = ($IssueNumber -and $path -match "wt-impl-$IssueNumber") -or ($All -and $path -match "wt-impl-|CMC-Go-Worktrees")
    if ($shouldRemove) { $toRemove += @{ Path = $path; Branch = $branch } }
    else { Write-Host "  KEEP: $path" -ForegroundColor Green }
  }
}

if ($toRemove.Count -eq 0) { Write-Host "`n  Nothing to clean.`n"; exit 0 }

Write-Host "`n  Will remove $($toRemove.Count) worktree(s):" -ForegroundColor Cyan
$toRemove | ForEach-Object { Write-Host "    X $($_.Path) [$($_.Branch)]" -ForegroundColor Yellow }

if ($DryRun) { Write-Host "`n  [DryRun] No changes.`n" -ForegroundColor Yellow; exit 0 }

foreach ($wt in $toRemove) {
  try {
    git worktree remove --force $wt.Path 2>&1 | Out-Null
    Write-Host "    Removed: $($wt.Path)" -ForegroundColor Green
    git branch -D $wt.Branch 2>&1 | Out-Null
  } catch { Write-Host "    Error: $_" -ForegroundColor Red }
}
git worktree prune -v 2>&1 | Out-Null
Write-Host "`n  Done.`n" -ForegroundColor Green
