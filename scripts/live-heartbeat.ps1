<#
.SYNOPSIS
  Live heartbeat detection for AEOS agents using process and log activity monitoring.

.DESCRIPTION
  Provides two layers of heartbeat detection:
  1. Process Heartbeat: Detects if VS Code is running with the agent's user-data-dir
  2. Activity Heartbeat: Detects if Copilot Chat log was recently modified (active session)

  Can run in monitor mode (-Monitor) to continuously update heartbeat.json based on live state.

.PARAMETER Monitor
  Run continuously, updating heartbeat.json every interval based on live detection.

.PARAMETER Interval
  Seconds between checks when in monitor mode. Default: 30

.PARAMETER Once
  Run once and output status, then exit. This is the default.

.EXAMPLE
  .\scripts\live-heartbeat.ps1
  # Shows current live status of all agents

.EXAMPLE
  .\scripts\live-heartbeat.ps1 -Monitor -Interval 60
  # Continuously monitors and updates heartbeat every 60 seconds

.EXAMPLE
  .\scripts\live-heartbeat.ps1 | ConvertTo-Json
  # Get structured output for programmatic use

.EXAMPLE
  .\scripts\live-heartbeat.ps1 -Detailed
  # Show request-level details for all agents
#>

[CmdletBinding()]
param(
    [switch]$Monitor,
    [int]$Interval = 30,
    [switch]$Once,
    [switch]$Detailed
)

$AgentConfig = @{
    PE = @{
        UserDataDir = 'C:\Dev\vscode-agent-pe'
        Workspace   = 'C:\Dev\CMC Go'
    }
    TL = @{
        UserDataDir = 'C:\Dev\vscode-agent-tl'
        Workspace   = 'C:\Dev\CMC Go'
    }
    SE = @{
        UserDataDir = 'C:\Dev\vscode-agent-se'
        Workspace   = 'C:\Dev\CMC-Go-Worktrees\wt-se'
    }
}

function Get-AgentProcessStatus {
    <#
    .SYNOPSIS
      Check if a VS Code process is running for a specific agent user-data-dir.
    #>
    param([string]$UserDataDir)
    
    $processes = Get-CimInstance Win32_Process -Filter "Name='Code.exe'" -ErrorAction SilentlyContinue
    foreach ($proc in $processes) {
        if ($proc.CommandLine -and $proc.CommandLine -match [regex]::Escape($UserDataDir)) {
            # Found a main window process (not a subprocess)
            if ($proc.CommandLine -notmatch '--type=') {
                return @{
                    Running   = $true
                    ProcessId = $proc.ProcessId
                    StartTime = $proc.CreationDate
                }
            }
        }
    }
    return @{ Running = $false }
}

function Get-AgentChatActivity {
    <#
    .SYNOPSIS
      Check Copilot Chat log activity to detect active/hung sessions.
      When an agent is generating responses, the log file is updated.
      When an agent is stuck/spinning, the log file stops being modified.
      
      Also parses log content to detect incomplete requests (started but never finished).
    #>
    param([string]$UserDataDir)
    
    $logDir = Join-Path $UserDataDir 'logs'
    if (-not (Test-Path $logDir)) {
        return @{ Active = $false; Reason = 'No logs directory' }
    }
    
    $latestLog = Get-ChildItem -Path $logDir -Recurse -Force -Filter '*Copilot Chat.log' -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    
    if (-not $latestLog) {
        return @{ Active = $false; Reason = 'No Copilot Chat log' }
    }
    
    $ageMinutes = ((Get-Date) - $latestLog.LastWriteTime).TotalMinutes
    
    # Parse log content for request-level tracking
    $requestInfo = @{ HasPendingRequest = $false; LastRequestId = $null; LastFinishReason = $null }
    try {
        # Read last 50KB of log to check for incomplete requests
        $logContent = Get-Content -Path $latestLog.FullName -Tail 200 -ErrorAction SilentlyContinue
        if ($logContent) {
            $allContent = $logContent -join "`n"
            
            # Find all request IDs (started requests)
            $requestStarts = [regex]::Matches($allContent, 'requestId: \[([a-f0-9-]+)\]')
            # Find all completed requests
            $requestDones = [regex]::Matches($allContent, 'request done: requestId: \[([a-f0-9-]+)\]')
            # Find finish reasons
            $finishReasons = [regex]::Matches($allContent, 'finish reason: \[(\w+)\]')
            
            if ($requestStarts.Count -gt 0) {
                $lastStartId = $requestStarts[-1].Groups[1].Value
                $requestInfo.LastRequestId = $lastStartId
                
                # Check if this request completed
                $completed = $requestDones | Where-Object { $_.Groups[1].Value -eq $lastStartId }
                $requestInfo.HasPendingRequest = ($null -eq $completed)
            }
            
            if ($finishReasons.Count -gt 0) {
                $requestInfo.LastFinishReason = $finishReasons[-1].Groups[1].Value
            }
        }
    } catch {
        # Log parsing failed, continue with time-based detection
    }
    
    # For autonomous agents:
    # - "active": log modified within 2 minutes (agent is generating responses)
    # - "hung": log not modified for 2-10 minutes (agent likely stuck on spinning response)
    # - "stale": log not modified for 10+ minutes (agent window may be idle/closed)
    # Additional: if there's a pending request (started but never finished), mark as "hung"
    $status = if ($ageMinutes -lt 2) { 'active' }
              elseif ($ageMinutes -lt 10) { 'hung' }
              else { 'stale' }
    
    # Override: if log is recent but there's a long-pending request, it might be stuck
    # (This catches edge cases where log was written but response never completed)
    
    return @{
        Active           = ($ageMinutes -lt 2)
        Status           = $status
        LastLogTime      = $latestLog.LastWriteTime
        AgeMinutes       = [Math]::Round($ageMinutes, 1)
        LogPath          = $latestLog.FullName
        LastRequestId    = $requestInfo.LastRequestId
        HasPendingRequest = $requestInfo.HasPendingRequest
        LastFinishReason = $requestInfo.LastFinishReason
    }
}

function Get-LiveAgentStatus {
    <#
    .SYNOPSIS
      Get comprehensive live status for all agents.
    #>
    $results = @{}
    
    # Also read the script heartbeat to check for HUNG status
    $scriptHeartbeat = @{}
    $coordDir = Get-AeosCoordDir
    $heartbeatPath = Join-Path $coordDir "heartbeat.json"
    if (Test-Path $heartbeatPath) {
        try {
            $scriptHeartbeat = Get-Content $heartbeatPath -Raw | ConvertFrom-Json
        } catch {}
    }
    
    foreach ($agent in $AgentConfig.Keys) {
        $config = $AgentConfig[$agent]
        $processStatus = Get-AgentProcessStatus -UserDataDir $config.UserDataDir
        $chatActivity = Get-AgentChatActivity -UserDataDir $config.UserDataDir
        
        # Reset per-agent state
        $isHung = $false
        $hungMinutes = 0
        $hungReason = $null
        
        # HUNG detection (priority order):
        # 1. Request pending (started but never finished) + log stale = definitely stuck
        # 2. Log stale 2+ min = likely stuck (but could be between cycles)
        # In autonomous mode, agents never wait - they always loop. If log stops, something's wrong.
        if ($processStatus.Running) {
            if ($chatActivity.HasPendingRequest -and $chatActivity.AgeMinutes -ge 1) {
                # Request started but never got "request done:" - agent is stuck spinning
                $isHung = $true
                $hungMinutes = [int]$chatActivity.AgeMinutes
                $hungReason = 'pending-request'
            } elseif ($chatActivity.AgeMinutes -ge 2) {
                # Log stale but last request completed - agent may have crashed between cycles
                $isHung = $true
                $hungMinutes = [int]$chatActivity.AgeMinutes
                $hungReason = 'log-stale'
            }
        }
        
        # Determine overall status - two failure modes:
        # 1. OFFLINE = process dead (VS Code not running)
        # 2. HUNG = stuck spinning (VS Code running but request pending or log stale)
        $overallStatus = if (-not $processStatus.Running) {
            'offline'  # Process dead - definitely needs respawn
        } elseif ($isHung) {
            'hung'     # Stuck spinning - needs respawn
        } else {
            'active'   # Agent is actively working
        }
        
        $results[$agent] = [PSCustomObject]@{
            Agent            = $agent
            OverallStatus    = $overallStatus
            ProcessRunning   = $processStatus.Running
            ProcessId        = $processStatus.ProcessId
            ChatActive       = $chatActivity.Active
            ChatStatus       = $chatActivity.Status
            LastChatAge      = $chatActivity.AgeMinutes
            LastChatTime     = $chatActivity.LastLogTime
            IsHung           = $isHung
            HungMinutes      = $hungMinutes
            HungReason       = $hungReason
            LastRequestId    = $chatActivity.LastRequestId
            HasPendingRequest = $chatActivity.HasPendingRequest
            LastFinishReason = $chatActivity.LastFinishReason
        }
    }
    
    return $results
}

function Get-AeosCoordDir {
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
    $commonDirRel = (& git -C $repoRoot rev-parse --git-common-dir 2>$null)
    if (-not $commonDirRel) {
        return (Join-Path $repoRoot ".github" "agents")
    }
    $commonDirPath = (Resolve-Path (Join-Path $repoRoot $commonDirRel)).Path
    return (Join-Path $commonDirPath "aeos")
}

function Update-HeartbeatFromLive {
    <#
    .SYNOPSIS
      Update heartbeat.json based on live process/activity detection.
    #>
    param([hashtable]$LiveStatus)
    
    foreach ($agent in $LiveStatus.Keys) {
        $status = $LiveStatus[$agent]
        
        if ($status.ProcessRunning) {
            $heartbeatStatus = switch ($status.OverallStatus) {
                'active'      { 'live-active' }
                'idle'        { 'live-idle' }
                'window-only' { 'live-window' }
                default       { 'live' }
            }
            
            # Update heartbeat via script
            & "$PSScriptRoot\update-heartbeat.ps1" -Role $agent -Status $heartbeatStatus -ErrorAction SilentlyContinue
        }
        # Note: We don't clear heartbeat for offline agents - that's for respawn detection
    }
}

function Show-LiveStatus {
    param(
        [hashtable]$Status,
        [switch]$Detailed
    )
    
    Write-Host "`n=== AEOS Live Heartbeat Status ===" -ForegroundColor Cyan
    Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor DarkGray
    Write-Host "Hung = pending request (1m+) or stale log (2m+)" -ForegroundColor DarkGray
    Write-Host ""
    
    foreach ($agent in @('PE', 'TL', 'SE')) {
        $s = $Status[$agent]
        $color = switch ($s.OverallStatus) {
            'active'  { 'Green' }
            'hung'    { 'Magenta' }
            'stale'   { 'Yellow' }
            'offline' { 'Red' }
            default   { 'Gray' }
        }
        
        $processInfo = if ($s.ProcessRunning) { "PID $($s.ProcessId)" } else { "not running" }
        $chatInfo = if ($s.LastChatAge) { "$($s.LastChatAge) min ago" } else { "no log" }
        
        # Build hung warning with reason
        $hungWarning = ""
        if ($s.IsHung) {
            $reasonText = switch ($s.HungReason) {
                'pending-request' { 'request stuck' }
                'log-stale'       { 'log stale' }
                default           { 'unknown' }
            }
            $hungWarning = " ⚠️ HUNG $($s.HungMinutes)m ($reasonText)"
        }
        
        Write-Host "$agent  " -NoNewline -ForegroundColor White
        Write-Host "[$($s.OverallStatus.ToUpper().PadRight(7))]" -NoNewline -ForegroundColor $color
        Write-Host "  Process: $processInfo" -NoNewline -ForegroundColor DarkGray
        Write-Host "  Chat: $chatInfo" -NoNewline -ForegroundColor DarkGray
        Write-Host $hungWarning -ForegroundColor Magenta
        
        # Show request-level info if hung OR if -Detailed is specified
        if ($s.LastRequestId -and ($s.IsHung -or $Detailed)) {
            $reqShort = $s.LastRequestId.Substring(0, 8)
            $pendingMark = if ($s.HasPendingRequest) { "⏳ PENDING" } else { "✓ done" }
            $finishInfo = if ($s.LastFinishReason) { " ($($s.LastFinishReason))" } else { "" }
            Write-Host "       └─ Request: $reqShort... $pendingMark$finishInfo" -ForegroundColor DarkGray
        }
    }
    Write-Host ""
}

# Main execution
if ($Monitor) {
    Write-Host "Starting live heartbeat monitor (Ctrl+C to stop)..." -ForegroundColor Cyan
    Write-Host "Interval: $Interval seconds" -ForegroundColor DarkGray
    
    while ($true) {
        $status = Get-LiveAgentStatus
        Show-LiveStatus -Status $status -Detailed:$Detailed
        Update-HeartbeatFromLive -LiveStatus $status
        Start-Sleep -Seconds $Interval
    }
} else {
    # One-time status check
    $status = Get-LiveAgentStatus
    Show-LiveStatus -Status $status -Detailed:$Detailed
    
    # Return structured data for programmatic use
    return $status
}
