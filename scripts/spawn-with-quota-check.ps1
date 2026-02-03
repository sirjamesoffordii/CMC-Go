<#
.SYNOPSIS
  Spawn an agent with quota exhaustion detection.

.DESCRIPTION
  Wrapper for spawning agents that detects rapid respawn patterns
  indicating Claude token quota exhaustion. Prevents infinite respawn
  loops that burn GitHub API quota.

.PARAMETER Role
  Agent role to spawn: PE, TL, or SE

.PARAMETER Prompt
  The prompt to send to the agent (not used for SE, which uses spawn-worktree-agent.ps1)

.PARAMETER Force
  Skip the quota check and spawn anyway

.EXAMPLE
  # Spawn Tech Lead with quota protection
  .\scripts\spawn-with-quota-check.ps1 -Role TL -Prompt "You are Tech Lead. Loop forever."

.EXAMPLE
  # Force spawn despite rapid respawn history
  .\scripts\spawn-with-quota-check.ps1 -Role PE -Prompt "You are PE." -Force
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('PE', 'TL', 'SE')]
    [string]$Role,

    [string]$Prompt,

    [switch]$Force
)

$ErrorActionPreference = 'Stop'

# Spawn log tracks recent spawn attempts
$spawnLogPath = Join-Path $PSScriptRoot ".." ".github" "agents" "spawn-log.json"

# Ensure directory exists
$logDir = Split-Path $spawnLogPath -Parent
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Read spawn history
$history = @()
if (Test-Path $spawnLogPath) {
    try {
        $content = Get-Content $spawnLogPath -Raw
        if (-not [string]::IsNullOrWhiteSpace($content)) {
            $history = @($content | ConvertFrom-Json)
        }
    }
    catch {
        Write-Warning "Could not read spawn log: $($_.Exception.Message)"
        $history = @()
    }
}

# Check for rapid respawn pattern (quota exhaustion indicator)
if (-not $Force) {
    $tenMinutesAgo = (Get-Date).ToUniversalTime().AddMinutes(-10)
    $recentSpawns = @($history | Where-Object { 
        $_.role -eq $Role -and 
        $_.action -eq 'spawn' -and
        ([DateTime]::Parse($_.ts)) -gt $tenMinutesAgo
    })

    if ($recentSpawns.Count -ge 3) {
        Write-Host ""
        Write-Host "⚠️  QUOTA EXHAUSTION DETECTED" -ForegroundColor Red
        Write-Host "   $Role spawned $($recentSpawns.Count) times in last 10 minutes" -ForegroundColor Red
        Write-Host ""
        Write-Host "   This pattern indicates Claude token quota exhaustion." -ForegroundColor Yellow
        Write-Host "   Spawning again would waste resources." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   Options:" -ForegroundColor Cyan
        Write-Host "   1. Wait 30+ minutes for quota to reset" -ForegroundColor White
        Write-Host "   2. Check your Claude/Copilot plan limits" -ForegroundColor White
        Write-Host "   3. Use -Force to spawn anyway (not recommended)" -ForegroundColor White
        Write-Host ""
        
        # Log the backoff
        $history += @{
            ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
            role = $Role
            action = "backoff-quota"
        }
        $history | ConvertTo-Json -Depth 3 | Set-Content $spawnLogPath -Encoding utf8
        
        exit 1
    }
}

# Log this spawn attempt
$history += @{
    ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    role = $Role
    action = "spawn"
}

# Keep only last 50 entries to prevent log bloat
if ($history.Count -gt 50) {
    $history = $history | Select-Object -Last 50
}

$history | ConvertTo-Json -Depth 3 | Set-Content $spawnLogPath -Encoding utf8

# Spawn the agent
Write-Host "Spawning $Role..." -ForegroundColor Green

switch ($Role) {
    'PE' {
        & (Join-Path $PSScriptRoot "spawn-agent.ps1") -Agent PE
    }
    'TL' {
        & (Join-Path $PSScriptRoot "spawn-agent.ps1") -Agent TL
    }
    'SE' {
        # SE uses the worktree spawner (which has its own canonical message)
        & (Join-Path $PSScriptRoot "spawn-worktree-agent.ps1")
    }
}

Write-Host "$Role spawn initiated" -ForegroundColor Green
