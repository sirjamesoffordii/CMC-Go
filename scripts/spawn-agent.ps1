<#
.SYNOPSIS
    Spawn an AEOS agent with proper model configuration.
.DESCRIPTION
    Opens a fresh VS Code window and starts a chat session with the specified agent.
    
    MODEL CONFIGURATION:
    The `code chat -m "Agent"` CLI uses the agent's mode, but the MODEL is inherited
    from the VS Code window, not from the agent file's `model:` frontmatter.
    
    Options for correct model selection:
    1. Use VS Code Profiles (--profile flag) - Each profile can have a different default model
    2. Manually select model in VS Code before running /activate prompt
    3. Accept model inheritance (simpler, but all agents use same model)
    
    This script uses option 3 by default (opens new window, starts chat with agent mode).
    For option 1, create profiles named "PE-Profile", "TL-Profile", "SE-Profile" in VS Code
    and set their default models, then use -UseProfile flag.
    
.PARAMETER Agent
    The agent to spawn: PE, TL, or SE
.PARAMETER WorkspacePath
    Path to the workspace (default: current directory for PE/TL, worktree for SE)
.PARAMETER UseProfile
    Use VS Code profiles for model selection (requires profiles to be pre-configured)
.EXAMPLE
    .\scripts\spawn-agent.ps1 -Agent TL
    .\scripts\spawn-agent.ps1 -Agent PE
    .\scripts\spawn-agent.ps1 -Agent SE
    .\scripts\spawn-agent.ps1 -Agent TL -UseProfile  # Uses "TL-Profile" VS Code profile
#>
param(
    [Parameter(Mandatory)]
    [ValidateSet("PE", "TL", "SE")]
    [string]$Agent,
    
    [string]$WorkspacePath,
    
    [switch]$UseProfile
)

# Agent configurations
$agentConfig = @{
    "PE" = @{
        Name = "Principal Engineer"
        Profile = "PE-Profile"
        Prompt = "You are Principal Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
        DefaultPath = "C:\Dev\CMC Go"
        ExpectedModel = "Claude Opus 4.5"  # From agent file frontmatter
    }
    "TL" = @{
        Name = "Tech Lead"
        Profile = "TL-Profile"
        Prompt = "You are Tech Lead 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
        DefaultPath = "C:\Dev\CMC Go"
        ExpectedModel = "GPT 5.2 Codex"  # From agent file frontmatter
    }
    "SE" = @{
        Name = "Software Engineer"
        Profile = "SE-Profile"
        Prompt = "You are Software Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
        DefaultPath = "C:\Dev\CMC-Go-Worktrees\wt-se"
        ExpectedModel = "Claude Sonnet 4"  # From agent file frontmatter
    }
}

$config = $agentConfig[$Agent]
$path = if ($WorkspacePath) { $WorkspacePath } else { $config.DefaultPath }

Write-Host "=== Spawning $($config.Name) ===" -ForegroundColor Cyan
Write-Host "  Agent: $($config.Name)" -ForegroundColor White
Write-Host "  Workspace: $path" -ForegroundColor White
Write-Host "  Expected Model: $($config.ExpectedModel)" -ForegroundColor White
Write-Host ""

# Verify workspace exists
if (-not (Test-Path $path)) {
    if ($Agent -eq "SE") {
        Write-Host "SE worktree doesn't exist. Creating..." -ForegroundColor Yellow
        # For SE, use the spawn-worktree-agent.ps1 script instead
        & "$PSScriptRoot\spawn-worktree-agent.ps1"
        return
    } else {
        Write-Host "ERROR: Workspace path doesn't exist: $path" -ForegroundColor Red
        exit 1
    }
}

$agentName = $config.Name
$prompt = $config.Prompt

# Build the VS Code command
$vsCodeArgs = @("-n", $path)

if ($UseProfile) {
    $profileName = $config.Profile
    Write-Host "Using VS Code profile: $profileName" -ForegroundColor Yellow
    Write-Host "  (Profile must be pre-configured with correct model)" -ForegroundColor Gray
    $vsCodeArgs += @("--profile", $profileName)
}

Write-Host "Opening VS Code..." -ForegroundColor Yellow
Write-Host "  Command: code $($vsCodeArgs -join ' ')" -ForegroundColor Gray

# Open VS Code with new window
& code @vsCodeArgs
Start-Sleep -Seconds 3  # Wait for VS Code to fully load

# Now start the chat in that window
Write-Host "Starting chat session with agent: $agentName" -ForegroundColor Yellow
Write-Host "  Command: code chat -r -m `"$agentName`" `"$prompt`"" -ForegroundColor Gray

code chat -r -m $agentName $prompt

Write-Host ""
Write-Host "Agent spawned." -ForegroundColor Green
Write-Host ""
Write-Host "=== IMPORTANT: Verify Model ===" -ForegroundColor Yellow
Write-Host "Ask the agent: 'What model are you using?'" -ForegroundColor White
Write-Host "Expected: $($config.ExpectedModel)" -ForegroundColor White
Write-Host ""
Write-Host "If wrong model, options:" -ForegroundColor Yellow
Write-Host "  1. Close window, manually select model, run /activate $agentName" -ForegroundColor Gray
Write-Host "  2. Create VS Code profile '$($config.Profile)' with correct model" -ForegroundColor Gray
Write-Host "     Then re-run: .\scripts\spawn-agent.ps1 -Agent $Agent -UseProfile" -ForegroundColor Gray
