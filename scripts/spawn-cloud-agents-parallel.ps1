<#
.SYNOPSIS
  Spawn multiple GitHub Copilot coding agents in parallel (non-blocking).

.DESCRIPTION
  Uses PowerShell jobs to spawn multiple cloud agents simultaneously.
  Each agent works asynchronously - this script returns almost immediately.

.PARAMETER IssueNumbers
  Array of GitHub issue numbers to spawn agents for.

.PARAMETER Prompts
  Array of prompts to spawn agents for (alternative to IssueNumbers).

.PARAMETER BaseBranch
  Branch to base work on (defaults to staging).

.PARAMETER MaxParallel
  Maximum number of parallel spawns (defaults to 5).

.PARAMETER WaitForSpawn
  If specified, wait for all spawn commands to complete (not agent completion).

.EXAMPLE
  # Spawn agents for multiple issues
  .\spawn-cloud-agents-parallel.ps1 -IssueNumbers 42, 43, 44

.EXAMPLE
  # Spawn with custom prompts
  .\spawn-cloud-agents-parallel.ps1 -Prompts "Add tests", "Fix lint", "Update docs"

.EXAMPLE
  # Wait for spawns to complete
  .\spawn-cloud-agents-parallel.ps1 -IssueNumbers 42, 43 -WaitForSpawn
#>

[CmdletBinding()]
param(
  [Parameter(ParameterSetName = 'Issues', Mandatory)]
  [int[]]$IssueNumbers,

  [Parameter(ParameterSetName = 'Prompts', Mandatory)]
  [string[]]$Prompts,

  [string]$BaseBranch = 'staging',

  [int]$MaxParallel = 5,

  [switch]$WaitForSpawn
)

$ErrorActionPreference = 'Stop'

# Get repo
$Repo = gh repo view --json nameWithOwner -q '.nameWithOwner' 2>$null
if (-not $Repo) {
  Write-Error "Could not determine repository"
  exit 1
}

Write-Host "=== Parallel Cloud Agent Spawner ===" -ForegroundColor Cyan
Write-Host "Repository: $Repo"
Write-Host "Base branch: $BaseBranch"
Write-Host ""

# Build task list
$tasks = @()
if ($IssueNumbers) {
  foreach ($issue in $IssueNumbers) {
    $tasks += @{
      Id = "Issue-$issue"
      Prompt = @"
Work on Issue #$issue in $Repo.
Read the issue, implement the smallest diff, run 'pnpm check && pnpm test', open a PR targeting 'staging'.
Include 'Closes #$issue' in PR description.
"@
    }
  }
} else {
  $i = 1
  foreach ($prompt in $Prompts) {
    $tasks += @{
      Id = "Task-$i"
      Prompt = $prompt
    }
    $i++
  }
}

Write-Host "Spawning $($tasks.Count) agents..." -ForegroundColor Yellow
Write-Host ""

# Spawn jobs
$jobs = @()
$throttle = [System.Threading.Semaphore]::new($MaxParallel, $MaxParallel)

foreach ($task in $tasks) {
  $throttle.WaitOne() | Out-Null
  
  $job = Start-Job -ScriptBlock {
    param($prompt, $repo, $branch, $taskId)
    
    try {
      $result = gh agent-task create $prompt --repo $repo --base $branch 2>&1
      @{
        TaskId = $taskId
        Success = $LASTEXITCODE -eq 0
        Output = $result
      }
    } catch {
      @{
        TaskId = $taskId
        Success = $false
        Output = $_.Exception.Message
      }
    }
  } -ArgumentList $task.Prompt, $Repo, $BaseBranch, $task.Id

  $jobs += @{
    Job = $job
    TaskId = $task.Id
    Semaphore = $throttle
  }

  Write-Host "  Started: $($task.Id)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "All agents spawned!" -ForegroundColor Green

if ($WaitForSpawn) {
  Write-Host "Waiting for spawn commands to complete..." -ForegroundColor Yellow
  
  $results = @()
  foreach ($j in $jobs) {
    $result = Receive-Job -Job $j.Job -Wait -AutoRemoveJob
    $j.Semaphore.Release() | Out-Null
    $results += $result
    
    $status = if ($result.Success) { "OK" } else { "FAILED" }
    $color = if ($result.Success) { "Green" } else { "Red" }
    Write-Host "  $($result.TaskId): $status" -ForegroundColor $color
  }
  
  $succeeded = ($results | Where-Object { $_.Success }).Count
  Write-Host ""
  Write-Host "Summary: $succeeded/$($results.Count) agents spawned successfully" -ForegroundColor Cyan
} else {
  Write-Host ""
  Write-Host "Agents working asynchronously in GitHub cloud." -ForegroundColor Gray
  Write-Host "Monitor with: gh agent-task list" -ForegroundColor Yellow
  Write-Host "Jobs running in background. Use 'Get-Job | Receive-Job' to check spawn status." -ForegroundColor Yellow
}
