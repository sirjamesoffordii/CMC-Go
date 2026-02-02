<#
.SYNOPSIS
  Merge-safe heartbeat updater for .github/agents/heartbeat.json.

.DESCRIPTION
  Updates ONLY the specified agent entry (and timestamp) while preserving all other agents.
  This prevents clobbering other agents when multiple sessions update heartbeat concurrently.

.PARAMETER AgentKey
  Agent id key (e.g., PE-1, TL-1, SE-1).

.PARAMETER Status
  Status string (e.g., implementing, testing, pushing, completed).

.PARAMETER Issue
  Optional issue number.

.PARAMETER Workspace
  Optional absolute path to worktree.

.PARAMETER Branch
  Optional git branch name.

.PARAMETER HeartbeatPath
  Path to heartbeat file (defaults to .github/agents/heartbeat.json).

.PARAMETER MutexName
  Named mutex used to serialize heartbeat updates across processes on the same machine.

.PARAMETER MutexTimeoutMs
  How long to wait to acquire the mutex before failing.
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$AgentKey,

  [Parameter(Mandatory = $true)]
  [string]$Status,

  [int]$Issue,

  [string]$Workspace,

  [string]$Branch,

  [string]$HeartbeatPath = ".github/agents/heartbeat.json",

  [string]$MutexName = "Global\\AEOS-Heartbeat",

  [int]$MutexTimeoutMs = 5000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$mutex = $null
$lockAcquired = $false
try {
  $mutex = [System.Threading.Mutex]::new($false, $MutexName)
  $lockAcquired = $mutex.WaitOne($MutexTimeoutMs)
  if (-not $lockAcquired) {
    throw "[AEOS] Failed to acquire heartbeat mutex '$MutexName' within ${MutexTimeoutMs}ms. Another agent may be stuck updating the heartbeat."
  }

  $ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

  # Ensure directory exists
  $hbDir = Split-Path -Parent $HeartbeatPath
  if ($hbDir -and -not (Test-Path $hbDir)) {
    New-Item -ItemType Directory -Path $hbDir -Force | Out-Null
  }

  $root = $null
  if (Test-Path $HeartbeatPath) {
    try {
      $root = Get-Content $HeartbeatPath -Raw | ConvertFrom-Json
    } catch {
      $root = $null
    }
  }

  if (-not $root) {
    $root = [pscustomobject]@{
      core = @()
      agents = [pscustomobject]@{}
    }
  }

  if (-not $root.PSObject.Properties.Name -contains 'agents' -or -not $root.agents) {
    $root | Add-Member -MemberType NoteProperty -Name agents -Value ([pscustomobject]@{}) -Force
  }

  $agentObj = [ordered]@{ ts = $ts; status = $Status }

  if ($PSBoundParameters.ContainsKey('Issue')) { $agentObj.issue = $Issue }
  if ($Workspace) { $agentObj.workspace = $Workspace }
  if ($Branch) { $agentObj.branch = $Branch }

  # Overwrite only this agent key
  $root.agents | Add-Member -MemberType NoteProperty -Name $AgentKey -Value ([pscustomobject]$agentObj) -Force

  # Atomic write: write to a temp file then replace
  $json = $root | ConvertTo-Json -Depth 10
  $tmpPath = "${HeartbeatPath}.tmp.${PID}"
  $json | Out-File -FilePath $tmpPath -Encoding utf8
  Move-Item -Path $tmpPath -Destination $HeartbeatPath -Force

  Write-Host "[AEOS] Heartbeat updated: $AgentKey ($Status) @ $ts" -ForegroundColor Green
} finally {
  if ($lockAcquired -and $mutex) {
    $mutex.ReleaseMutex()
  }
  if ($mutex) {
    $mutex.Dispose()
  }
}
