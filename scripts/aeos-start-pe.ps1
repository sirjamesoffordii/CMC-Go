<#
.SYNOPSIS
    Start AEOS by spawning the Principal Engineer agent.
.DESCRIPTION
    Bootstrap script for AEOS. PE will spawn TL, and TL will spawn SE.
    This is the normal startup flow:
    1. Human runs this script
    2. PE spawns and starts its autonomous loop
    3. PE spawns TL when needed
    4. TL spawns SE when work is available
.EXAMPLE
    .\scripts\aeos-start-pe.ps1
#>

$ErrorActionPreference = "Stop"

Write-Host "=== Starting AEOS ===" -ForegroundColor Cyan
Write-Host "Spawning Principal Engineer (who will spawn TL and SE)..." -ForegroundColor Yellow
Write-Host ""

& "$PSScriptRoot\aeos-spawn.ps1" -Agent PE

Write-Host ""
Write-Host "✅ AEOS bootstrap complete!" -ForegroundColor Green
Write-Host "   PE is now running and will spawn TL/SE as needed." -ForegroundColor White
