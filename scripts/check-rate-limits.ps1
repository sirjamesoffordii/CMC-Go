<#
.SYNOPSIS
  Check GitHub API rate limits before spawning agents.

.DESCRIPTION
  Returns a simple go/wait/stop signal based on current API quota.
  TL should run this before spawning an SE.

.OUTPUTS
  PSObject with:
    - status: "go" | "wait" | "stop"
    - graphql: remaining/limit
    - core: remaining/limit
    - resetIn: minutes until reset
    - message: human-readable summary

.EXAMPLE
  $check = .\scripts\check-rate-limits.ps1
  if ($check.status -eq "go") { .\scripts\spawn-worktree-agent.ps1 -IssueNumber 42 }
#>

[CmdletBinding()]
param()

# Thresholds
$GraphQLMin = 500   # Need at least 500 GraphQL calls (board ops, issue fetches)
$CoreMin = 200      # Need at least 200 REST calls (PR ops, file fetches)

try {
    $limits = gh api rate_limit | ConvertFrom-Json
    
    $graphql = $limits.resources.graphql
    $core = $limits.resources.core
    
    # Calculate time until reset
    $resetTime = [DateTimeOffset]::FromUnixTimeSeconds($graphql.reset).LocalDateTime
    $resetIn = [math]::Ceiling(($resetTime - (Get-Date)).TotalMinutes)
    
    # Determine status
    $status = "go"
    $message = "Rate limits OK"
    
    if ($graphql.remaining -lt $GraphQLMin) {
        if ($graphql.remaining -lt 100) {
            $status = "stop"
            $message = "CRITICAL: GraphQL quota exhausted ($($graphql.remaining) remaining). Wait $resetIn min."
        } else {
            $status = "wait"
            $message = "LOW: GraphQL at $($graphql.remaining)/$($graphql.limit). Reset in $resetIn min."
        }
    } elseif ($core.remaining -lt $CoreMin) {
        $status = "wait"
        $message = "LOW: Core API at $($core.remaining)/$($core.limit). Reset in $resetIn min."
    }
    
    # Output
    [PSCustomObject]@{
        status = $status
        graphql = "$($graphql.remaining)/$($graphql.limit)"
        core = "$($core.remaining)/$($core.limit)"
        resetIn = $resetIn
        message = $message
        timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
    
} catch {
    [PSCustomObject]@{
        status = "stop"
        graphql = "unknown"
        core = "unknown"
        resetIn = 60
        message = "ERROR: Could not check rate limits - $($_.Exception.Message)"
        timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
}
