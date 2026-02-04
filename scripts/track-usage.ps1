<#
.SYNOPSIS
    Track all rate limit usage across GitHub API and Copilot models.
.DESCRIPTION
    Consolidates rate limit information from multiple sources:
    - GitHub GraphQL API (board ops, issue queries)
    - GitHub REST API (PR ops, file fetches)
    - Copilot model usage (429 errors from VS Code logs)
    
    Use this to understand overall system health and plan work accordingly.
    
.PARAMETER Json
    Output as JSON for programmatic consumption
.PARAMETER Watch
    Continuously monitor (refreshes every 30s)
.EXAMPLE
    .\scripts\track-usage.ps1                    # One-time check with table output
    .\scripts\track-usage.ps1 -Json              # JSON output for scripts
    .\scripts\track-usage.ps1 -Watch             # Continuous monitoring
#>
param(
    [switch]$Json,
    [switch]$Watch
)

function Get-GitHubApiUsage {
    try {
        $limits = gh api rate_limit 2>$null | ConvertFrom-Json
        
        $graphql = $limits.resources.graphql
        $core = $limits.resources.core
        $search = $limits.resources.search
        
        $graphqlReset = [DateTimeOffset]::FromUnixTimeSeconds($graphql.reset).LocalDateTime
        $coreReset = [DateTimeOffset]::FromUnixTimeSeconds($core.reset).LocalDateTime
        
        return @{
            graphql = @{
                used = $graphql.limit - $graphql.remaining
                remaining = $graphql.remaining
                limit = $graphql.limit
                percent = [math]::Round(($graphql.remaining / $graphql.limit) * 100, 1)
                resetAt = $graphqlReset.ToString("HH:mm:ss")
                resetIn = [math]::Max(0, [math]::Ceiling(($graphqlReset - (Get-Date)).TotalMinutes))
            }
            rest = @{
                used = $core.limit - $core.remaining
                remaining = $core.remaining
                limit = $core.limit
                percent = [math]::Round(($core.remaining / $core.limit) * 100, 1)
                resetAt = $coreReset.ToString("HH:mm:ss")
                resetIn = [math]::Max(0, [math]::Ceiling(($coreReset - (Get-Date)).TotalMinutes))
            }
            search = @{
                remaining = $search.remaining
                limit = $search.limit
            }
        }
    } catch {
        return @{
            graphql = @{ error = $_.Exception.Message }
            rest = @{ error = $_.Exception.Message }
            search = @{ error = $_.Exception.Message }
        }
    }
}

function Get-ModelUsageStatus {
    $gitCommonDir = git rev-parse --git-common-dir 2>$null
    if (-not $gitCommonDir) { $gitCommonDir = ".git" }
    $statusFile = Join-Path $gitCommonDir "aeos/model-status.json"
    
    $agents = @("PE", "TL", "SE")
    $status = @{}
    
    if (Test-Path $statusFile) {
        try {
            $allStatus = Get-Content $statusFile -Raw | ConvertFrom-Json
            foreach ($agent in $agents) {
                $agentStatus = $allStatus.$agent
                if ($agentStatus) {
                    $status[$agent] = @{
                        currentModel = $agentStatus.currentModel
                        rateLimited = $null -ne $agentStatus.rateLimitedUntil
                        rateLimitedModel = $agentStatus.rateLimitedModel
                        rateLimitedUntil = $agentStatus.rateLimitedUntil
                        usingBackup = $agentStatus.currentModel -eq "gpt-5.2"
                    }
                } else {
                    $status[$agent] = @{
                        currentModel = "claude-opus-4.5"
                        rateLimited = $false
                        usingBackup = $false
                    }
                }
            }
        } catch {
            foreach ($agent in $agents) {
                $status[$agent] = @{ currentModel = "claude-opus-4.5"; rateLimited = $false; usingBackup = $false }
            }
        }
    } else {
        foreach ($agent in $agents) {
            $status[$agent] = @{ currentModel = "claude-opus-4.5"; rateLimited = $false; usingBackup = $false }
        }
    }
    
    return $status
}

function Get-RecentCopilotErrors {
    $cutoff = (Get-Date).AddMinutes(-15)
    $logsBase = "$env:APPDATA\Code\logs"
    $errors = @()
    
    # Search agent-specific VS Code instances
    $agentDirs = @(
        @{ path = "C:\Dev\vscode-agent-pe\logs"; agent = "PE" }
        @{ path = "C:\Dev\vscode-agent-tl\logs"; agent = "TL" }
        @{ path = "C:\Dev\vscode-agent-se\logs"; agent = "SE" }
    )
    
    foreach ($agentDir in $agentDirs) {
        if (Test-Path $agentDir.path) {
            Get-ChildItem $agentDir.path -Directory -ErrorAction SilentlyContinue | 
                Where-Object { $_.LastWriteTime -gt $cutoff } |
                ForEach-Object {
                    $logFile = Get-ChildItem $_.FullName -Recurse -Filter "GitHub Copilot Chat.log" -File -ErrorAction SilentlyContinue | Select-Object -First 1
                    if ($logFile) {
                        $lines = Get-Content $logFile.FullName -Tail 100 -ErrorAction SilentlyContinue
                        foreach ($line in $lines) {
                            if ($line -match "\[error\].*429") {
                                $errors += @{
                                    agent = $agentDir.agent
                                    type = "rate_limit"
                                    line = $line.Substring(0, [Math]::Min(100, $line.Length))
                                }
                            }
                        }
                    }
                }
        }
    }
    
    return $errors
}

function Show-UsageTable {
    param($ApiUsage, $ModelStatus, $Errors)
    
    $ts = (Get-Date).ToString("HH:mm:ss")
    
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                    AEOS USAGE TRACKER [$ts]                       ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    # GitHub API section
    Write-Host "📊 GitHub API Usage" -ForegroundColor Yellow
    Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
    
    if ($ApiUsage.graphql.error) {
        Write-Host "  GraphQL: ERROR - $($ApiUsage.graphql.error)" -ForegroundColor Red
    } else {
        $gqlColor = if ($ApiUsage.graphql.percent -gt 50) { "Green" } elseif ($ApiUsage.graphql.percent -gt 20) { "Yellow" } else { "Red" }
        $gqlBar = "█" * [math]::Floor($ApiUsage.graphql.percent / 10) + "░" * (10 - [math]::Floor($ApiUsage.graphql.percent / 10))
        Write-Host "  GraphQL: [$gqlBar] $($ApiUsage.graphql.percent)% ($($ApiUsage.graphql.remaining)/$($ApiUsage.graphql.limit)) Reset: $($ApiUsage.graphql.resetAt)" -ForegroundColor $gqlColor
    }
    
    if ($ApiUsage.rest.error) {
        Write-Host "  REST:    ERROR - $($ApiUsage.rest.error)" -ForegroundColor Red
    } else {
        $restColor = if ($ApiUsage.rest.percent -gt 50) { "Green" } elseif ($ApiUsage.rest.percent -gt 20) { "Yellow" } else { "Red" }
        $restBar = "█" * [math]::Floor($ApiUsage.rest.percent / 10) + "░" * (10 - [math]::Floor($ApiUsage.rest.percent / 10))
        Write-Host "  REST:    [$restBar] $($ApiUsage.rest.percent)% ($($ApiUsage.rest.remaining)/$($ApiUsage.rest.limit)) Reset: $($ApiUsage.rest.resetAt)" -ForegroundColor $restColor
    }
    
    Write-Host ""
    
    # Copilot Model section
    Write-Host "🤖 Copilot Model Status" -ForegroundColor Yellow
    Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
    
    foreach ($agent in @("PE", "TL", "SE")) {
        $s = $ModelStatus[$agent]
        $icon = if ($s.usingBackup) { "⚠️" } else { "✅" }
        $modelDisplay = if ($s.currentModel -eq "claude-opus-4.5") { "Opus 4.5" } else { "GPT 5.2" }
        $statusText = if ($s.usingBackup) { "(backup)" } else { "(primary)" }
        
        if ($s.rateLimited -and $s.rateLimitedUntil) {
            $until = [DateTime]::Parse($s.rateLimitedUntil)
            $remaining = [math]::Max(0, [math]::Ceiling(($until - (Get-Date).ToUniversalTime()).TotalMinutes))
            Write-Host "  $agent : $icon $modelDisplay $statusText - returns to primary in ${remaining}m" -ForegroundColor Yellow
        } else {
            Write-Host "  $agent : $icon $modelDisplay $statusText" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    
    # Recent errors
    if ($Errors.Count -gt 0) {
        Write-Host "⚠️  Recent Rate Limit Errors (last 15 min)" -ForegroundColor Red
        Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
        $Errors | Group-Object agent | ForEach-Object {
            Write-Host "  $($_.Name): $($_.Count) error(s)" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    # Recommendations
    Write-Host "💡 Recommendations" -ForegroundColor Yellow
    Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
    
    $hasIssue = $false
    
    if (-not $ApiUsage.graphql.error -and $ApiUsage.graphql.percent -lt 20) {
        Write-Host "  • GraphQL low - use REST for read operations where possible" -ForegroundColor Yellow
        $hasIssue = $true
    }
    
    $backupAgents = @($ModelStatus.Keys | Where-Object { $ModelStatus[$_].usingBackup })
    if ($backupAgents.Count -gt 0) {
        Write-Host "  • Agents on backup model: $($backupAgents -join ', ') - will auto-recover" -ForegroundColor Yellow
        $hasIssue = $true
    }
    
    if (-not $hasIssue) {
        Write-Host "  ✅ All systems healthy" -ForegroundColor Green
    }
    
    Write-Host ""
}

# Main
if ($Watch) {
    Write-Host "Starting continuous usage monitoring (Ctrl+C to stop)..." -ForegroundColor Cyan
    while ($true) {
        Clear-Host
        $apiUsage = Get-GitHubApiUsage
        $modelStatus = Get-ModelUsageStatus
        $errors = Get-RecentCopilotErrors
        Show-UsageTable -ApiUsage $apiUsage -ModelStatus $modelStatus -Errors $errors
        Start-Sleep -Seconds 30
    }
} else {
    $apiUsage = Get-GitHubApiUsage
    $modelStatus = Get-ModelUsageStatus
    $errors = Get-RecentCopilotErrors
    
    if ($Json) {
        @{
            timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
            github = $apiUsage
            copilot = $modelStatus
            recentErrors = $errors
        } | ConvertTo-Json -Depth 5
    } else {
        Show-UsageTable -ApiUsage $apiUsage -ModelStatus $modelStatus -Errors $errors
    }
}
