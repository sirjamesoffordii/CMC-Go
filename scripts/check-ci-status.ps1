<#
.SYNOPSIS
    Check CI status with human-readable output.
.DESCRIPTION
    Provides clear CI status for agents to diagnose issues.
.PARAMETER Branch
    Branch to check (default: staging)
.PARAMETER Limit
    Number of recent runs to show (default: 5)
.EXAMPLE
    .\scripts\check-ci-status.ps1
    .\scripts\check-ci-status.ps1 -Branch "agent/se/123-fix"
#>
param(
    [string]$Branch = "staging",
    [int]$Limit = 5
)

$runs = gh run list --repo sirjamesoffordii/CMC-Go --branch $Branch --limit $Limit --json status,conclusion,name,createdAt,databaseId 2>&1 | ConvertFrom-Json

if (-not $runs -or $runs.Count -eq 0) {
    Write-Host "No CI runs found for branch: $Branch" -ForegroundColor Yellow
    return
}

Write-Host "=== CI Status ($Branch) ===" -ForegroundColor Cyan
Write-Host ""

foreach ($run in $runs) {
    $statusText = switch ($run.status) {
        'queued' { "QUEUED" }
        'in_progress' { "RUNNING" }
        'completed' { 
            switch ($run.conclusion) {
                'success' { "PASSED" }
                'failure' { "FAILED" }
                'cancelled' { "CANCELLED" }
                default { $run.conclusion }
            }
        }
        default { $run.status }
    }
    
    $color = switch ($run.status) {
        'queued' { "Yellow" }
        'in_progress' { "Cyan" }
        'completed' {
            switch ($run.conclusion) {
                'success' { "Green" }
                'failure' { "Red" }
                'cancelled' { "Gray" }
                default { "White" }
            }
        }
        default { "White" }
    }
    
    $age = if ($run.createdAt) {
        $created = [DateTime]::Parse($run.createdAt)
        $elapsed = (Get-Date).ToUniversalTime() - $created
        if ($elapsed.TotalMinutes -lt 60) { "$([math]::Round($elapsed.TotalMinutes))m ago" }
        else { "$([math]::Round($elapsed.TotalHours, 1))h ago" }
    } else { "unknown" }
    
    Write-Host "$($statusText.PadRight(12))" -ForegroundColor $color -NoNewline
    Write-Host " | $($run.name.PadRight(30)) | $age"
}

$failed = @($runs | Where-Object { $_.status -eq 'completed' -and $_.conclusion -eq 'failure' })
if ($failed.Count -gt 0) {
    Write-Host "`n$($failed.Count) failed - check logs: gh run view <id> --log-failed" -ForegroundColor Red
}
