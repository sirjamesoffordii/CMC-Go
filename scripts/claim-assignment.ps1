<#
.SYNOPSIS
  Atomically claim (read + delete) the current AEOS assignment.

.DESCRIPTION
  Used by SE to claim work. Reads the shared assignment.json in the git common
  directory and removes it to prevent double-claim.

.OUTPUTS
  PSCustomObject (assignment) or $null if none.
#>

[CmdletBinding()]
param()

function Get-AeosCoordDir {
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
    $commonDirRel = (& git -C $repoRoot rev-parse --git-common-dir 2>$null)
    if (-not $commonDirRel) {
        return (Join-Path $repoRoot ".github" "agents")
    }

    $commonDirPath = (Resolve-Path (Join-Path $repoRoot $commonDirRel)).Path
    return (Join-Path $commonDirPath "aeos")
}

$coordDir = Get-AeosCoordDir
$assignmentPath = Join-Path $coordDir "assignment.json"

if (-not (Test-Path $assignmentPath)) {
    return $null
}

try {
    $assignment = Get-Content $assignmentPath -Raw | ConvertFrom-Json
} catch {
    Write-Warning "Assignment JSON corrupted: $($_.Exception.Message)"
    return $null
}

try {
    Remove-Item $assignmentPath -ErrorAction Stop
} catch {
    Write-Warning "Could not remove assignment file (already claimed?): $($_.Exception.Message)"
}

return $assignment
