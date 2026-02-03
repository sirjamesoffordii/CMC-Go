<#
.SYNOPSIS
  Detect Copilot rate limit errors from VS Code logs.

.DESCRIPTION
  Monitors GitHub Copilot Chat logs for rate limit (429), model overload (503),
  and token limit errors. Useful for AEOS agents to detect when they've hit limits.

.PARAMETER MinutesBack
  How many minutes of logs to scan. Default: 5

.PARAMETER Watch
  If set, continuously monitor for new rate limit errors.

.OUTPUTS
  Returns object with:
    - rateLimited: $true if 429 errors found recently
    - modelOverloaded: $true if 503 model_overloaded errors found
    - tokenLimitHit: $true if token limit exceeded errors found
    - lastError: Most recent error message
    - errorCount: Total errors in time window
    - recommendation: Suggested action

.EXAMPLE
  .\scripts\check-copilot-rate-limits.ps1
  
.EXAMPLE
  .\scripts\check-copilot-rate-limits.ps1 -MinutesBack 15 -Watch
#>

param(
    [int]$MinutesBack = 5,
    [switch]$Watch
)

$ErrorActionPreference = "SilentlyContinue"

function Get-CopilotErrors {
    param([int]$Minutes)
    
    $logsBase = "$env:APPDATA\Code\logs"
    $cutoffTime = (Get-Date).AddMinutes(-$Minutes)
    
    # Find all Copilot Chat logs from recent sessions
    $logFiles = Get-ChildItem $logsBase -Recurse -Filter "GitHub Copilot Chat.log" -File |
        Where-Object { $_.LastWriteTime -gt $cutoffTime }
    
    $errors = @{
        rateLimited = $false
        modelOverloaded = $false
        tokenLimitHit = $false
        lastError = $null
        errors = @()
        errorCount = 0
    }
    
    foreach ($logFile in $logFiles) {
        $content = Get-Content $logFile.FullName -Tail 500 2>$null
        if (-not $content) { continue }
        
        foreach ($line in $content) {
            # Parse timestamp from log line: "2026-02-02 17:22:10.126 [error]..."
            if ($line -match "^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}) \[error\](.*)") {
                $logTime = [DateTime]::ParseExact($Matches[1], "yyyy-MM-dd HH:mm:ss.fff", $null)
                $errorMsg = $Matches[2].Trim()
                
                # Skip if older than our window
                if ($logTime -lt $cutoffTime) { continue }
                
                # Categorize error
                if ($errorMsg -match "429") {
                    $errors.rateLimited = $true
                    $errors.errors += @{
                        time = $logTime
                        type = "rate_limit"
                        message = $errorMsg
                    }
                }
                elseif ($errorMsg -match "model_overloaded|503") {
                    $errors.modelOverloaded = $true
                    $errors.errors += @{
                        time = $logTime
                        type = "model_overloaded"
                        message = $errorMsg
                    }
                }
                elseif ($errorMsg -match "model_max_prompt_tokens_exceeded|token.*exceeds") {
                    $errors.tokenLimitHit = $true
                    $errors.errors += @{
                        time = $logTime
                        type = "token_limit"
                        message = $errorMsg
                    }
                }
            }
        }
    }
    
    $errors.errorCount = $errors.errors.Count
    if ($errors.errors.Count -gt 0) {
        $lastErr = $errors.errors | Sort-Object { $_.time } | Select-Object -Last 1
        $errors.lastError = $lastErr
    }
    
    return $errors
}

function Get-Recommendation {
    param($Errors)
    
    if ($Errors.rateLimited) {
        return @{
            status = "RATE_LIMITED"
            action = "Switch to fallback model (GPT-4.1) or wait 5-10 minutes"
            severity = "high"
        }
    }
    elseif ($Errors.modelOverloaded) {
        return @{
            status = "MODEL_OVERLOADED"
            action = "Switch to different model or retry in 1-2 minutes"
            severity = "medium"
        }
    }
    elseif ($Errors.tokenLimitHit) {
        return @{
            status = "TOKEN_LIMIT"
            action = "Reduce context size or use model with higher token limit"
            severity = "medium"
        }
    }
    else {
        return @{
            status = "OK"
            action = "No rate limit issues detected"
            severity = "none"
        }
    }
}

# Main execution
if ($Watch) {
    Write-Host "Watching for Copilot rate limit errors (Ctrl+C to stop)..." -ForegroundColor Cyan
    Write-Host ""
    
    $lastCheck = Get-Date
    while ($true) {
        $errors = Get-CopilotErrors -Minutes 1
        
        if ($errors.errorCount -gt 0) {
            $rec = Get-Recommendation -Errors $errors
            $color = switch ($rec.severity) {
                "high" { "Red" }
                "medium" { "Yellow" }
                default { "Green" }
            }
            
            Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] $($rec.status): $($errors.errorCount) error(s)" -ForegroundColor $color
            Write-Host "  → $($rec.action)" -ForegroundColor Gray
        }
        
        Start-Sleep -Seconds 10
    }
}
else {
    $errors = Get-CopilotErrors -Minutes $MinutesBack
    $rec = Get-Recommendation -Errors $errors
    
    Write-Host "=== Copilot Rate Limit Check (last $MinutesBack min) ===" -ForegroundColor Cyan
    Write-Host ""
    
    $statusColor = switch ($rec.severity) {
        "high" { "Red" }
        "medium" { "Yellow" }
        default { "Green" }
    }
    
    Write-Host "Status: $($rec.status)" -ForegroundColor $statusColor
    Write-Host "Errors: $($errors.errorCount)"
    
    if ($errors.lastError) {
        Write-Host ""
        Write-Host "Last Error:" -ForegroundColor Gray
        Write-Host "  Time: $($errors.lastError.time)"
        Write-Host "  Type: $($errors.lastError.type)"
    }
    
    Write-Host ""
    Write-Host "Recommendation: $($rec.action)" -ForegroundColor Cyan
    
    # Return structured object for scripting
    return @{
        rateLimited = $errors.rateLimited
        modelOverloaded = $errors.modelOverloaded
        tokenLimitHit = $errors.tokenLimitHit
        errorCount = $errors.errorCount
        status = $rec.status
        action = $rec.action
        severity = $rec.severity
    }
}
