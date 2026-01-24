<#
.SYNOPSIS
  Spawn a GitHub Copilot coding agent task (non-blocking).

.DESCRIPTION
  This script uses 'gh agent-task create' to spawn a cloud-based Copilot agent.
  The agent works asynchronously - the script returns immediately with a session ID.
  
  This enables true parallel agent execution without blocking the primary session.

.PARAMETER Prompt
  The task description/prompt for the agent.

.PARAMETER IssueNumber
  GitHub Issue number to reference (optional). If provided, creates a prompt
  that references the issue.

.PARAMETER BaseBranch
  Branch to base the work on (defaults to staging).

.PARAMETER CustomAgent
  Custom agent to use (e.g., 'swe' for .github/agents/swe.md).

.PARAMETER Follow
  If specified, follow the agent's logs in real-time (blocking).

.PARAMETER Repo
  Repository in owner/repo format. Defaults to current repo.

.EXAMPLE
  # Spawn agent with direct prompt
  .\spawn-cloud-agent.ps1 -Prompt "Add unit tests for the auth module"

.EXAMPLE
  # Spawn agent for a specific issue
  .\spawn-cloud-agent.ps1 -IssueNumber 42

.EXAMPLE
  # Spawn and follow logs
  .\spawn-cloud-agent.ps1 -IssueNumber 42 -Follow

.EXAMPLE
  # Spawn multiple agents in parallel (non-blocking)
  42, 43, 44 | ForEach-Object { .\spawn-cloud-agent.ps1 -IssueNumber $_ }
#>

[CmdletBinding()]
param(
  [Parameter(ParameterSetName = 'Prompt')]
  [string]$Prompt,

  [Parameter(ParameterSetName = 'Issue')]
  [int]$IssueNumber,

  [string]$BaseBranch = 'staging',

  [string]$CustomAgent,

  [switch]$Follow,

  [string]$Repo
)

$ErrorActionPreference = 'Stop'

# Determine repository
if (-not $Repo) {
  $Repo = gh repo view --json nameWithOwner -q '.nameWithOwner' 2>$null
  if (-not $Repo) {
    Write-Error "Could not determine repository. Specify -Repo owner/repo"
    exit 1
  }
}

# Build prompt if issue number provided
if ($IssueNumber) {
  $Prompt = @"
You are working on Issue #$IssueNumber in $Repo.

Instructions:
1. Read the issue: gh issue view $IssueNumber
2. Understand the acceptance criteria
3. Implement the smallest diff that satisfies requirements
4. Run verification: pnpm check && pnpm test
5. Open a PR targeting 'staging' branch

Reference AGENTS.md and .github/copilot-instructions.md for project conventions.
Include 'Closes #$IssueNumber' in PR description.
"@
}

if (-not $Prompt) {
  Write-Error "Either -Prompt or -IssueNumber is required"
  exit 1
}

# Build command arguments
$args = @('agent-task', 'create', $Prompt)
$args += @('--repo', $Repo)
$args += @('--base', $BaseBranch)

if ($CustomAgent) {
  $args += @('--custom-agent', $CustomAgent)
}

if ($Follow) {
  $args += '--follow'
}

Write-Host "=== Spawning Cloud Agent ===" -ForegroundColor Cyan
Write-Host "Repository: $Repo"
Write-Host "Base branch: $BaseBranch"
if ($IssueNumber) { Write-Host "Issue: #$IssueNumber" }
if ($CustomAgent) { Write-Host "Custom agent: $CustomAgent" }
Write-Host "Follow: $Follow"
Write-Host ""

# Execute
Write-Host "Running: gh $($args -join ' ')" -ForegroundColor DarkGray
Write-Host ""

& gh @args

if ($LASTEXITCODE -eq 0 -and -not $Follow) {
  Write-Host ""
  Write-Host "Agent spawned successfully! It will work asynchronously in the cloud." -ForegroundColor Green
  Write-Host "Monitor progress with: gh agent-task list" -ForegroundColor Yellow
}
