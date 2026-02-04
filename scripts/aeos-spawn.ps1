<#
.SYNOPSIS
    Spawn an AEOS agent with FULL AUTOMATION - no human intervention required.
.DESCRIPTION
    This script:
    1. Checks model rate limit status (uses backup if primary rate limited)
    2. Writes an auto-activate.json config file
    3. Opens VS Code with the agent's isolated user-data-dir
    4. The AEOS Activator extension reads the config and auto-starts the chat session
    
    Models (with automatic fallback):
    - PRIMARY: Claude Opus 4.5 (all agents)
    - BACKUP: GPT 5.2 (used when Opus rate limited)
    
.PARAMETER Agent
    Which agent to spawn: PE, TL, or SE
.PARAMETER All
    Spawn all 3 agents
.PARAMETER UseBackup
    Force use of backup model (skip rate limit check)
.EXAMPLE
    .\scripts\aeos-spawn.ps1 -Agent PE
    .\scripts\aeos-spawn.ps1 -All
    .\scripts\aeos-spawn.ps1 -Agent TL -UseBackup
#>
param(
    [ValidateSet("PE", "TL", "SE")]
    [string]$Agent,
    
    [switch]$All,
    
    [switch]$UseBackup
)

# Agent configurations - models determined dynamically via get-model-status.ps1
$agents = @{
    "PE" = @{
        Name = "Principal Engineer"
        UserDataDir = "C:\Dev\vscode-agent-pe"
        WorkspacePath = "C:\Dev\CMC Go"
        AgentName = "Principal Engineer"
        PrimaryModel = "claude-opus-4.5"
        BackupModel = "gpt-5.2"
        GitHubAccount = "Principal-Engineer-Agent"
        Activation = "You are Principal Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
    }
    "TL" = @{
        Name = "Tech Lead"
        UserDataDir = "C:\Dev\vscode-agent-tl"
        WorkspacePath = "C:\Dev\CMC Go"
        AgentName = "Tech Lead"
        PrimaryModel = "claude-opus-4.5"
        BackupModel = "gpt-5.2"
        GitHubAccount = "Tech-Lead-Agent"
        Activation = "You are Tech Lead 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
    }
    "SE" = @{
        Name = "Software Engineer"
        UserDataDir = "C:\Dev\vscode-agent-se"
        WorkspacePath = "C:\Dev\CMC-Go-Worktrees\wt-se"
        AgentName = "Software Engineer"
        PrimaryModel = "claude-opus-4.5"
        BackupModel = "gpt-5.2"
        GitHubAccount = "Software-Engineer-Agent"
        Activation = "You are Software Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
    }
}

function Spawn-Agent {
    param(
        [string]$Key,
        [switch]$ForceBackup
    )
    
    $ag = $agents[$Key]
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  Spawning: $($ag.Name.PadRight(45))    ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    
    # Check workspace exists
    if (-not (Test-Path $ag.WorkspacePath)) {
        Write-Host "  ✗ Workspace not found: $($ag.WorkspacePath)" -ForegroundColor Red
        if ($Key -eq "SE") {
            Write-Host "  → Run: .\scripts\spawn-worktree-agent.ps1 first" -ForegroundColor Yellow
        }
        return $false
    }
    
    # Determine which model to use
    $modelToUse = $ag.PrimaryModel
    $modelReason = "primary"
    
    if ($ForceBackup) {
        $modelToUse = $ag.BackupModel
        $modelReason = "backup (forced)"
    } else {
        # Check rate limit status
        $getStatusScript = Join-Path $PSScriptRoot "get-model-status.ps1"
        if (Test-Path $getStatusScript) {
            $status = & $getStatusScript -Agent $Key
            if (-not $status.isPrimary) {
                $modelToUse = $status.model
                $modelReason = "backup (rate limited until $($status.rateLimitedUntil))"
            }
        }
    }
    
    Write-Host "  ✓ Model: $modelToUse ($modelReason)" -ForegroundColor $(if ($modelReason -eq "primary") { "Green" } else { "Yellow" })
    
    # Write the auto-activate config file
    $configPath = Join-Path $ag.WorkspacePath ".github\agents\auto-activate.json"
    $configDir = Split-Path $configPath -Parent
    
    if (-not (Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    }
    
    $config = @{
        role = $Key
        agent = $ag.AgentName
        message = $ag.Activation
        model = $modelToUse
        timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
    
    $config | ConvertTo-Json | Set-Content $configPath -Encoding utf8
    Write-Host "  ✓ Config written: $configPath" -ForegroundColor Green

    # Pre-set the agent's Copilot model in its isolated VS Code state DB.
    $stateDb = Join-Path $ag.UserDataDir "User\globalStorage\state.vscdb"
    $setModelScript = Join-Path $PSScriptRoot "set-copilot-model.ps1"
    if ((Test-Path $setModelScript) -and (Test-Path $stateDb)) {
        Write-Host "  ✓ Setting Copilot model in agent DB: $modelToUse" -ForegroundColor Green
        & $setModelScript -Model $modelToUse -DbPath $stateDb
    } else {
        Write-Host "  ⚠ Could not set model (missing script or state DB): $stateDb" -ForegroundColor Yellow
    }
    
    # Open VS Code with isolated user-data-dir
    Write-Host "  ✓ Opening VS Code with user-data-dir: $($ag.UserDataDir)" -ForegroundColor Green
    Start-Process code -ArgumentList "--user-data-dir", "`"$($ag.UserDataDir)`"", "-n", "`"$($ag.WorkspacePath)`""
    
    Write-Host "  ✓ Agent $Key spawned - auto-activation pending..." -ForegroundColor Green
    return $true
}

# Determine which agents to spawn
$toSpawn = if ($All) { @("PE", "TL", "SE") } elseif ($Agent) { @($Agent) } else {
    Write-Host "Usage: .\scripts\aeos-spawn.ps1 -Agent PE|TL|SE [-UseBackup]" -ForegroundColor Yellow
    Write-Host "       .\scripts\aeos-spawn.ps1 -All" -ForegroundColor Yellow
    return
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║                    AEOS AUTONOMOUS SPAWN                         ║" -ForegroundColor Magenta
Write-Host "║                                                                  ║" -ForegroundColor Magenta
Write-Host "║  PRIMARY: Claude Opus 4.5  |  BACKUP: GPT 5.2                    ║" -ForegroundColor Magenta
Write-Host "║  Auto-fallback when rate limited (15 min cooldown)               ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta

$success = 0
foreach ($key in $toSpawn) {
    if (Spawn-Agent -Key $key -ForceBackup:$UseBackup) {
        $success++
    }
    Start-Sleep -Milliseconds 1500
}

Write-Host ""
if ($success -eq $toSpawn.Count) {
    Write-Host "✅ All $success agents spawned successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Spawned $success of $($toSpawn.Count) agents" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Agents will auto-activate in ~3 seconds after VS Code opens." -ForegroundColor Cyan
Write-Host "Check Output > 'AEOS Activator' for logs." -ForegroundColor Cyan
Write-Host ""
