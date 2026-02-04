<#
.SYNOPSIS
    Set up GitHub tokens for all AEOS agent accounts.
.DESCRIPTION
    Prompts for GitHub Personal Access Tokens for each agent account and stores them
    in the appropriate GH config directories.
    
    Accounts:
    - Principal-Engineer-Agent (principalengineer@pvchialpha.com)
    - Tech-Lead-Agent (techlead@pvchialpha.com)
    - Software-Engineer-Agent (bravo@pvchialpha.com)
    
.PARAMETER Agent
    Set up only a specific agent: PE, TL, or SE
.PARAMETER All
    Set up all agent tokens (default)
.EXAMPLE
    .\scripts\setup-agent-tokens.ps1 -All
    .\scripts\setup-agent-tokens.ps1 -Agent PE
#>
param(
    [ValidateSet("PE", "TL", "SE")]
    [string]$Agent,
    
    [switch]$All
)

$ErrorActionPreference = 'Stop'

# Agent configurations
$agents = @{
    "PE" = @{
        Name = "Principal Engineer"
        Account = "Principal-Engineer-Agent"
        Email = "principalengineer@pvchialpha.com"
        ConfigDir = "C:\Users\sirja\.gh-principal-engineer-agent"
    }
    "TL" = @{
        Name = "Tech Lead"
        Account = "Tech-Lead-Agent"
        Email = "techlead@pvchialpha.com"
        ConfigDir = "C:\Users\sirja\.gh-tech-lead-agent"
    }
    "SE" = @{
        Name = "Software Engineer"
        Account = "Software-Engineer-Agent"
        Email = "bravo@pvchialpha.com"
        ConfigDir = "C:\Users\sirja\.gh-software-engineer-agent"
    }
}

function Setup-AgentToken {
    param([string]$Key)
    
    $ag = $agents[$Key]
    
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  Setting up: $($ag.Name.PadRight(44)) ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Account: $($ag.Account)" -ForegroundColor White
    Write-Host "  Email:   $($ag.Email)" -ForegroundColor White
    Write-Host "  Config:  $($ag.ConfigDir)" -ForegroundColor DarkGray
    Write-Host ""
    
    # Create config directory if not exists
    if (-not (Test-Path $ag.ConfigDir)) {
        New-Item -ItemType Directory -Path $ag.ConfigDir -Force | Out-Null
        Write-Host "  Created config directory" -ForegroundColor Yellow
    }
    
    # Prompt for token
    Write-Host "  Enter GitHub Personal Access Token for $($ag.Account):" -ForegroundColor Yellow
    Write-Host "  (Token should have: repo, read:org, workflow scopes)" -ForegroundColor DarkGray
    $token = Read-Host -Prompt "  Token" -AsSecureString
    $plainToken = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($token))
    
    if ([string]::IsNullOrWhiteSpace($plainToken)) {
        Write-Host "  ✗ Token cannot be empty!" -ForegroundColor Red
        return $false
    }
    
    # Set environment and authenticate
    $env:GH_CONFIG_DIR = $ag.ConfigDir
    $env:GH_TOKEN = $plainToken
    
    # Create hosts.yml with the token
    $hostsContent = @"
github.com:
    oauth_token: $plainToken
    user: $($ag.Account)
    git_protocol: https
"@
    
    $hostsPath = Join-Path $ag.ConfigDir "hosts.yml"
    $hostsContent | Set-Content $hostsPath -Encoding utf8
    
    # Verify authentication
    Write-Host ""
    Write-Host "  Verifying authentication..." -ForegroundColor Yellow
    $result = & gh auth status -h github.com 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Authenticated as $($ag.Account)!" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  ✗ Authentication failed!" -ForegroundColor Red
        Write-Host "  $result" -ForegroundColor Red
        return $false
    }
}

# Determine which agents to set up
$toSetup = if ($Agent) { @($Agent) } elseif ($All -or (-not $Agent)) { @("PE", "TL", "SE") } else { @() }

if ($toSetup.Count -eq 0) {
    Write-Host "Usage: .\scripts\setup-agent-tokens.ps1 -All" -ForegroundColor Yellow
    Write-Host "       .\scripts\setup-agent-tokens.ps1 -Agent PE|TL|SE" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║                    AEOS AGENT TOKEN SETUP                                 ║" -ForegroundColor Magenta
Write-Host "║                                                                           ║" -ForegroundColor Magenta
Write-Host "║  You'll need a GitHub Personal Access Token (classic) for each account.  ║" -ForegroundColor Magenta
Write-Host "║  Create tokens at: https://github.com/settings/tokens                     ║" -ForegroundColor Magenta
Write-Host "║                                                                           ║" -ForegroundColor Magenta
Write-Host "║  Required scopes: repo, read:org, workflow, project                       ║" -ForegroundColor Magenta
Write-Host "╚═══════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta

$success = 0
foreach ($key in $toSetup) {
    if (Setup-AgentToken -Key $key) {
        $success++
    }
}

# Clear sensitive env vars
$env:GH_TOKEN = $null

Write-Host ""
if ($success -eq $toSetup.Count) {
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "✅ All $success agent tokens configured successfully!" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
} else {
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host "⚠️  Configured $success of $($toSetup.Count) agent tokens" -ForegroundColor Yellow
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Token locations:" -ForegroundColor Cyan
foreach ($key in $toSetup) {
    $ag = $agents[$key]
    $exists = Test-Path (Join-Path $ag.ConfigDir "hosts.yml")
    $status = if ($exists) { "✓" } else { "✗" }
    Write-Host "  $status $($ag.Name): $($ag.ConfigDir)" -ForegroundColor $(if ($exists) { "Green" } else { "Red" })
}
Write-Host ""
