<#
.SYNOPSIS
    Spawn an AEOS agent with its designated Copilot model.
.DESCRIPTION
    Sets the Copilot Chat model in VS Code's state database, then opens a new
    VS Code window and starts a chat session with the specified agent.
    
    Each agent has a designated PRIMARY model + BACKUP for rate limit fallback:
    - PE: Claude Opus 4.5 (best reasoning for architecture) / GPT 5.2 backup
    - TL: GPT 5.2 (fast coordination) / Claude Sonnet 4.5 backup
    - SE: GPT 5.2 Codex (optimized for code) / GPT 5.1 Codex Max backup
    
.PARAMETER Agent
    The agent to spawn: PE, TL, or SE
.PARAMETER UseBackup
    Use the backup model instead of primary (for rate limit recovery)
.PARAMETER UseProfile
    Use VS Code profiles for guaranteed model isolation (recommended for autonomous operation)
.PARAMETER WorkspacePath
    Path to the workspace (default: current directory for PE/TL, worktree for SE)
.EXAMPLE
    .\scripts\spawn-agent.ps1 -Agent TL
    .\scripts\spawn-agent.ps1 -Agent TL -UseProfile
    .\scripts\spawn-agent.ps1 -Agent PE -UseBackup
    .\scripts\spawn-agent.ps1 -Agent SE
#>
param(
    [Parameter(Mandatory)]
    [ValidateSet("PE", "TL", "SE")]
    [string]$Agent,
    
    [switch]$UseBackup,
    
    [switch]$UseProfile,
    
    [string]$WorkspacePath
)

# Agent configurations with designated models and backups
# PRIMARY models are used first; BACKUP is used if rate limited
$agentConfig = @{
    "PE" = @{
        Name = "Principal Engineer"
        Model = "claude-opus-4.5"           # Best reasoning for architecture/exploration
        BackupModel = "gpt-5.2"             # Fallback if Opus rate limited
        Prompt = "You are Principal Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
        DefaultPath = "C:\Dev\CMC Go"
        ProfileName = "Principal Engineer"
    }
    "TL" = @{
        Name = "Tech Lead"
        Model = "gpt-5.2"                   # Fast coordination and reviews
        BackupModel = "claude-sonnet-4.5"   # Fallback for TL
        Prompt = "You are Tech Lead 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
        DefaultPath = "C:\Dev\CMC Go"
        ProfileName = "Tech Lead"
    }
    "SE" = @{
        Name = "Software Engineer"
        Model = "gpt-5.2-codex"            # Optimized for code generation
        BackupModel = "gpt-5.1-codex-max"   # Fallback for SE
        Prompt = "You are Software Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
        DefaultPath = "C:\Dev\CMC-Go-Worktrees\wt-se"
        ProfileName = "Software Engineer"
    }
}

$config = $agentConfig[$Agent]
$path = if ($WorkspacePath) { $WorkspacePath } else { $config.DefaultPath }
$modelToUse = if ($UseBackup) { $config.BackupModel } else { $config.Model }
$modelType = if ($UseBackup) { "BACKUP" } else { "PRIMARY" }

Write-Host "=== Spawning $($config.Name) ===" -ForegroundColor Cyan
Write-Host "  Agent: $($config.Name)" -ForegroundColor White
Write-Host "  Model: $modelToUse ($modelType)" -ForegroundColor $(if ($UseBackup) { "Yellow" } else { "White" })
Write-Host "  Backup: $($config.BackupModel)" -ForegroundColor DarkGray
Write-Host "  Workspace: $path" -ForegroundColor White
Write-Host ""

# Verify workspace exists
if (-not (Test-Path $path)) {
    if ($Agent -eq "SE") {
        Write-Host "SE worktree doesn't exist. Creating..." -ForegroundColor Yellow
        & "$PSScriptRoot\spawn-worktree-agent.ps1"
        return
    } else {
        Write-Host "ERROR: Workspace path doesn't exist: $path" -ForegroundColor Red
        exit 1
    }
}

# SET THE MODEL BEFORE OPENING VS CODE
# NOTE: When using -UseProfile, the profile's saved model is used.
# When not using -UseProfile, we set the model in the main state DB (may be cached).
if (-not $UseProfile) {
    Write-Host "Setting Copilot model to $modelToUse..." -ForegroundColor Yellow
    & "$PSScriptRoot\set-copilot-model.ps1" -Model $modelToUse

    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Failed to set model. Agent will use current model." -ForegroundColor Yellow
    }
    Write-Host ""
} else {
    Write-Host "Using profile: $($config.ProfileName)" -ForegroundColor Cyan
    Write-Host "Expected model: $modelToUse (ensure set in profile)" -ForegroundColor Yellow
    Write-Host ""
}

$agentName = $config.Name
$prompt = $config.Prompt

# Open new VS Code window
Write-Host "Opening VS Code..." -ForegroundColor Yellow
if ($UseProfile -and $config.ProfileName) {
    code --profile "$($config.ProfileName)" -n $path
} else {
    code -n $path
}
Start-Sleep -Seconds 3

if (-not $UseProfile) {
    # IMPORTANT: VS Code caches the model in memory. The `code chat` command connects
    # to an existing VS Code server that may have an old model cached.
    # The model in SQLite is only read when VS Code starts fresh.
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: VS Code caches models in memory" -ForegroundColor Yellow
    Write-Host "   If model shows wrong, manually select: $modelToUse" -ForegroundColor Yellow
    Write-Host "   (Use the model dropdown in the chat input area)" -ForegroundColor Yellow
    Write-Host "   TIP: Use -UseProfile for profile-based model selection" -ForegroundColor Cyan
    Write-Host ""
}

# Start chat - uses CWD to find the right VS Code window
Push-Location $path
try {
    code chat -m $agentName $prompt
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "✅ Agent spawned with model: $modelToUse ($modelType)" -ForegroundColor Green
if (-not $UseBackup) {
    Write-Host "   Backup available: $($config.BackupModel) (use -UseBackup flag)" -ForegroundColor DarkGray
}
