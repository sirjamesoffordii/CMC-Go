<#
.SYNOPSIS
    Auto-respawn agents that hit rate limits with their backup model.
.DESCRIPTION
    Checks all agents for rate limit status and automatically respawns
    any that are rate limited with their alternate model.
    
    Model switching logic:
    - If rate limited on claude-opus-4.5 → respawn with gpt-5.2
    - If rate limited on gpt-5.2 → respawn with claude-opus-4.5
    
.PARAMETER Agent
    Specific agent to check (PE, TL, or SE). If omitted, checks all.
.PARAMETER AutoFix
    Automatically respawn rate-limited agents with backup model.
.PARAMETER Monitor
    Continuously monitor and auto-fix rate limits.
.PARAMETER Interval
    Seconds between checks in monitor mode. Default: 60.
.EXAMPLE
    .\scripts\auto-respawn-ratelimit.ps1                    # Check all agents
    .\scripts\auto-respawn-ratelimit.ps1 -Agent SE          # Check SE only
    .\scripts\auto-respawn-ratelimit.ps1 -AutoFix           # Auto-respawn rate-limited
    .\scripts\auto-respawn-ratelimit.ps1 -Monitor -AutoFix  # Continuous monitoring
#>
param(
    [ValidateSet("PE", "TL", "SE")]
    [string]$Agent,
    
    [switch]$AutoFix,
    
    [switch]$Monitor,
    
    [int]$Interval = 60
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

function Get-AgentRateLimitStatus {
    param([string]$AgentKey)
    
    $config = $AgentConfig[$AgentKey]
    $logDir = Join-Path $config.UserDataDir 'logs'
    
    # Find the latest Copilot Chat log
    $latestLog = Get-ChildItem -Path $logDir -Recurse -Force -Filter '*Copilot Chat.log' -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    
    if (-not $latestLog) {
        return @{
            Agent = $AgentKey
            HasLog = $false
            IsRateLimited = $false
        }
    }
    
    # Read last 300 lines for recent rate limit detection
    $logContent = Get-Content -Path $latestLog.FullName -Tail 300 -ErrorAction SilentlyContinue
    $allContent = $logContent -join "`n"
    
    # Detect rate limit errors
    $rateLimitMatch = [regex]::Match($allContent, '\[error\] Server error: 429.*rate_limited')
    $rateLimitedModelMatch = [regex]::Match($allContent, 'ccreq:[a-f0-9]+\.copilotmd \| rateLimited \| ([a-zA-Z0-9.-]+)')
    
    # Detect current model
    $currentModelMatches = [regex]::Matches($allContent, 'ccreq:[a-f0-9]+\.copilotmd \| success \| ([a-zA-Z0-9.-]+) \|.*\| \[panel/editAgent\]')
    $currentModel = if ($currentModelMatches.Count -gt 0) { $currentModelMatches[-1].Groups[1].Value } else { $null }
    
    $isRateLimited = $rateLimitMatch.Success -or $rateLimitedModelMatch.Success
    $rateLimitedModel = if ($rateLimitedModelMatch.Success) { $rateLimitedModelMatch.Groups[1].Value } else { $null }
    
    # Determine backup model to switch to
    $switchToModel = if ($rateLimitedModel -eq $config.PrimaryModel -or $currentModel -eq $config.PrimaryModel) {
        $config.BackupModel
    } else {
        $config.PrimaryModel
    }
    
    # Check how recent the rate limit is
    $rateLimitTime = $null
    $rateLimitAgeMinutes = $null
    if ($isRateLimited) {
        $timeMatch = [regex]::Match($allContent, '(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\.\d+ \[error\] Server error: 429')
        if ($timeMatch.Success) {
            $rateLimitTime = [DateTime]::ParseExact($timeMatch.Groups[1].Value, 'yyyy-MM-dd HH:mm:ss', $null)
            $rateLimitAgeMinutes = [Math]::Round(((Get-Date) - $rateLimitTime).TotalMinutes, 1)
        }
    }
    
    return @{
        Agent             = $AgentKey
        HasLog            = $true
        LogPath           = $latestLog.FullName
        LogAge            = [Math]::Round(((Get-Date) - $latestLog.LastWriteTime).TotalMinutes, 1)
        CurrentModel      = $currentModel
        IsRateLimited     = $isRateLimited
        RateLimitedModel  = $rateLimitedModel
        RateLimitTime     = $rateLimitTime
        RateLimitAgeMin   = $rateLimitAgeMinutes
        SwitchToModel     = $switchToModel
        UseBackupFlag     = ($switchToModel -eq $config.BackupModel)
    }
}

function Show-Status {
    param([array]$Statuses)
    
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║              AEOS Rate Limit Monitor                             ║" -ForegroundColor Cyan
    Write-Host "║  Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')                                       ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($s in $Statuses) {
        $statusColor = if ($s.IsRateLimited) { 'Red' } else { 'Green' }
        $statusIcon = if ($s.IsRateLimited) { '🚫' } else { '✓' }
        
        Write-Host "  $($s.Agent)  " -NoNewline -ForegroundColor White
        Write-Host "[$statusIcon]" -NoNewline -ForegroundColor $statusColor
        
        if ($s.HasLog) {
            $modelDisplay = if ($s.CurrentModel) { $s.CurrentModel } else { 'unknown' }
            Write-Host "  Model: $modelDisplay" -NoNewline -ForegroundColor Cyan
            Write-Host "  Log: $($s.LogAge)m ago" -ForegroundColor DarkGray
            
            if ($s.IsRateLimited) {
                Write-Host "      └─ " -NoNewline -ForegroundColor DarkGray
                Write-Host "RATE LIMITED" -NoNewline -ForegroundColor Red
                Write-Host " on $($s.RateLimitedModel)" -NoNewline -ForegroundColor Red
                if ($s.RateLimitAgeMin) {
                    Write-Host " ($($s.RateLimitAgeMin)m ago)" -NoNewline -ForegroundColor DarkGray
                }
                Write-Host " → Switch to: " -NoNewline -ForegroundColor Yellow
                Write-Host $s.SwitchToModel -ForegroundColor Green
            }
        } else {
            Write-Host "  No log found" -ForegroundColor DarkGray
        }
    }
    Write-Host ""
}

function Invoke-AutoFix {
    param([array]$Statuses)
    
    $fixed = 0
    foreach ($s in $Statuses | Where-Object { $_.IsRateLimited }) {
        Write-Host ""
        Write-Host "🔄 Respawning $($s.Agent) with model: $($s.SwitchToModel)" -ForegroundColor Yellow
        
        if ($s.UseBackupFlag) {
            & "$PSScriptRoot\aeos-spawn.ps1" -Agent $s.Agent -UseBackup
        } else {
            & "$PSScriptRoot\aeos-spawn.ps1" -Agent $s.Agent
        }
        $fixed++
    }
    
    if ($fixed -eq 0) {
        Write-Host "✓ No agents need respawning" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "✓ Respawned $fixed agent(s)" -ForegroundColor Green
    }
}

# Main execution
$agentsToCheck = if ($Agent) { @($Agent) } else { @('PE', 'TL', 'SE') }

if ($Monitor) {
    Write-Host "Starting rate limit monitor (Ctrl+C to stop)..." -ForegroundColor Cyan
    Write-Host "Interval: $Interval seconds | AutoFix: $AutoFix" -ForegroundColor DarkGray
    
    while ($true) {
        $statuses = $agentsToCheck | ForEach-Object { Get-AgentRateLimitStatus -AgentKey $_ }
        Show-Status -Statuses $statuses
        
        if ($AutoFix) {
            Invoke-AutoFix -Statuses $statuses
        }
        
        Start-Sleep -Seconds $Interval
    }
} else {
    $statuses = $agentsToCheck | ForEach-Object { Get-AgentRateLimitStatus -AgentKey $_ }
    Show-Status -Statuses $statuses
    
    if ($AutoFix) {
        Invoke-AutoFix -Statuses $statuses
    }
    
    return $statuses
}
