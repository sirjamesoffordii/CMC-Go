<#
.SYNOPSIS
    One-time setup: Sign into each agent's VS Code instance with its dedicated GitHub account.
.DESCRIPTION
    Each AEOS agent (PE, TL, SE) uses an isolated VS Code user-data-dir.
    This script opens each one so you can manually sign in with the correct GitHub account.
    
    After signing in, each agent will have its own Copilot Pro rate limits,
    allowing all agents to use Claude Opus 4.5 without quota conflicts.
    
.PARAMETER Agent
    Which agent to set up: PE, TL, SE, or All
.EXAMPLE
    .\scripts\setup-agent-vscode-auth.ps1 -Agent All
    .\scripts\setup-agent-vscode-auth.ps1 -Agent SE
#>
param(
    [Parameter(Mandatory)]
    [ValidateSet("PE", "TL", "SE", "All")]
    [string]$Agent
)

$agents = @{
    "PE" = @{
        Name = "Principal Engineer"
        UserDataDir = "C:\Dev\vscode-data-pe"
        GitHubAccount = "Principal-Engineer-Agent"
        GhConfigDir = "C:/Users/sirja/.gh-principal-engineer-agent"
    }
    "TL" = @{
        Name = "Tech Lead"
        UserDataDir = "C:\Dev\vscode-data-tl"
        GitHubAccount = "Tech-Lead-Agent"
        GhConfigDir = "C:/Users/sirja/.gh-tech-lead-agent"
    }
    "SE" = @{
        Name = "Software Engineer"
        UserDataDir = "C:\Dev\vscode-data-se"
        GitHubAccount = "Software-Engineer-Agent"
        GhConfigDir = "C:/Users/sirja/.gh-software-engineer-agent"
    }
}

function Setup-AgentAuth {
    param(
        [string]$AgentKey
    )
    
    $config = $agents[$AgentKey]
    $userDataDir = $config.UserDataDir
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Setting up: $($config.Name)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "User Data Dir: $userDataDir" -ForegroundColor White
    Write-Host "GitHub Account: $($config.GitHubAccount)" -ForegroundColor White
    Write-Host "GH CLI Config: $($config.GhConfigDir)" -ForegroundColor White
    Write-Host ""
    
    # Create user-data-dir if needed
    if (-not (Test-Path $userDataDir)) {
        Write-Host "Creating user-data-dir..." -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $userDataDir -Force | Out-Null
    }
    
    # Symlink extensions from main VS Code
    $mainExtensions = "$env:USERPROFILE\.vscode\extensions"
    $agentExtensions = "$userDataDir\extensions"
    if (-not (Test-Path $agentExtensions) -and (Test-Path $mainExtensions)) {
        Write-Host "Linking extensions from main VS Code..." -ForegroundColor Yellow
        cmd /c mklink /J "$agentExtensions" "$mainExtensions" 2>$null | Out-Null
    }
    
    Write-Host ""
    Write-Host "Opening VS Code for $($config.Name)..." -ForegroundColor Green
    Write-Host ""
    Write-Host "=== MANUAL STEPS ===" -ForegroundColor Yellow
    Write-Host "1. Click the Accounts icon (person icon in bottom-left)" -ForegroundColor White
    Write-Host "2. Sign out of any existing GitHub account" -ForegroundColor White
    Write-Host "3. Click 'Sign in to use GitHub Copilot'" -ForegroundColor White
    Write-Host "4. Sign in as: $($config.GitHubAccount)" -ForegroundColor Green
    Write-Host "5. Verify Copilot works (open Chat, send a test message)" -ForegroundColor White
    Write-Host "6. Close this VS Code window when done" -ForegroundColor White
    Write-Host ""
    
    # Open VS Code with this user-data-dir
    code --user-data-dir $userDataDir -n "C:\Dev\CMC Go"
    
    Write-Host "Press Enter when you've completed the sign-in..." -ForegroundColor Cyan
    Read-Host
    
    Write-Host "✅ $($config.Name) setup complete!" -ForegroundColor Green
}

if ($Agent -eq "All") {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
    Write-Host "║  AEOS Agent VS Code Authentication Setup                   ║" -ForegroundColor Magenta
    Write-Host "║                                                            ║" -ForegroundColor Magenta
    Write-Host "║  Each agent needs its own GitHub account signed in to      ║" -ForegroundColor Magenta
    Write-Host "║  get separate Copilot rate limits. This is a ONE-TIME      ║" -ForegroundColor Magenta
    Write-Host "║  setup per agent.                                          ║" -ForegroundColor Magenta
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
    Write-Host ""
    
    foreach ($key in @("PE", "TL", "SE")) {
        Setup-AgentAuth -AgentKey $key
    }
    
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  ✅ All agents configured!                                 ║" -ForegroundColor Green
    Write-Host "║                                                            ║" -ForegroundColor Green
    Write-Host "║  Each agent now has:                                       ║" -ForegroundColor Green
    Write-Host "║  - Its own VS Code user-data-dir                           ║" -ForegroundColor Green
    Write-Host "║  - Its own GitHub account for Copilot                      ║" -ForegroundColor Green
    Write-Host "║  - Its own Copilot Pro rate limits                         ║" -ForegroundColor Green
    Write-Host "║                                                            ║" -ForegroundColor Green
    Write-Host "║  All agents can now use Claude Opus 4.5!                   ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
} else {
    Setup-AgentAuth -AgentKey $Agent
}
