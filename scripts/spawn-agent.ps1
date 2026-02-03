<#
.SYNOPSIS
    Spawn an AEOS agent with its designated Copilot model.
.DESCRIPTION
    Sets the Copilot Chat model in VS Code's state database, then opens a new
    VS Code window and starts a chat session with the specified agent.
    
    Each agent has a designated model to distribute rate limits:
    - PE: Claude Opus 4.5 (architectural decisions)
    - TL: GPT 5.2 Codex (coordination, reviews)
    - SE: Claude Sonnet 4 (implementation)
    
.PARAMETER Agent
    The agent to spawn: PE, TL, or SE
.PARAMETER WorkspacePath
    Path to the workspace (default: current directory for PE/TL, worktree for SE)
.EXAMPLE
    .\scripts\spawn-agent.ps1 -Agent TL
    .\scripts\spawn-agent.ps1 -Agent PE
    .\scripts\spawn-agent.ps1 -Agent SE
#>
param(
    [Parameter(Mandatory)]
    [ValidateSet("PE", "TL", "SE")]
    [string]$Agent,
    
    [string]$WorkspacePath
)

# Agent configurations with designated models
$agentConfig = @{
    "PE" = @{
        Name = "Principal Engineer"
        Model = "claude-opus-4.5"
        Prompt = "You are Principal Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
        DefaultPath = "C:\Dev\CMC Go"
    }
    "TL" = @{
        Name = "Tech Lead"
        Model = "gpt-5.2-codex"
        Prompt = "You are Tech Lead 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
        DefaultPath = "C:\Dev\CMC Go"
    }
    "SE" = @{
        Name = "Software Engineer"
        Model = "claude-sonnet-4"
        Prompt = "You are Software Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
        DefaultPath = "C:\Dev\CMC-Go-Worktrees\wt-se"
    }
}

$config = $agentConfig[$Agent]
$path = if ($WorkspacePath) { $WorkspacePath } else { $config.DefaultPath }

Write-Host "=== Spawning $($config.Name) ===" -ForegroundColor Cyan
Write-Host "  Agent: $($config.Name)" -ForegroundColor White
Write-Host "  Model: $($config.Model)" -ForegroundColor White
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
Write-Host "Setting Copilot model to $($config.Model)..." -ForegroundColor Yellow
& "$PSScriptRoot\set-copilot-model.ps1" -Model $config.Model

if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Failed to set model. Agent will use current model." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Opening VS Code and starting chat..." -ForegroundColor Yellow

$agentName = $config.Name
$prompt = $config.Prompt

# Open VS Code with new window, then start chat
code -n $path
Start-Sleep -Seconds 3  # Wait for VS Code to fully load

# Start the chat in that window
code chat -r -m $agentName $prompt

Write-Host ""
Write-Host "✅ Agent spawned with model: $($config.Model)" -ForegroundColor Green
