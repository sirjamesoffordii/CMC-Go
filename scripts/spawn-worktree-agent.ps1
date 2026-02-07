<#
.SYNOPSIS
    Spawn the persistent Software Engineer (SE) agent in the worktree.
.DESCRIPTION
    Compatibility wrapper.

    Historically AEOS used a dedicated worktree spawn script. The normal flow is:
    1) Start AEOS with PE first: .\scripts\aeos-start-pe.ps1
    2) PE spawns TL/SE as needed

    This wrapper is kept for tasks/automation that still call it.
.PARAMETER DryRun
    Print what would happen without spawning.
.EXAMPLE
    .\scripts\spawn-worktree-agent.ps1
    .\scripts\spawn-worktree-agent.ps1 -DryRun
#>

[CmdletBinding()]
param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if ($DryRun) {
    Write-Host "[DryRun] Would spawn SE in worktree via: .\\scripts\\aeos-spawn.ps1 -Agent SE" -ForegroundColor Cyan
    exit 0
}

& "$PSScriptRoot\\aeos-spawn.ps1" -Agent SE
