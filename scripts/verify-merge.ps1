<#
.SYNOPSIS
    Verify that a PR was successfully merged.
.DESCRIPTION
    Post-merge verification for TL after gh pr merge.
.PARAMETER PRNumber
    PR number to verify
.EXAMPLE
    .\scripts\verify-merge.ps1 -PRNumber 123
#>
param(
    [Parameter(Mandatory)]
    [int]$PRNumber
)

Write-Host "=== Verifying PR #$PRNumber Merge ===" -ForegroundColor Cyan
Write-Host ""

# Check PR state
$pr = gh pr view $PRNumber --repo sirjamesoffordii/CMC-Go --json state,mergedAt,mergeCommit,headRefName,baseRefName 2>&1 | ConvertFrom-Json

if (-not $pr) {
    Write-Host "❌ Could not fetch PR #$PRNumber" -ForegroundColor Red
    exit 1
}

$allGood = $true

# 1. Check state is MERGED
if ($pr.state -eq "MERGED") {
    Write-Host "✅ PR state: MERGED" -ForegroundColor Green
} else {
    Write-Host "❌ PR state: $($pr.state) (expected MERGED)" -ForegroundColor Red
    $allGood = $false
}

# 2. Check merge commit exists
if ($pr.mergeCommit) {
    $shortSha = $pr.mergeCommit.oid.Substring(0, 7)
    Write-Host "✅ Merge commit: $shortSha" -ForegroundColor Green
} else {
    Write-Host "❌ No merge commit found" -ForegroundColor Red
    $allGood = $false
}

# 3. Check merge timestamp
if ($pr.mergedAt) {
    $mergedAt = [DateTime]::Parse($pr.mergedAt)
    $elapsed = (Get-Date).ToUniversalTime() - $mergedAt
    Write-Host "✅ Merged: $([math]::Round($elapsed.TotalMinutes, 1)) minutes ago" -ForegroundColor Green
} else {
    Write-Host "❌ No merge timestamp" -ForegroundColor Red
    $allGood = $false
}

# 4. Check branch cleanup
$branchName = $pr.headRefName
if ($branchName) {
    $branchExists = gh api "repos/sirjamesoffordii/CMC-Go/branches/$branchName" 2>$null
    if ($branchExists) {
        Write-Host "⚠️ Branch '$branchName' still exists (consider cleanup)" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Branch '$branchName' deleted" -ForegroundColor Green
    }
}

Write-Host ""
if ($allGood) {
    Write-Host "✅ MERGE VERIFIED" -ForegroundColor Green
    return @{ success = $true; pr = $PRNumber; commit = $pr.mergeCommit.oid }
} else {
    Write-Host "❌ MERGE VERIFICATION FAILED" -ForegroundColor Red
    return @{ success = $false; pr = $PRNumber }
}
