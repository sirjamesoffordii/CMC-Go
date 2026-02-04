<#
.SYNOPSIS
    Check agent Copilot Chat logs for rate limit status and current model.
.DESCRIPTION
    Parses the Copilot Chat log for:
    1. Current model in use (from successful requests)
    2. Rate limit errors (429 with rate_limited code)
    
    Returns structured data for respawn decisions.
.PARAMETER Agent
    Which agent to check: PE, TL, or SE
.PARAMETER AutoRespawn
    If rate limited, automatically respawn with backup model
.EXAMPLE
    .\scripts\check-agent-ratelimit.ps1 -Agent SE
    .\scripts\check-agent-ratelimit.ps1 -Agent SE -AutoRespawn
#>
param(
    [Parameter(Mandatory)]
    [ValidateSet("PE", "TL", "SE")]
    [string]$Agent,
    
    [switch]$AutoRespawn
)

$AgentConfig = @{
    PE = @{
        UserDataDir = 'C:\Dev\vscode-agent-pe'
        PrimaryModel = 'claude-opus-4.5'
        BackupModel = 'gpt-5.2'
    }
    TL = @{
        UserDataDir = 'C:\Dev\vscode-agent-tl'
        PrimaryModel = 'claude-opus-4.5'
        BackupModel = 'gpt-5.2'
    }
    SE = @{
        UserDataDir = 'C:\Dev\vscode-agent-se'
        PrimaryModel = 'claude-opus-4.5'
        BackupModel = 'gpt-5.2'
    }
}

$config = $AgentConfig[$Agent]
$logDir = Join-Path $config.UserDataDir 'logs'

# Find the latest Copilot Chat log
$latestLog = Get-ChildItem -Path $logDir -Recurse -Force -Filter '*Copilot Chat.log' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $latestLog) {
    Write-Host "[$Agent] No Copilot Chat log found" -ForegroundColor Yellow
    return @{ Agent = $Agent; HasLog = $false }
}

Write-Host "[$Agent] Checking log: $($latestLog.Name)" -ForegroundColor DarkGray

# Read last 500 lines for analysis
$logContent = Get-Content -Path $latestLog.FullName -Tail 500 -ErrorAction SilentlyContinue
$allContent = $logContent -join "`n"

# Detect current model from successful requests (panel/editAgent = main chat, not sub-requests)
$modelMatches = [regex]::Matches($allContent, 'ccreq:[a-f0-9]+\.copilotmd \| success \| ([a-zA-Z0-9.-]+) \|.*\| \[panel/editAgent\]')
$currentModel = if ($modelMatches.Count -gt 0) {
    $modelMatches[-1].Groups[1].Value
} else {
    $null
}

# Detect rate limit errors
$rateLimitMatches = [regex]::Matches($allContent, '\[error\] Server error: 429.*rate_limited')
$rateLimitedModelMatches = [regex]::Matches($allContent, 'ccreq:[a-f0-9]+\.copilotmd \| rateLimited \| ([a-zA-Z0-9.-]+)')

$isRateLimited = ($rateLimitMatches.Count -gt 0) -or ($rateLimitedModelMatches.Count -gt 0)
$rateLimitedModel = if ($rateLimitedModelMatches.Count -gt 0) {
    $rateLimitedModelMatches[-1].Groups[1].Value
} else {
    $null
}

# Get timestamp of rate limit (if any)
$rateLimitTime = $null
if ($isRateLimited) {
    $timeMatch = [regex]::Match($allContent, '(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\.\d+ \[error\] Server error: 429')
    if ($timeMatch.Success) {
        $rateLimitTime = [DateTime]::ParseExact($timeMatch.Groups[1].Value, 'yyyy-MM-dd HH:mm:ss', $null)
    }
}

# Determine which model to switch to
$switchToModel = if ($currentModel -eq $config.PrimaryModel -or $rateLimitedModel -eq $config.PrimaryModel) {
    $config.BackupModel
} elseif ($currentModel -eq $config.BackupModel -or $rateLimitedModel -eq $config.BackupModel) {
    $config.PrimaryModel
} else {
    $config.BackupModel  # Default to backup if unknown
}

$result = [PSCustomObject]@{
    Agent           = $Agent
    HasLog          = $true
    LogPath         = $latestLog.FullName
    CurrentModel    = $currentModel
    IsRateLimited   = $isRateLimited
    RateLimitedModel = $rateLimitedModel
    RateLimitTime   = $rateLimitTime
    SwitchToModel   = $switchToModel
    PrimaryModel    = $config.PrimaryModel
    BackupModel     = $config.BackupModel
}

# Display results
$statusColor = if ($isRateLimited) { 'Red' } else { 'Green' }
$statusText = if ($isRateLimited) { '⚠️ RATE LIMITED' } else { '✓ OK' }

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " Agent: $Agent  |  Status: " -NoNewline
Write-Host $statusText -ForegroundColor $statusColor
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " Current Model:    $currentModel" -ForegroundColor White
Write-Host " Primary Model:    $($config.PrimaryModel)" -ForegroundColor DarkGray
Write-Host " Backup Model:     $($config.BackupModel)" -ForegroundColor DarkGray

if ($isRateLimited) {
    Write-Host " Rate Limited On:  $rateLimitedModel" -ForegroundColor Red
    Write-Host " Rate Limit Time:  $rateLimitTime" -ForegroundColor Red
    Write-Host " Switch To:        $switchToModel" -ForegroundColor Yellow
}
Write-Host ""

# Auto-respawn if requested
if ($AutoRespawn -and $isRateLimited) {
    Write-Host "🔄 Auto-respawning $Agent with model: $switchToModel" -ForegroundColor Yellow
    
    # Determine if we need -UseBackup flag
    $useBackup = ($switchToModel -eq $config.BackupModel)
    
    if ($useBackup) {
        & "$PSScriptRoot\aeos-spawn.ps1" -Agent $Agent -UseBackup
    } else {
        & "$PSScriptRoot\aeos-spawn.ps1" -Agent $Agent
    }
}

return $result
