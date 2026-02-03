<#
.SYNOPSIS
  Monitor ALL Copilot Chat windows for rate limit errors (cross-agent awareness).

.DESCRIPTION
  Watches all VS Code window logs for 429/503 errors. Enables PE/TL to detect
  when SE (or any other agent) hits rate limits, even before they report it.
  
  This is useful for:
  - PE detecting TL/SE rate limits proactively
  - TL knowing when to pause SE assignment
  - Cross-agent rate limit awareness

.PARAMETER PollInterval
  Seconds between log checks. Default: 5

.PARAMETER AlertFile
  Optional file to write alerts to (for other scripts to consume).
  Default: .github/agents/rate-limit-alert.json

.PARAMETER Once
  Run once and exit (for scripted checks). Otherwise runs continuously.

.EXAMPLE
  # Continuous monitoring (run as background task)
  .\scripts\monitor-agent-rate-limits.ps1
  
.EXAMPLE
  # One-time check for scripted use
  $status = .\scripts\monitor-agent-rate-limits.ps1 -Once
  if ($status.anyRateLimited) { Write-Host "An agent is rate limited!" }
#>

param(
    [int]$PollInterval = 5,
    [string]$AlertFile = ".github/agents/rate-limit-alert.json",
    [switch]$Once
)

$ErrorActionPreference = "SilentlyContinue"

# Track last processed line per log file to avoid re-alerting
$script:lastProcessedLine = @{}

function Get-AllCopilotLogs {
    # Find all active session logs (last 2 hours)
    $cutoff = (Get-Date).AddHours(-2)
    $logsBase = "$env:APPDATA\Code\logs"
    
    Get-ChildItem $logsBase -Directory | 
        Where-Object { $_.LastWriteTime -gt $cutoff } |
        ForEach-Object {
            Get-ChildItem $_.FullName -Recurse -Filter "GitHub Copilot Chat.log" -File
        }
}

function Get-WindowName {
    param([string]$LogPath)
    # Extract window name from path like: ...\window1\exthost\GitHub.copilot-chat\...
    if ($LogPath -match "\\(window\d+)\\") {
        return $Matches[1]
    }
    return "unknown"
}

function Scan-LogForErrors {
    param(
        [string]$LogPath,
        [int]$LookbackMinutes = 2
    )
    
    $windowName = Get-WindowName -LogPath $LogPath
    $cutoffTime = (Get-Date).AddMinutes(-$LookbackMinutes)
    
    $errors = @()
    
    # Read last 200 lines (efficient for frequent polling)
    $lines = Get-Content $LogPath -Tail 200 2>$null
    if (-not $lines) { return $errors }
    
    foreach ($line in $lines) {
        if ($line -match "^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}) \[error\](.*)") {
            try {
                $logTime = [DateTime]::ParseExact($Matches[1], "yyyy-MM-dd HH:mm:ss.fff", $null)
                $errorMsg = $Matches[2].Trim()
                
                # Skip old errors
                if ($logTime -lt $cutoffTime) { continue }
                
                # Categorize
                $errorType = $null
                if ($errorMsg -match "429") { $errorType = "rate_limit" }
                elseif ($errorMsg -match "model_overloaded|503.*overload") { $errorType = "model_overloaded" }
                elseif ($errorMsg -match "model_max_prompt_tokens") { $errorType = "token_limit" }
                
                if ($errorType) {
                    $errors += @{
                        window = $windowName
                        time = $logTime
                        type = $errorType
                        message = $errorMsg
                    }
                }
            } catch {
                # Skip unparseable lines
            }
        }
    }
    
    return $errors
}

function Write-Alert {
    param($Errors)
    
    if (-not $AlertFile) { return }
    
    $alert = @{
        timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        anyRateLimited = ($Errors | Where-Object { $_.type -eq "rate_limit" }).Count -gt 0
        anyOverloaded = ($Errors | Where-Object { $_.type -eq "model_overloaded" }).Count -gt 0
        errors = $Errors
        windowsAffected = ($Errors | Select-Object -ExpandProperty window -Unique)
    }
    
    # Ensure directory exists
    $alertDir = Split-Path $AlertFile -Parent
    if ($alertDir -and !(Test-Path $alertDir)) {
        New-Item -ItemType Directory -Path $alertDir -Force | Out-Null
    }
    
    $alert | ConvertTo-Json -Depth 5 | Set-Content $AlertFile -Encoding utf8
}

function Show-Status {
    param($AllErrors, [switch]$Continuous)
    
    $rateLimited = $AllErrors | Where-Object { $_.type -eq "rate_limit" }
    $overloaded = $AllErrors | Where-Object { $_.type -eq "model_overloaded" }
    $tokenLimit = $AllErrors | Where-Object { $_.type -eq "token_limit" }
    
    if ($Continuous) {
        # Compact output for continuous mode
        $ts = (Get-Date).ToString("HH:mm:ss")
        if ($rateLimited.Count -gt 0) {
            $windows = ($rateLimited | Select-Object -ExpandProperty window -Unique) -join ", "
            Write-Host "[$ts] ⚠️  RATE LIMITED in: $windows" -ForegroundColor Red
        }
        elseif ($overloaded.Count -gt 0) {
            Write-Host "[$ts] 🔶 Model overloaded" -ForegroundColor Yellow
        }
        elseif ($AllErrors.Count -gt 0) {
            Write-Host "[$ts] 🔸 $($AllErrors.Count) error(s)" -ForegroundColor Gray
        }
        # Silent if no errors (reduce noise)
    }
    else {
        # Detailed output for one-time check
        Write-Host "=== Cross-Agent Rate Limit Status ===" -ForegroundColor Cyan
        Write-Host ""
        
        if ($AllErrors.Count -eq 0) {
            Write-Host "✅ No rate limit errors detected" -ForegroundColor Green
        }
        else {
            if ($rateLimited.Count -gt 0) {
                Write-Host "❌ Rate Limited: $($rateLimited.Count) error(s)" -ForegroundColor Red
                $rateLimited | Group-Object window | ForEach-Object {
                    Write-Host "   $($_.Name): $($_.Count) hit(s)" -ForegroundColor Gray
                }
            }
            if ($overloaded.Count -gt 0) {
                Write-Host "🔶 Model Overloaded: $($overloaded.Count) error(s)" -ForegroundColor Yellow
            }
            if ($tokenLimit.Count -gt 0) {
                Write-Host "📊 Token Limit: $($tokenLimit.Count) error(s)" -ForegroundColor Yellow
            }
            
            Write-Host ""
            Write-Host "Last error:" -ForegroundColor Gray
            $last = $AllErrors | Sort-Object { $_.time } | Select-Object -Last 1
            Write-Host "   [$($last.window)] $($last.time.ToString('HH:mm:ss')) - $($last.type)"
        }
        Write-Host ""
    }
}

# Main execution
if ($Once) {
    $allErrors = @()
    Get-AllCopilotLogs | ForEach-Object {
        $allErrors += Scan-LogForErrors -LogPath $_.FullName -LookbackMinutes 5
    }
    
    Show-Status -AllErrors $allErrors
    Write-Alert -Errors $allErrors
    
    # Return structured object
    return @{
        anyRateLimited = ($allErrors | Where-Object { $_.type -eq "rate_limit" }).Count -gt 0
        anyOverloaded = ($allErrors | Where-Object { $_.type -eq "model_overloaded" }).Count -gt 0
        errorCount = $allErrors.Count
        windowsAffected = ($allErrors | Select-Object -ExpandProperty window -Unique)
        errors = $allErrors
    }
}
else {
    Write-Host "🔍 Monitoring ALL Copilot windows for rate limits..." -ForegroundColor Cyan
    Write-Host "   Poll interval: ${PollInterval}s | Alert file: $AlertFile" -ForegroundColor Gray
    Write-Host "   Press Ctrl+C to stop" -ForegroundColor Gray
    Write-Host ""
    
    while ($true) {
        $allErrors = @()
        Get-AllCopilotLogs | ForEach-Object {
            $allErrors += Scan-LogForErrors -LogPath $_.FullName -LookbackMinutes 1
        }
        
        if ($allErrors.Count -gt 0) {
            Show-Status -AllErrors $allErrors -Continuous
            Write-Alert -Errors $allErrors
        }
        
        Start-Sleep -Seconds $PollInterval
    }
}
