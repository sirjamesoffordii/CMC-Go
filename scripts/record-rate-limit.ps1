<#
.SYNOPSIS
    Record a model rate limit event and switch to backup model.
.DESCRIPTION
    Updates the rate limit tracking file when an agent hits a rate limit.
    The next spawn will use the backup model until the rate limit period expires.
    
    Default rate limit duration: 15 minutes (conservative estimate).
    The monitor-agent-rate-limits.ps1 script can call this when it detects 429 errors.
    
.PARAMETER Agent
    Which agent: PE, TL, or SE
.PARAMETER Model
    Which model was rate limited (primary or backup)
.PARAMETER DurationMinutes
    How long to use backup model. Default: 15 minutes.
.EXAMPLE
    # Record rate limit and switch to backup for 15 min
    .\scripts\record-rate-limit.ps1 -Agent PE -Model "claude-opus-4.5"
    
    # Custom duration
    .\scripts\record-rate-limit.ps1 -Agent TL -Model "claude-opus-4.5" -DurationMinutes 30
#>
param(
    [Parameter(Mandatory)]
    [ValidateSet("PE", "TL", "SE")]
    [string]$Agent,
    
    [Parameter(Mandatory)]
    [string]$Model,
    
    [int]$DurationMinutes = 15
)

# Model configuration
$modelConfig = @{
    "PE" = @{ Primary = "claude-opus-4.5"; Backup = "gpt-5.2" }
    "TL" = @{ Primary = "claude-opus-4.5"; Backup = "gpt-5.2" }
    "SE" = @{ Primary = "claude-opus-4.5"; Backup = "gpt-5.2" }
}

# Rate limit tracking file (in git common dir for worktree support)
$gitCommonDir = git rev-parse --git-common-dir 2>$null
if (-not $gitCommonDir) { $gitCommonDir = ".git" }
$aeosDir = Join-Path $gitCommonDir "aeos"
$statusFile = Join-Path $aeosDir "model-status.json"

# Ensure directory exists
if (-not (Test-Path $aeosDir)) {
    New-Item -ItemType Directory -Path $aeosDir -Force | Out-Null
}

# Read existing status or create new
$allStatus = @{}
if (Test-Path $statusFile) {
    try {
        $allStatus = Get-Content $statusFile -Raw | ConvertFrom-Json -AsHashtable
    } catch {
        $allStatus = @{}
    }
}

$now = (Get-Date).ToUniversalTime()
$rateLimitEnd = $now.AddMinutes($DurationMinutes)

# Determine which model to switch TO
$isPrimary = $Model -eq $modelConfig[$Agent].Primary
$nextModel = if ($isPrimary) { $modelConfig[$Agent].Backup } else { $modelConfig[$Agent].Primary }

# Update status for this agent
$allStatus[$Agent] = @{
    currentModel = $nextModel
    rateLimitedModel = $Model
    rateLimitedAt = $now.ToString("yyyy-MM-ddTHH:mm:ssZ")
    rateLimitedUntil = $rateLimitEnd.ToString("yyyy-MM-ddTHH:mm:ssZ")
    lastSwitch = $now.ToString("yyyy-MM-ddTHH:mm:ssZ")
}

# Write back
$allStatus | ConvertTo-Json -Depth 5 | Set-Content $statusFile -Encoding utf8

Write-Host "[$Agent] Rate limit recorded for $Model" -ForegroundColor Yellow
Write-Host "[$Agent] Switching to: $nextModel" -ForegroundColor Cyan
Write-Host "[$Agent] Will return to primary after: $($rateLimitEnd.ToString('HH:mm:ss')) UTC ($DurationMinutes min)" -ForegroundColor Gray

# Return the new status
@{
    agent = $Agent
    rateLimitedModel = $Model
    newModel = $nextModel
    until = $rateLimitEnd.ToString("yyyy-MM-ddTHH:mm:ssZ")
    durationMinutes = $DurationMinutes
}
