<#
.SYNOPSIS
  Read the current AEOS assignment (if any).

.DESCRIPTION
  Reads the shared assignment.json stored in the git common directory so TL/SE
  can coordinate across worktrees.

.OUTPUTS
  PSCustomObject (assignment) or $null when no assignment exists.
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
    Get-Content $assignmentPath -Raw | ConvertFrom-Json
} catch {
    Write-Warning "Assignment JSON corrupted: $($_.Exception.Message)"
    return $null
}
