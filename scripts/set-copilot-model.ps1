<#
.SYNOPSIS
    Set the default Copilot Chat model in VS Code's state database.
.DESCRIPTION
    Modifies VS Code's SQLite state database to set the selected model for Copilot Chat.
    This affects ALL VS Code windows - use before launching a new window.
    
    IMPORTANT: VS Code caches state in memory. For changes to take effect:
    1. Close all VS Code windows, OR
    2. Apply before opening a new VS Code window
    
.PARAMETER Model
    The model to set. Use tab completion for valid values.
.PARAMETER List
    List all available models.
.EXAMPLE
    .\scripts\set-copilot-model.ps1 -Model "claude-opus-4.5"
    .\scripts\set-copilot-model.ps1 -Model "gpt-5.2-codex"
    .\scripts\set-copilot-model.ps1 -List
#>
param(
    [Parameter(ParameterSetName='Set')]
    [ValidateSet(
        "auto",
        "claude-haiku-4.5",
        "claude-opus-4.5",
        "claude-opus-41",
        "claude-sonnet-4",
        "claude-sonnet-4.5",
        "gpt-4.1",
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-5",
        "gpt-5-codex",
        "gpt-5-mini",
        "gpt-5.1",
        "gpt-5.1-codex",
        "gpt-5.1-codex-max",
        "gpt-5.1-codex-mini",
        "gpt-5.2",
        "gpt-5.2-codex",
        "gemini-2.5-pro",
        "gemini-3-flash-preview",
        "gemini-3-pro-preview"
    )]
    [string]$Model,
    
    [Parameter(ParameterSetName='List')]
    [switch]$List
)

# SQLite path
$sqlite = "C:\Users\sirja\AppData\Local\Microsoft\WinGet\Packages\SQLite.SQLite_Microsoft.Winget.Source_8wekyb3d8bbwe\sqlite3.exe"
$stateDb = "$env:APPDATA\Code\User\globalStorage\state.vscdb"

# Verify SQLite exists
if (-not (Test-Path $sqlite)) {
    Write-Host "ERROR: SQLite not found at $sqlite" -ForegroundColor Red
    Write-Host "Install with: winget install SQLite.SQLite" -ForegroundColor Yellow
    exit 1
}

# Verify VS Code state database exists
if (-not (Test-Path $stateDb)) {
    Write-Host "ERROR: VS Code state database not found at $stateDb" -ForegroundColor Red
    exit 1
}

if ($List) {
    Write-Host "=== Available Copilot Models ===" -ForegroundColor Cyan
    $raw = & $sqlite $stateDb "SELECT value FROM ItemTable WHERE key = 'chat.cachedLanguageModels'"
    if ($raw) {
        $models = $raw | ConvertFrom-Json
        $models | ForEach-Object {
            $id = $_.identifier -replace 'copilot/', ''
            $name = $_.metadata.name
            Write-Host "  $id" -ForegroundColor White -NoNewline
            Write-Host " - $name" -ForegroundColor Gray
        }
    } else {
        Write-Host "No cached models found. Open VS Code Copilot Chat first." -ForegroundColor Yellow
    }
    
    Write-Host "`n=== Current Model ===" -ForegroundColor Cyan
    $current = & $sqlite $stateDb "SELECT value FROM ItemTable WHERE key = 'chat.currentLanguageModel.panel'"
    Write-Host "  $current" -ForegroundColor Green
    return
}

if (-not $Model) {
    Write-Host "Usage: .\set-copilot-model.ps1 -Model <model-name>" -ForegroundColor Yellow
    Write-Host "       .\set-copilot-model.ps1 -List" -ForegroundColor Yellow
    exit 1
}

# Format the model identifier
$modelId = "copilot/$Model"

# Get current model
$currentModel = & $sqlite $stateDb "SELECT value FROM ItemTable WHERE key = 'chat.currentLanguageModel.panel'"
Write-Host "Current model: $currentModel" -ForegroundColor Gray

# Update the model
Write-Host "Setting model to: $modelId" -ForegroundColor Yellow
& $sqlite $stateDb "UPDATE ItemTable SET value = '$modelId' WHERE key = 'chat.currentLanguageModel.panel'"

# Also reset the isDefault flag
& $sqlite $stateDb "UPDATE ItemTable SET value = 'false' WHERE key = 'chat.currentLanguageModel.panel.isDefault'"

# Verify
$newModel = & $sqlite $stateDb "SELECT value FROM ItemTable WHERE key = 'chat.currentLanguageModel.panel'"
if ($newModel -eq $modelId) {
    Write-Host "✅ Model set to: $newModel" -ForegroundColor Green
    Write-Host ""
    Write-Host "NOTE: Changes apply to NEW VS Code windows." -ForegroundColor Yellow
    Write-Host "      Existing windows will keep their current model." -ForegroundColor Yellow
} else {
    Write-Host "❌ Failed to set model. Current: $newModel" -ForegroundColor Red
    exit 1
}
