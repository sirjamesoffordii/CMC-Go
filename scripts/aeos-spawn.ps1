<#
.SYNOPSIS
    Spawn an AEOS agent with FULL AUTOMATION - no human intervention required.
.DESCRIPTION
    This script:
    1. Writes an auto-activate.json config file
    2. Opens VS Code with the agent's isolated user-data-dir
    3. The AEOS Activator extension reads the config and auto-starts the chat session
    
    Models (persisted in each agent's state.vscdb):
    - PE: GPT-5.2
    - TL: GPT-5.2
    - SE: GPT-5.2
    
.PARAMETER Agent
    Which agent to spawn: PE, TL, or SE
.PARAMETER All
    Spawn all 3 agents
.EXAMPLE
    .\scripts\aeos-spawn.ps1 -Agent PE
    .\scripts\aeos-spawn.ps1 -All
#>
param(
    [ValidateSet("PE", "TL", "SE")]
    [string]$Agent,
    
    [switch]$All
)

# Agent configurations - models are persisted in each user-data-dir's state.vscdb
$agents = @{
    "PE" = @{
        Name = "Principal Engineer"
        UserDataDir = "C:\Dev\vscode-agent-pe"
        WorkspacePath = "C:\Dev\CMC Go"
        AgentName = "Principal Engineer"
        Model = "gpt-5.2"
        GitHubAccount = "Principal-Engineer-Agent"
        Activation = "You are Principal Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
    }
    "TL" = @{
        Name = "Tech Lead"
        UserDataDir = "C:\Dev\vscode-agent-tl"
        WorkspacePath = "C:\Dev\CMC Go"
        AgentName = "Tech Lead"
        Model = "gpt-5.2"
        GitHubAccount = "Tech-Lead-Agent"
        Activation = "You are Tech Lead 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
    }
    "SE" = @{
        Name = "Software Engineer"
        UserDataDir = "C:\Dev\vscode-agent-se"
        WorkspacePath = "C:\Dev\CMC-Go-Worktrees\wt-se"
        AgentName = "Software Engineer"
        Model = "gpt-5.2"
        GitHubAccount = "Software-Engineer-Agent"
        Activation = "You are Software Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
    }
}

function Spawn-Agent {
    param([string]$Key)
    
    $ag = $agents[$Key]
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  Spawning: $($ag.Name.PadRight(45))    ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    
    # CRITICAL: Close existing VS Code window for this agent first!
    # The AEOS Activator extension only runs on VS Code startup (onStartupFinished).
    # If we don't close the existing window, VS Code reuses it and the extension
    # never sees the new config file.
    $userDataDir = $ag.UserDataDir
    Write-Host "  ⏳ Closing existing VS Code window for $Key..." -ForegroundColor Yellow
    
    # Find and kill Code processes using this user-data-dir
    $closedAny = $false
    Get-Process -Name "Code" -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue).CommandLine
            if ($cmdLine -and $cmdLine -match [regex]::Escape($userDataDir)) {
                Write-Host "    Closing PID $($_.Id)..." -ForegroundColor DarkGray
                $_.Kill()
                $closedAny = $true
            }
        } catch {
            # Ignore errors (process may have already exited)
        }
    }
    
    if ($closedAny) {
        Write-Host "  ✓ Closed existing window" -ForegroundColor Green
        Start-Sleep -Seconds 2  # Wait for VS Code to fully close
    } else {
        Write-Host "  ✓ No existing window to close" -ForegroundColor Green
    }
    
    # Check workspace exists
    if (-not (Test-Path $ag.WorkspacePath)) {
        Write-Host "  ✗ Workspace not found: $($ag.WorkspacePath)" -ForegroundColor Red
        if ($Key -eq "SE") {
            Write-Host "  → Run: .\scripts\spawn-worktree-agent.ps1 first" -ForegroundColor Yellow
        }
        return $false
    }
    
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
        timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
    
    $config | ConvertTo-Json | Set-Content $configPath -Encoding utf8
    Write-Host "  ✓ Config written: $configPath" -ForegroundColor Green

    # Pre-set the agent's Copilot model in its isolated VS Code state DB.
    # This applies only to NEW VS Code windows and avoids inheriting a cached model.
    $stateDb = Join-Path $ag.UserDataDir "User\globalStorage\state.vscdb"
    $setModelScript = Join-Path $PSScriptRoot "set-copilot-model.ps1"
    if ((Test-Path $setModelScript) -and (Test-Path $stateDb)) {
        Write-Host "  ✓ Setting Copilot model in agent DB: $($ag.Model)" -ForegroundColor Green
        & $setModelScript -Model $ag.Model -DbPath $stateDb
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
    Write-Host "Usage: .\scripts\aeos-spawn.ps1 -Agent PE|TL|SE" -ForegroundColor Yellow
    Write-Host "       .\scripts\aeos-spawn.ps1 -All" -ForegroundColor Yellow
    return
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║                    AEOS AUTONOMOUS SPAWN                         ║" -ForegroundColor Magenta
Write-Host "║                                                                  ║" -ForegroundColor Magenta
Write-Host "║  The AEOS Activator extension will auto-start chat sessions.     ║" -ForegroundColor Magenta
Write-Host "║  No manual intervention required!                                ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta

$success = 0
foreach ($key in $toSpawn) {
    if (Spawn-Agent -Key $key) {
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
