<#
.SYNOPSIS
  Update the AEOS heartbeat file with current agent status.

.DESCRIPTION
  Standardizes heartbeat updates across all agent roles.
  Creates the heartbeat file if it doesn't exist.

.PARAMETER Role
  Agent role: PE, TL, or SE

.PARAMETER Status
  Current status string (e.g., "monitoring", "reviewing-pr-123", "implementing")

.PARAMETER Issue
  Optional issue number being worked on

.PARAMETER PR
  Optional PR number being reviewed

.PARAMETER Worktree
  Optional worktree name (legacy, not used in current model)

.EXAMPLE
  .\scripts\update-heartbeat.ps1 -Role TL -Status "reviewing-pr-123" -PR 123

.EXAMPLE
  .\scripts\update-heartbeat.ps1 -Role SE -Status "implementing" -Issue 42
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('PE', 'TL', 'SE')]
    [string]$Role,

    [Parameter(Mandatory = $true)]
    [string]$Status,

    [int]$Issue,

    [int]$PR,

    [string]$Worktree
)

$heartbeatPath = Join-Path $PSScriptRoot ".." ".github" "agents" "heartbeat.json"
$heartbeatPath = (Resolve-Path $heartbeatPath -ErrorAction SilentlyContinue) ?? $heartbeatPath

# Create directory if needed
$dir = Split-Path $heartbeatPath -Parent
if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

# Load existing heartbeat or create new
if (Test-Path $heartbeatPath) {
    $heartbeat = Get-Content $heartbeatPath -Raw | ConvertFrom-Json
} else {
    $heartbeat = @{}
}

# Map role to key (use short consistent keys)
$roleKey = $Role  # PE, TL, SE

# Build entry
$entry = @{
    ts     = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    status = $Status
}

if ($Issue) { $entry.issue = $Issue }
if ($PR) { $entry.pr = $PR }
if ($Worktree) { $entry.worktree = $Worktree }

# Update heartbeat
$heartbeat | Add-Member -NotePropertyName $roleKey -NotePropertyValue $entry -Force

# Write back
$heartbeat | ConvertTo-Json -Depth 5 | Set-Content $heartbeatPath -Encoding utf8

# Output for confirmation
Write-Host "[$Role] Heartbeat updated: $Status" -ForegroundColor Green
$entry | Format-Table -AutoSize
