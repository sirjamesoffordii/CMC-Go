<#
.SYNOPSIS
    DEPRECATED: Use aeos-spawn.ps1 instead.
.DESCRIPTION
    This script has been superseded by aeos-spawn.ps1 which includes auto-activation.
    
    Uses separate VS Code user-data-dirs for each agent to guarantee model isolation.
    Each agent has its own state database with a pre-configured model.
    
    Each agent has a designated PRIMARY model + BACKUP for rate limit fallback:
    - PE: GPT-5.2
    - TL: GPT-5.2
    - SE: GPT-5.2
    
.PARAMETER Agent
    The agent to spawn: PE, TL, or SE
.PARAMETER UseBackup
    Use the backup model instead of primary (for rate limit recovery)
.PARAMETER UseProfile
    Use isolated user-data-dir for guaranteed model selection (RECOMMENDED)
.PARAMETER Init
    Initialize the agent's user-data-dir (run once per agent to set up)
.PARAMETER WorkspacePath
    Path to the workspace (default: current directory for PE/TL, worktree for SE)
.EXAMPLE
    # DEPRECATED - use instead:
    .\scripts\aeos-spawn.ps1 -Agent TL
#>

Write-Warning "DEPRECATED: Use aeos-spawn.ps1 instead. This script does not auto-activate agents."
param(
    [Parameter(Mandatory)]
    [ValidateSet("PE", "TL", "SE")]
    [string]$Agent,
    
    [switch]$UseBackup,
    
    [switch]$UseProfile,
    
    [switch]$Init,
    
    [string]$WorkspacePath
)

function Stop-VSCodeForUserDataDir {
    param(
        [Parameter(Mandatory)]
        [string]$UserDataDir
    )

    $escaped = [regex]::Escape($UserDataDir)
    $procs = Get-CimInstance Win32_Process -Filter "Name = 'Code.exe'" -ErrorAction SilentlyContinue |
        Where-Object {
            $_.CommandLine -and
            ($_.CommandLine -match '--user-data-dir') -and
            ($_.CommandLine -match $escaped)
        }

    if ($procs) {
        Write-Host "Stopping existing VS Code instances for user-data-dir: $UserDataDir" -ForegroundColor Yellow
        foreach ($p in $procs) {
            try {
                Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
            } catch {
                Write-Host "WARNING: Failed to stop Code.exe PID $($p.ProcessId): $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
        Start-Sleep -Seconds 2
    }
}

# Agent configurations
# Each agent uses its own user-data-dir with a dedicated GitHub account logged in.
# This provides per-agent Copilot rate limits, allowing all agents to use Opus 4.5.
#
# ONE-TIME SETUP per agent:
#   1. Run: code --user-data-dir <UserDataDir>
#   2. Sign out of any existing GitHub account
#   3. Sign in with the agent's GitHub account (see GH_CONFIG_DIR below)
#   4. Close VS Code
#
# GitHub accounts:
#   PE: Principal-Engineer-Agent  (GH_CONFIG_DIR: C:/Users/sirja/.gh-principal-engineer-agent)
#   TL: Tech-Lead-Agent           (GH_CONFIG_DIR: C:/Users/sirja/.gh-tech-lead-agent)
#   SE: Software-Engineer-Agent   (GH_CONFIG_DIR: C:/Users/sirja/.gh-software-engineer-agent)
#
$agentConfig = @{
    "PE" = @{
        Name = "Principal Engineer"
        Model = "gpt-5.2"
        BackupModel = "claude-opus-4.5"
        Prompt = "You are Principal Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
        DefaultPath = "C:\Dev\CMC Go"
        UserDataDir = "C:\Dev\vscode-agent-pe"
        GitHubAccount = "Principal-Engineer-Agent"
    }
    "TL" = @{
        Name = "Tech Lead"
        Model = "gpt-5.2"
        BackupModel = "claude-sonnet-4.5"
        Prompt = "You are Tech Lead 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
        DefaultPath = "C:\Dev\CMC Go"
        UserDataDir = "C:\Dev\vscode-agent-tl"
        GitHubAccount = "Tech-Lead-Agent"
    }
    "SE" = @{
        Name = "Software Engineer"
        Model = "gpt-5.2"
        BackupModel = "gpt-5.2-codex"
        Prompt = "You are Software Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
        DefaultPath = "C:\Dev\CMC-Go-Worktrees\wt-se"
        UserDataDir = "C:\Dev\vscode-agent-se"
        GitHubAccount = "Software-Engineer-Agent"
    }
}

$config = $agentConfig[$Agent]
$path = if ($WorkspacePath) { $WorkspacePath } else { $config.DefaultPath }
$modelToUse = if ($UseBackup) { $config.BackupModel } else { $config.Model }
$modelType = if ($UseBackup) { "BACKUP" } else { "PRIMARY" }
$userDataDir = $config.UserDataDir

Write-Host "=== Spawning $($config.Name) ===" -ForegroundColor Cyan
Write-Host "  Agent: $($config.Name)" -ForegroundColor White
Write-Host "  Model: $modelToUse ($modelType)" -ForegroundColor $(if ($UseBackup) { "Yellow" } else { "White" })
Write-Host "  Workspace: $path" -ForegroundColor White
if ($UseProfile) {
    Write-Host "  UserDataDir: $userDataDir" -ForegroundColor Cyan
}
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

$chatParticipant = $config.Name
$prompt = $config.Prompt

if ($UseProfile) {
    # === ISOLATED USER-DATA-DIR MODE ===
    # Each agent gets its own VS Code state, guaranteeing model isolation
    
    $stateDb = "$userDataDir\User\globalStorage\state.vscdb"
    $needsInit = $Init -or (-not (Test-Path $stateDb))
    
    # Create user-data-dir if needed
    if (-not (Test-Path $userDataDir)) {
        Write-Host "Creating user-data-dir: $userDataDir" -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $userDataDir -Force | Out-Null
    }

    # Create a unique wrapper workspace per agent so `code chat` can target the correct window
    # even when multiple VS Code windows have the same repo/worktree folder open.
    $workspaceFile = Join-Path $userDataDir "agent.code-workspace"
    if (-not (Test-Path $workspaceFile)) {
        $workspaceJson = @{
            folders = @(
                @{ path = $path }
            )
        } | ConvertTo-Json -Depth 4
        $workspaceJson | Set-Content -Path $workspaceFile -Encoding utf8
    }
    
    # Symlink extensions from main profile (share extensions, save space)
    $mainExtensions = "$env:USERPROFILE\.vscode\extensions"
    $agentExtensions = "$userDataDir\extensions"
    if (-not (Test-Path $agentExtensions) -and (Test-Path $mainExtensions)) {
        Write-Host "Linking extensions from main VS Code..." -ForegroundColor Yellow
        cmd /c mklink /J "$agentExtensions" "$mainExtensions" 2>$null | Out-Null
    }
    
    if ($needsInit) {
        Write-Host ""
        Write-Host "=== Initializing $($config.Name) environment ===" -ForegroundColor Magenta
        Write-Host "Opening VS Code to create state database..." -ForegroundColor Yellow

        # Ensure we start clean so VS Code can't reuse an existing instance with cached settings.
        Stop-VSCodeForUserDataDir -UserDataDir $userDataDir
        
        # Open VS Code with this user-data-dir to create the state DB
        code --user-data-dir $userDataDir -n $workspaceFile
        
        Write-Host "Waiting for VS Code to initialize (10 seconds)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        
        # Check if state DB was created
        if (-not (Test-Path $stateDb)) {
            Write-Host "ERROR: State database not created. Try opening Copilot Chat manually." -ForegroundColor Red
            Write-Host "Then run: .\scripts\spawn-agent.ps1 -Agent $Agent -UseProfile" -ForegroundColor Yellow
            exit 1
        }

        # Close the init window so the next run picks up the DB changes.
        Stop-VSCodeForUserDataDir -UserDataDir $userDataDir
        
        # Set the model in this agent's state DB
        Write-Host "Setting model to $modelToUse in agent's state DB..." -ForegroundColor Yellow
        & "$PSScriptRoot\set-copilot-model.ps1" -Model $modelToUse -DbPath $stateDb
        
        Write-Host ""
        Write-Host "✅ $($config.Name) environment initialized!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next run (WITHOUT -Init):" -ForegroundColor Cyan
        Write-Host "  .\scripts\spawn-agent.ps1 -Agent $Agent -UseProfile" -ForegroundColor Cyan
        return
    }
    
    # Normal spawn with isolated user-data-dir
    Write-Host "Opening VS Code with isolated environment..." -ForegroundColor Yellow

    # Ensure VS Code reloads settings from disk (model selection is cached in-memory).
    Stop-VSCodeForUserDataDir -UserDataDir $userDataDir

    # Re-apply the configured model every time (also seeds cached models for isolated DBs).
    & "$PSScriptRoot\set-copilot-model.ps1" -Model $modelToUse -DbPath $stateDb

    $openTarget = if ($Agent -eq "SE") { $path } else { $workspaceFile }
    code --user-data-dir $userDataDir -n $openTarget
    Start-Sleep -Seconds 3
    
    # Start the chat.
    # - SE: CWD is the SE worktree (unique), so `code chat` targets the correct window.
    # - PE/TL: CWD is the isolated user-data-dir (unique), so `code chat` targets the correct window.
    $chatCwd = if ($Agent -eq "SE") { $path } else { $userDataDir }
    Push-Location $chatCwd
    try {
        # NOTE: `code chat` does not accept --user-data-dir; it targets a window based on CWD.
        # Since this agent uses an isolated user-data-dir, the opened window should have the correct model.
        $chatPrompt = "@$chatParticipant $prompt"
        code chat -m agent $chatPrompt
    } finally {
        Pop-Location
    }
    
} else {
    # === STANDARD MODE (shared state, may have wrong model) ===
    Write-Host "Setting Copilot model to $modelToUse..." -ForegroundColor Yellow
    & "$PSScriptRoot\set-copilot-model.ps1" -Model $modelToUse
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Failed to set model." -ForegroundColor Yellow
    }
    Write-Host ""
    
    # Open VS Code
    Write-Host "Opening VS Code..." -ForegroundColor Yellow
    code -n $path
    Start-Sleep -Seconds 3
    
    Write-Host ""
    Write-Host "⚠️  WARNING: VS Code caches models in memory" -ForegroundColor Yellow
    Write-Host "   If model shows wrong, manually select: $modelToUse" -ForegroundColor Yellow
    Write-Host "   TIP: Use -UseProfile for guaranteed model isolation" -ForegroundColor Cyan
    Write-Host ""
    
    # Start chat
    Push-Location $path
    try {
        $chatPrompt = "@$chatParticipant $prompt"
        code chat -m agent $chatPrompt
    } finally {
        Pop-Location
    }
}

Write-Host ""
Write-Host "✅ Agent spawned: $($config.Name)" -ForegroundColor Green
Write-Host "   Model: $modelToUse ($modelType)" -ForegroundColor $(if ($UseBackup) { "Yellow" } else { "Green" })
