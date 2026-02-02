<#
.SYNOPSIS
  Display AEOS system status at a glance.
#>
[CmdletBinding()]
param([string]$HeartbeatPath = ".github/agents/heartbeat.json", [int]$StaleMinutes = 6)
$ErrorActionPreference = 'Continue'

Write-Host "`n=== AEOS STATUS ===" -ForegroundColor Cyan

# Heartbeat
Write-Host "`n[HEARTBEAT]" -ForegroundColor Yellow
if (Test-Path $HeartbeatPath) {
  $hb = Get-Content $HeartbeatPath -Raw | ConvertFrom-Json
  $now = (Get-Date).ToUniversalTime()
  $hb.agents.PSObject.Properties | ForEach-Object {
    $name = $_.Name; $data = $_.Value
    $age = ($now - [datetime]$data.ts).TotalMinutes
    $stale = $age -gt $StaleMinutes
    $icon = if ($stale) { "!!" } else { "OK" }
    $color = if ($stale) { "Red" } else { "Green" }
    $info = "  [$icon] $name".PadRight(20) + "| $($data.status)".PadRight(20)
    if ($data.issue) { $info += "| #$($data.issue)" }
    Write-Host $info -ForegroundColor $color
    if ($data.workspace) { Write-Host "       -> $($data.workspace)" -ForegroundColor DarkGray }
  }
} else { Write-Host "  [No heartbeat file]" -ForegroundColor Yellow }

# Worktrees
Write-Host "`n[WORKTREES]" -ForegroundColor Yellow
git worktree list 2>&1 | ForEach-Object { Write-Host "  $_" }

# Health
Write-Host "`n[HEALTH]" -ForegroundColor Yellow
$cwd = (Get-Location).Path
$inMain = $cwd -match "CMC Go$" -and -not ($cwd -match "Worktrees")
Write-Host ("  Main repo: " + $(if ($inMain) { "YES (PE/TL only)" } else { "no" })) -ForegroundColor $(if ($inMain) { "Yellow" } else { "Green" })
Write-Host "  Branch: $(git branch --show-current)"
$dirty = (git status --porcelain | Measure-Object).Count
Write-Host ("  Uncommitted: " + $(if ($dirty -eq 0) { "clean" } else { "$dirty file(s)" })) -ForegroundColor $(if ($dirty -eq 0) { "Green" } else { "Yellow" })
Write-Host ""
