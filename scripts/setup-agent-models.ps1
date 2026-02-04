<#
.SYNOPSIS
    One-time setup for AEOS agent model selection.
    
.DESCRIPTION
    Creates isolated VS Code instances for PE, TL, and SE agents.
    After running this script, you must MANUALLY:
    1. Sign into GitHub in each window
    2. Select the correct model from the dropdown
    3. Close the window
    
    The model selection will persist for future agent spawns.
    
.NOTES
    Run this ONCE during initial AEOS setup.
    After setup, use aeos-spawn.ps1 to start agents.
#>

param(
    [switch]$OpenAll,
    [ValidateSet("PE", "TL", "SE")]
    [string]$Agent
)

$ErrorActionPreference = "Stop"

# Agent configurations
$agents = @{
    PE = @{
        Name = "Principal Engineer"
        UserDataDir = "C:\Dev\vscode-agent-pe"
        Folder = "C:\Dev\CMC Go"
        Model = "copilot/gpt-5.2"
        ModelDisplay = "GPT 5.2"
    }
    TL = @{
        Name = "Tech Lead"
        UserDataDir = "C:\Dev\vscode-agent-tl"
        Folder = "C:\Dev\CMC Go"
        Model = "copilot/gpt-5.2"
        ModelDisplay = "GPT 5.2"
    }
    SE = @{
        Name = "Software Engineer"
        UserDataDir = "C:\Dev\vscode-agent-se"
        Folder = "C:\Dev\CMC-Go-worktrees\wt-se"
        Model = "copilot/gpt-5.2"
        ModelDisplay = "GPT 5.2"
    }
}

$sqlite = "C:\Users\sirja\AppData\Local\Microsoft\WinGet\Packages\SQLite.SQLite_Microsoft.Winget.Source_8wekyb3d8bbwe\sqlite3.exe"
$mainUserData = "$env:APPDATA\Code"

function Initialize-AgentInstance {
    param($AgentConfig)
    
    $ud = $AgentConfig.UserDataDir
    
    Write-Host "Initializing $($AgentConfig.Name) at $ud..." -ForegroundColor Cyan
    
    # Create directory structure
    New-Item -ItemType Directory -Path "$ud\User\globalStorage" -Force | Out-Null
    
    # Link extensions from main VS Code
    $extLink = "$ud\extensions"
    if (-not (Test-Path $extLink)) {
        cmd /c mklink /J "$extLink" "$env:USERPROFILE\.vscode\extensions" 2>$null | Out-Null
    }
    
    # Copy main state.vscdb as base
    $stateDb = "$ud\User\globalStorage\state.vscdb"
    if (-not (Test-Path $stateDb)) {
        Copy-Item "$mainUserData\User\globalStorage\state.vscdb" $stateDb -Force
    }
    
    # Pre-set the model (will be overridden on first sign-in, but worth trying)
    & $sqlite $stateDb "UPDATE ItemTable SET value = '$($AgentConfig.Model)' WHERE key = 'chat.currentLanguageModel.panel'"
    & $sqlite $stateDb "UPDATE ItemTable SET value = '$($AgentConfig.Model)' WHERE key = 'chat.currentLanguageModel.agent'"
    & $sqlite $stateDb "UPDATE ItemTable SET value = 'false' WHERE key = 'chat.currentLanguageModel.panel.isDefault'"
    & $sqlite $stateDb "UPDATE ItemTable SET value = 'false' WHERE key = 'chat.currentLanguageModel.agent.isDefault'"
    
    Write-Host "  Created user-data-dir at $ud" -ForegroundColor Green
    Write-Host "  Target model: $($AgentConfig.ModelDisplay)" -ForegroundColor Yellow
}

function Open-AgentWindow {
    param($AgentConfig)
    
    $ud = $AgentConfig.UserDataDir
    $folder = $AgentConfig.Folder
    
    # Ensure folder exists
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
    }
    
    Write-Host "`nOpening $($AgentConfig.Name) window..." -ForegroundColor Cyan
    Write-Host "  User-data-dir: $ud" -ForegroundColor Gray
    Write-Host "  Folder: $folder" -ForegroundColor Gray
    
    code --user-data-dir $ud -n $folder
    
    Write-Host @"

  ╔══════════════════════════════════════════════════════════════╗
  ║  MANUAL SETUP REQUIRED for $($AgentConfig.Name.PadRight(20))            ║
  ╠══════════════════════════════════════════════════════════════╣
  ║  1. Sign into GitHub when prompted                           ║
  ║  2. Open Copilot Chat (Ctrl+Shift+I)                        ║
  ║  3. Click the model dropdown (bottom right)                  ║
  ║  4. Select: $($AgentConfig.ModelDisplay.PadRight(45))║
  ║  5. Close the window                                         ║
  ╚══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Yellow
}

# Main
Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║           AEOS Agent Model Setup (One-Time)                    ║
╚════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

if ($OpenAll) {
    foreach ($key in @("PE", "TL", "SE")) {
        Initialize-AgentInstance -AgentConfig $agents[$key]
    }
    Write-Host "`n"
    foreach ($key in @("PE", "TL", "SE")) {
        Open-AgentWindow -AgentConfig $agents[$key]
        Start-Sleep -Seconds 2
    }
}
elseif ($Agent) {
    Initialize-AgentInstance -AgentConfig $agents[$Agent]
    Open-AgentWindow -AgentConfig $agents[$Agent]
}
else {
    Write-Host @"

Usage:
  .\setup-agent-models.ps1 -OpenAll       # Setup all 3 agents
  .\setup-agent-models.ps1 -Agent PE      # Setup only PE
  .\setup-agent-models.ps1 -Agent TL      # Setup only TL
  .\setup-agent-models.ps1 -Agent SE      # Setup only SE

After running, manually set the model in each window.
The model selection will persist for future spawns.
"@ -ForegroundColor Yellow
}
