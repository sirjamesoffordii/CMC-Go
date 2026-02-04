<#
.SYNOPSIS
    Get current model status for an agent, considering rate limit history.
.DESCRIPTION
    Reads the rate limit tracking file to determine which model an agent should use.
    If primary model was rate limited recently, returns backup model.
    
    Rate limit tracking file: .git/aeos/model-status.json
    
.PARAMETER Agent
    Which agent: PE, TL, or SE
.EXAMPLE
    $status = .\scripts\get-model-status.ps1 -Agent PE
    # Returns: @{ model = "claude-opus-4.5"; isPrimary = $true; rateLimitedUntil = $null }
#>
param(
    [Parameter(Mandatory)]
    [ValidateSet("PE", "TL", "SE")]
    [string]$Agent
)

# Model configuration - Opus 4.5 primary, GPT 5.2 backup for all agents
$modelConfig = @{
    "PE" = @{ Primary = "claude-opus-4.5"; Backup = "gpt-5.2" }
    "TL" = @{ Primary = "claude-opus-4.5"; Backup = "gpt-5.2" }
    "SE" = @{ Primary = "claude-opus-4.5"; Backup = "gpt-5.2" }
}

# Rate limit tracking file (in git common dir for worktree support)
$gitCommonDir = git rev-parse --git-common-dir 2>$null
if (-not $gitCommonDir) { $gitCommonDir = ".git" }
$statusFile = Join-Path $gitCommonDir "aeos/model-status.json"

# Default status
$status = @{
    model = $modelConfig[$Agent].Primary
    isPrimary = $true
    rateLimitedUntil = $null
    lastSwitch = $null
}

# Read existing status
if (Test-Path $statusFile) {
    try {
        $allStatus = Get-Content $statusFile -Raw | ConvertFrom-Json
        $agentStatus = $allStatus.$Agent
        
        if ($agentStatus -and $agentStatus.rateLimitedUntil) {
            $rateLimitEnd = [DateTime]::Parse($agentStatus.rateLimitedUntil)
            $now = (Get-Date).ToUniversalTime()
            
            if ($now -lt $rateLimitEnd) {
                # Still rate limited - use backup
                $status.model = $modelConfig[$Agent].Backup
                $status.isPrimary = $false
                $status.rateLimitedUntil = $agentStatus.rateLimitedUntil
                $status.lastSwitch = $agentStatus.lastSwitch
            }
            # If rate limit has expired, we return to primary (default)
        }
    } catch {
        # File corrupt - use defaults
    }
}

# Return status object
$status
