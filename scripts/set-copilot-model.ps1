<#
.SYNOPSIS
    Set the default Copilot Chat model in VS Code's state database.
.DESCRIPTION
    Modifies VS Code's SQLite state database to set the selected model for Copilot Chat.
    This affects ALL VS Code windows - use before launching a new window.
    Updates both VS Code Stable and Insiders state DBs when present.
    Sets all discovered 'chat.currentLanguageModel.*' keys (panel/agent/etc).
    
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

# VS Code state DB locations (stable + insiders)
$stateDbCandidates = @(
    "$env:APPDATA\Code\User\globalStorage\state.vscdb",
    "$env:APPDATA\Code - Insiders\User\globalStorage\state.vscdb"
)
$stateDbs = $stateDbCandidates | Where-Object { Test-Path $_ }

# Verify SQLite exists
if (-not (Test-Path $sqlite)) {
    Write-Host "ERROR: SQLite not found at $sqlite" -ForegroundColor Red
    Write-Host "Install with: winget install SQLite.SQLite" -ForegroundColor Yellow
    exit 1
}

# Verify at least one VS Code state DB exists
if (-not $stateDbs -or $stateDbs.Count -eq 0) {
    Write-Host "ERROR: No VS Code state database found." -ForegroundColor Red
    Write-Host "Checked:" -ForegroundColor Yellow
    $stateDbCandidates | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    exit 1
}

if ($List) {
    Write-Host "=== Available Copilot Models ===" -ForegroundColor Cyan
    foreach ($db in $stateDbs) {
        Write-Host "`n--- DB: $db ---" -ForegroundColor DarkGray
        $raw = & $sqlite $db "SELECT value FROM ItemTable WHERE key = 'chat.cachedLanguageModels'"
        if ($raw) {
            $models = $raw | ConvertFrom-Json
            $models | ForEach-Object {
                $id = $_.identifier -replace 'copilot/', ''
                $name = $_.metadata.name
                Write-Host "  $id" -ForegroundColor White -NoNewline
                Write-Host " - $name" -ForegroundColor Gray
            }
        } else {
            Write-Host "No cached models found in this DB. Open VS Code Copilot Chat first." -ForegroundColor Yellow
        }

        Write-Host "`n=== Current Model Keys ===" -ForegroundColor Cyan
        $currentKeys = & $sqlite $db "SELECT key || ' = ' || value FROM ItemTable WHERE key LIKE 'chat.currentLanguageModel.%' ORDER BY key"
        if ($currentKeys) {
            $currentKeys | ForEach-Object { Write-Host "  $_" -ForegroundColor Green }
        } else {
            Write-Host "  (none found)" -ForegroundColor Yellow
        }
    }
    return
}

if (-not $Model) {
    Write-Host "Usage: .\set-copilot-model.ps1 -Model <model-name>" -ForegroundColor Yellow
    Write-Host "       .\set-copilot-model.ps1 -List" -ForegroundColor Yellow
    exit 1
}

# Format the model identifier
$modelId = "copilot/$Model"

Write-Host "Setting model to: $modelId" -ForegroundColor Yellow

foreach ($db in $stateDbs) {
    Write-Host "`n--- Updating DB: $db ---" -ForegroundColor Cyan

    # Update ANY existing model-selection keys in this DB.
    # We avoid INSERTs because ItemTable schema can vary; instead we update keys that already exist.
    $existingModelKeys = & $sqlite $db "SELECT key FROM ItemTable WHERE key LIKE '%currentLanguageModel%' AND key NOT LIKE '%.isDefault' ORDER BY key"
    if (-not $existingModelKeys) {
        Write-Host "WARNING: No '*currentLanguageModel*' keys found in this DB. Open Copilot Chat once to populate cached keys." -ForegroundColor Yellow
    } else {
        & $sqlite $db "UPDATE ItemTable SET value = '$modelId' WHERE key LIKE '%currentLanguageModel%' AND key NOT LIKE '%.isDefault'"
        & $sqlite $db "UPDATE ItemTable SET value = 'false' WHERE key LIKE '%currentLanguageModel%.isDefault'"

        # Verify
        $mismatches = & $sqlite $db "SELECT key || '=' || value FROM ItemTable WHERE key LIKE '%currentLanguageModel%' AND key NOT LIKE '%.isDefault' AND value <> '$modelId'"
        if ($mismatches) {
            Write-Host "❌ Failed to set some model keys:" -ForegroundColor Red
            $mismatches | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
            exit 1
        }
    }

    Write-Host "✅ Model keys updated in: $db" -ForegroundColor Green
}

Write-Host "" 
Write-Host "NOTE: Changes apply to NEW VS Code windows." -ForegroundColor Yellow
Write-Host "      Existing windows will keep their current model." -ForegroundColor Yellow
