<#
.SYNOPSIS
  Verify current workspace is a valid worktree (not main repo).
#>
[CmdletBinding()]
param([string]$MainRepoPath = "C:\Dev\CMC Go", [switch]$Quiet)
$cwd = (Get-Location).Path.TrimEnd('\', '/')
$normalizedMain = $MainRepoPath.Replace('/', '\').TrimEnd('\')
$normalizedCwd = $cwd.Replace('/', '\').TrimEnd('\')
if ($normalizedCwd -eq $normalizedMain) {
  if (-not $Quiet) {
    Write-Host "[AEOS] ABORT: You are in the main repo!" -ForegroundColor Red
    Write-Host "  Expected: C:\Dev\CMC-Go-Worktrees\wt-impl-<issue>" -ForegroundColor Yellow
  }
  exit 1
}
if (-not $Quiet) { Write-Host "[AEOS] Workspace OK: $cwd" -ForegroundColor Green }
exit 0
