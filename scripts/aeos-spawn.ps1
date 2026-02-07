<#
.SYNOPSIS
    Spawn an AEOS agent in its isolated VS Code instance.
.DESCRIPTION
    Opens a new VS Code window with the agent's dedicated user-data-dir,
    which gives each agent its own GitHub account and Copilot rate limits.
    
    Agent isolation:
    - PE: C:\Dev\vscode-agent-pe (Principal-Engineer-Agent account)
    - TL: C:\Dev\vscode-agent-tl (Tech-Lead-Agent account)
    - SE: C:\Dev\vscode-agent-se (Software-Engineer-Agent account)
    
.PARAMETER Agent
    The agent to spawn: PE, TL, or SE
.EXAMPLE
    .\scripts\aeos-spawn.ps1 -Agent PE
    .\scripts\aeos-spawn.ps1 -Agent TL
    .\scripts\aeos-spawn.ps1 -Agent SE
#>
param(
    [Parameter(Mandatory)]
    [ValidateSet("PE", "TL", "SE")]
    [string]$Agent
)

$ErrorActionPreference = "Stop"

# Agent configurations
$agentConfig = @{
    "PE" = @{
        Name = "Principal Engineer"
        UserDataDir = "C:\Dev\vscode-agent-pe"
        WorkspacePath = "C:\Dev\CMC Go"
        Model = "gpt-5.2"
        Prompt = "You are Principal Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
        Theme = "Blue"
    }
    "TL" = @{
        Name = "Tech Lead"
        UserDataDir = "C:\Dev\vscode-agent-tl"
        WorkspacePath = "C:\Dev\CMC Go"
        Model = "gpt-5.2"
        Prompt = "You are Tech Lead 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
        Theme = "Green"
    }
    "SE" = @{
        Name = "Software Engineer"
        UserDataDir = "C:\Dev\vscode-agent-se"
        WorkspacePath = "C:\Dev\CMC-Go-Worktrees\wt-se"
        Model = "gpt-5.2"
        Prompt = "You are Software Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
        Theme = "Purple"
    }
}

$config = $agentConfig[$Agent]

Write-Host "=== Spawning $($config.Name) ===" -ForegroundColor Cyan
Write-Host "  User Data Dir: $($config.UserDataDir)" -ForegroundColor White
Write-Host "  Workspace: $($config.WorkspacePath)" -ForegroundColor White
Write-Host "  Model: $($config.Model)" -ForegroundColor White
Write-Host ""

# For SE, ensure worktree exists
if ($Agent -eq "SE") {
    $wtPath = $config.WorkspacePath
    if (-not (Test-Path $wtPath)) {
        Write-Host "Creating SE worktree at $wtPath..." -ForegroundColor Yellow
        $repoRoot = "C:\Dev\CMC Go"
        git -C $repoRoot fetch origin
        git -C $repoRoot worktree add $wtPath origin/staging
        Write-Host "Worktree created." -ForegroundColor Green
    }
}

# Verify workspace exists
if (-not (Test-Path $config.WorkspacePath)) {
    Write-Host "ERROR: Workspace path doesn't exist: $($config.WorkspacePath)" -ForegroundColor Red
    exit 1
}

# Open VS Code with isolated user-data-dir
Write-Host "Opening VS Code with isolated user-data-dir..." -ForegroundColor Yellow
$codeArgs = @(
    "--user-data-dir", $config.UserDataDir,
    "-n",  # New window
    $config.WorkspacePath
)

& code @codeArgs

Write-Host "Waiting for VS Code to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start chat session with agent prompt
Write-Host "Starting chat session..." -ForegroundColor Yellow
Push-Location $config.WorkspacePath
try {
    & code chat -m $config.Name $config.Prompt
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "✅ $($config.Name) spawned!" -ForegroundColor Green
Write-Host "   Theme: $($config.Theme)" -ForegroundColor White
Write-Host "   Model: $($config.Model)" -ForegroundColor White
