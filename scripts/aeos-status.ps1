<#
.SYNOPSIS
  Show complete AEOS status with health checks.

.DESCRIPTION
  Displays heartbeat status with staleness detection, worktrees,
  open PRs, assignment status, and board state.

.EXAMPLE
  .\scripts\aeos-status.ps1
#>

[CmdletBinding()]
param()

$StaleThresholdMinutes = 6

function Get-AeosCoordDir {
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
    $commonDirRel = (& git -C $repoRoot rev-parse --git-common-dir 2>$null)
    if (-not $commonDirRel) {
        return (Join-Path $repoRoot ".github" "agents")
    }

    $commonDirPath = (Resolve-Path (Join-Path $repoRoot $commonDirRel)).Path
    return (Join-Path $commonDirPath "aeos")
}

Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           AEOS System Status             ║" -ForegroundColor Cyan  
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ===== Heartbeat =====
Write-Host "[Heartbeat]" -ForegroundColor Yellow
$coordDir = Get-AeosCoordDir
$heartbeatPath = Join-Path $coordDir "heartbeat.json"
$legacyHeartbeatPath = ".github/agents/heartbeat.json"
if (-not (Test-Path $heartbeatPath) -and (Test-Path $legacyHeartbeatPath)) {
    $heartbeatPath = $legacyHeartbeatPath
}

if (Test-Path $heartbeatPath) {
    $readHeartbeat = Join-Path $PSScriptRoot "read-heartbeat.ps1"
    $hb = & $readHeartbeat -HeartbeatPath $heartbeatPath
    $now = (Get-Date).ToUniversalTime()
    
    foreach ($prop in $hb.PSObject.Properties) {
        $role = $prop.Name
        $data = $prop.Value
        $ts = [DateTime]::Parse($data.ts)
        $age = ($now - $ts).TotalMinutes
        
        # Determine health
        if ($age -gt $StaleThresholdMinutes) {
            $health = "STALE" 
            $color = "Red"
        } elseif ($age -gt 3) {
            $health = "OK"
            $color = "Yellow"
        } else {
            $health = "ACTIVE"
            $color = "Green"
        }
        
        $ageStr = "{0:N1} min ago" -f $age
        Write-Host "  $role : " -NoNewline
        Write-Host "[$health]" -ForegroundColor $color -NoNewline
        Write-Host " $($data.status) ($ageStr)"
        
        if ($data.issue) { Write-Host "         Issue: #$($data.issue)" -ForegroundColor DarkGray }
        if ($data.pr) { Write-Host "         PR: #$($data.pr)" -ForegroundColor DarkGray }
        if ($data.worktree) { Write-Host "         Worktree: $($data.worktree)" -ForegroundColor DarkGray }
    }
} else {
    Write-Host "  No heartbeat file (agents not started)" -ForegroundColor Red
}
Write-Host ""

# ===== Assignment =====
Write-Host "[Assignment]" -ForegroundColor Yellow
$assignmentPath = Join-Path $coordDir "assignment.json"
$legacyAssignmentPath = ".github/agents/assignment.json"
if (-not (Test-Path $assignmentPath) -and (Test-Path $legacyAssignmentPath)) {
    $assignmentPath = $legacyAssignmentPath
}
if (Test-Path $assignmentPath) {
    $assignment = Get-Content $assignmentPath -Raw | ConvertFrom-Json
    Write-Host "  Issue #$($assignment.issue) assigned by $($assignment.assignedBy)" -ForegroundColor Cyan
    Write-Host "  Assigned at: $($assignment.assignedAt)" -ForegroundColor DarkGray
} else {
    Write-Host "  No pending assignment (SE idle or hasn't claimed)" -ForegroundColor DarkGray
}
Write-Host ""

# ===== Worktrees =====
Write-Host "[Worktrees]" -ForegroundColor Yellow
$worktrees = git worktree list 2>&1
$worktrees | ForEach-Object { Write-Host "  $_" }
Write-Host ""

# ===== Open PRs =====
Write-Host "[Open PRs by Software-Engineer-Agent]" -ForegroundColor Yellow
$prs = gh pr list --author Software-Engineer-Agent --state open --json number,title 2>&1 | ConvertFrom-Json
if ($prs -and $prs.Count -gt 0) {
    $prs | ForEach-Object { Write-Host "  #$($_.number): $($_.title)" -ForegroundColor Cyan }
} else {
    Write-Host "  None" -ForegroundColor DarkGray
}
Write-Host ""

# ===== Rate Limits =====
Write-Host "[Rate Limits]" -ForegroundColor Yellow
try {
    $limits = gh api rate_limit 2>&1 | ConvertFrom-Json
    $gql = $limits.resources.graphql
    $core = $limits.resources.core
    
    $gqlColor = if ($gql.remaining -lt 500) { "Red" } elseif ($gql.remaining -lt 1000) { "Yellow" } else { "Green" }
    $coreColor = if ($core.remaining -lt 200) { "Red" } elseif ($core.remaining -lt 500) { "Yellow" } else { "Green" }
    
    Write-Host "  GraphQL: " -NoNewline
    Write-Host "$($gql.remaining)/$($gql.limit)" -ForegroundColor $gqlColor
    Write-Host "  REST:    " -NoNewline
    Write-Host "$($core.remaining)/$($core.limit)" -ForegroundColor $coreColor
} catch {
    Write-Host "  Could not fetch rate limits" -ForegroundColor Red
}
Write-Host ""

# ===== Board Status =====
Write-Host "[Board Status]" -ForegroundColor Yellow
try {
    $items = gh project item-list 4 --owner sirjamesoffordii --format json 2>&1 | ConvertFrom-Json | Select-Object -ExpandProperty items
    
    $inProgress = $items | Where-Object { $_.status -eq 'In Progress' }
    $todo = $items | Where-Object { $_.status -eq 'Todo' }
    $verify = $items | Where-Object { $_.status -eq 'Verify' }
    
    Write-Host "  In Progress: $($inProgress.Count)" -NoNewline
    if ($inProgress.Count -gt 0) {
        $nums = $inProgress | ForEach-Object { "#$($_.content.number)" }
        Write-Host " → $($nums -join ', ')" -ForegroundColor Cyan
    } else { Write-Host "" }
    
    Write-Host "  Verify:      $($verify.Count)" -NoNewline
    if ($verify.Count -gt 0) {
        $nums = $verify | ForEach-Object { "#$($_.content.number)" }
        Write-Host " → $($nums -join ', ')" -ForegroundColor Yellow
    } else { Write-Host "" }
    
    Write-Host "  Todo:        $($todo.Count)" -NoNewline
    if ($todo.Count -gt 0) {
        Write-Host " (top: #$(($todo | Select-Object -First 1).content.number))" -ForegroundColor DarkGray
    } else { Write-Host "" }
} catch {
    Write-Host "  Could not fetch board status" -ForegroundColor Red
}
Write-Host ""

Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              Status Complete             ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green
