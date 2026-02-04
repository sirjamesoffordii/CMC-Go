<#
.SYNOPSIS
    DEPRECATED: Activation is now automatic via AEOS Activator extension.
.DESCRIPTION
    This script has been superseded by the AEOS Activator VS Code extension
    which automatically activates agents when spawned via aeos-spawn.ps1.
    
    If manual activation is needed, use VS Code command: "AEOS: Activate Agent"
    
.PARAMETER Agent
    PE, TL, or SE
.EXAMPLE
    # DEPRECATED - use instead:
    .\scripts\aeos-spawn.ps1 -Agent PE
#>

Write-Warning "DEPRECATED: Agents now auto-activate when spawned via aeos-spawn.ps1"
Write-Warning "If manual activation is needed, use VS Code command: AEOS: Activate Agent"
param(
    [Parameter(Mandatory)]
    [ValidateSet("PE", "TL", "SE")]
    [string]$Agent
)

$activations = @{
    "PE" = "You are Principal Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
    "TL" = "You are Tech Lead 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
    "SE" = "You are Software Engineer 1. YOU ARE FULLY AUTONOMOUS. DON'T ASK QUESTIONS. LOOP FOREVER. START NOW."
}

$names = @{
    "PE" = "Principal Engineer"
    "TL" = "Tech Lead"
    "SE" = "Software Engineer"
}

$msg = $activations[$Agent]
$msg | Set-Clipboard

Write-Host ""
Write-Host "✅ Copied $($names[$Agent]) activation to clipboard!" -ForegroundColor Green
Write-Host ""
Write-Host "Now:" -ForegroundColor Cyan
Write-Host "1. Go to the $($names[$Agent]) window" -ForegroundColor White
Write-Host "2. Open Copilot Chat (Ctrl+Shift+I)" -ForegroundColor White
Write-Host "3. Select '$($names[$Agent])' agent from dropdown" -ForegroundColor White
Write-Host "4. Paste (Ctrl+V) and press Enter" -ForegroundColor White
Write-Host ""
