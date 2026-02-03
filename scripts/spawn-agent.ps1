<#
.SYNOPSIS
    Spawn an AEOS agent.
.DESCRIPTION
    Opens a VS Code window and starts a chat session with the specified agent.
    
    MODEL NOTE: All agents inherit the model from the spawning window.
    This is by design - VS Code CLI has no --model flag, and agent behavior
    is defined by instructions, not model choice. Start PE with your preferred
    model and all spawned agents will use it.
    
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

# Agent configurations
$agentConfig = @{
    "PE" = @{
        Name = "Principal Engineer"
        Prompt = "You are Principal Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
        DefaultPath = "C:\Dev\CMC Go"
    }
    "TL" = @{
        Name = "Tech Lead"
        Prompt = "You are Tech Lead 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
        DefaultPath = "C:\Dev\CMC Go"
    }
    "SE" = @{
        Name = "Software Engineer"
        Prompt = "You are Software Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
        DefaultPath = "C:\Dev\CMC-Go-Worktrees\wt-se"
    }
}

$config = $agentConfig[$Agent]
$path = if ($WorkspacePath) { $WorkspacePath } else { $config.DefaultPath }

Write-Host "=== Spawning $($config.Name) ===" -ForegroundColor Cyan
Write-Host "  Agent: $($config.Name)" -ForegroundColor White
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

$agentName = $config.Name
$prompt = $config.Prompt

Write-Host "Opening VS Code and starting chat..." -ForegroundColor Yellow

# Open VS Code with new window, then start chat
code -n $path
Start-Sleep -Seconds 3  # Wait for VS Code to fully load

# Start the chat in that window
code chat -r -m $agentName $prompt

Write-Host ""
Write-Host "Agent spawned." -ForegroundColor Green
Write-Host "Model inherited from current window (this is by design)." -ForegroundColor Gray
