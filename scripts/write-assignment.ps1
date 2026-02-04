<#
.SYNOPSIS
  Write an AEOS assignment for the Software Engineer.

.DESCRIPTION
  Writes assignment.json to the shared coordination directory (git common dir)
  so the SE can see it from any worktree.

.PARAMETER Issue
  Issue number to assign.

.PARAMETER Priority
  Priority string (urgent|high|medium|low). Default: high

.PARAMETER AssignedBy
  Who assigned the work. Default: TechLead
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [int]$Issue,

    [ValidateSet('urgent','high','medium','low')]
    [string]$Priority = 'high',

    [string]$AssignedBy = 'TechLead'
)

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
if (-not (Test-Path $coordDir)) {
    New-Item -ItemType Directory -Path $coordDir -Force | Out-Null
}

$assignmentPath = Join-Path $coordDir "assignment.json"

$assignment = @{
    issue      = $Issue
    priority   = $Priority
    assignedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    assignedBy = $AssignedBy
}

$assignment | ConvertTo-Json | Set-Content $assignmentPath -Encoding utf8
Write-Host "Assigned issue #$Issue (priority=$Priority)" -ForegroundColor Green
Write-Host "Path: $assignmentPath" -ForegroundColor DarkGray
