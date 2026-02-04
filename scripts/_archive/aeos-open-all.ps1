<#
.SYNOPSIS
    Open all AEOS agent windows ready for activation.
.DESCRIPTION
    Opens PE, TL, and SE windows with isolated user-data-dirs.
    Each window will have the correct GitHub account and model pre-selected.
    
    IMPORTANT: `code chat` cannot target isolated instances!
    You must manually paste the activation message in each window.
    
.PARAMETER Agent
    Open only a specific agent: PE, TL, or SE
.PARAMETER All
    Open all agent windows (default)
.EXAMPLE
    .\scripts\aeos-open-all.ps1           # Opens all 3 windows
    .\scripts\aeos-open-all.ps1 -Agent PE # Opens only PE window
#>
param(
    [ValidateSet("PE", "TL", "SE")]
    [string]$Agent,
    
    [switch]$All
)

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║               AEOS Agent Windows                              ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Agent configurations
$agents = @{
    "PE" = @{
        Name = "Principal Engineer"
        Short = "PE"
        UserDataDir = "C:\Dev\vscode-agent-pe"
        WorkspacePath = "C:\Dev\CMC Go"
        AgentName = "Principal Engineer"
        Activation = "You are Principal Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
    }
    "TL" = @{
        Name = "Tech Lead"
        Short = "TL"
        UserDataDir = "C:\Dev\vscode-agent-tl"
        WorkspacePath = "C:\Dev\CMC Go"
        AgentName = "Tech Lead"
        Activation = "You are Tech Lead 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
    }
    "SE" = @{
        Name = "Software Engineer"
        Short = "SE"
        UserDataDir = "C:\Dev\vscode-agent-se"
        WorkspacePath = "C:\Dev\CMC-Go-Worktrees\wt-se"
        AgentName = "Software Engineer"
        Activation = "You are Software Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
    }
}

# Determine which agents to open
$toOpen = if ($Agent) { @($Agent) } else { @("PE", "TL", "SE") }

foreach ($key in $toOpen) {
    $ag = $agents[$key]
    Write-Host "Opening $($ag.Name)..." -ForegroundColor Yellow
    
    # Check workspace exists
    if (-not (Test-Path $ag.WorkspacePath)) {
        Write-Host "  ⚠️  Workspace not found: $($ag.WorkspacePath)" -ForegroundColor Red
        if ($key -eq "SE") {
            Write-Host "  Run: .\scripts\spawn-worktree-agent.ps1 to create SE worktree" -ForegroundColor Yellow
        }
        continue
    }
    
    # Open VS Code with isolated user-data-dir
    # IMPORTANT: The workspace path must be quoted and passed directly
    Start-Process code -ArgumentList "--user-data-dir", "`"$($ag.UserDataDir)`"", "-n", "`"$($ag.WorkspacePath)`""
    
    Write-Host "  ✓ Opened with user-data-dir: $($ag.UserDataDir)" -ForegroundColor DarkGray
    Start-Sleep -Milliseconds 800
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANT: VS Code CLI cannot auto-activate isolated windows!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Manual activation required in EACH window:" -ForegroundColor White
Write-Host "  1. Press Ctrl+Shift+I (open Copilot Chat)" -ForegroundColor Gray
Write-Host "  2. Click the agent dropdown → select the agent" -ForegroundColor Gray
Write-Host "  3. Paste activation message → press Enter" -ForegroundColor Gray
Write-Host ""

foreach ($key in $toOpen) {
    $ag = $agents[$key]
    Write-Host "┌─ $($ag.Name) ($key) ─────────────────────────────────" -ForegroundColor Cyan
    Write-Host "│ Agent to select: $($ag.AgentName)" -ForegroundColor White
    Write-Host "│ Message:" -ForegroundColor White
    Write-Host "│ $($ag.Activation)" -ForegroundColor Gray
    Write-Host "└──────────────────────────────────────────────────────────" -ForegroundColor Cyan
    Write-Host ""
}

# Copy first agent's activation to clipboard
$firstAgent = $agents[$toOpen[0]]
$firstAgent.Activation | Set-Clipboard
Write-Host "📋 Copied $($firstAgent.Name) activation to clipboard!" -ForegroundColor Green
Write-Host ""
Write-Host "Quick copy commands:" -ForegroundColor Cyan
Write-Host "  .\scripts\aeos-activate.ps1 PE" -ForegroundColor DarkGray
Write-Host "  .\scripts\aeos-activate.ps1 TL" -ForegroundColor DarkGray
Write-Host "  .\scripts\aeos-activate.ps1 SE" -ForegroundColor DarkGray
Write-Host ""
