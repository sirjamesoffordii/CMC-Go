<#
.SYNOPSIS
  Bootstrap AEOS by spawning the Principal Engineer agent.

.DESCRIPTION
  - Checks GitHub API rate limits (prevents wasting quota)
  - Loads the Principal Engineer prompt from .github/prompts/principal-engineer.prompt.md
  - Strips YAML frontmatter
  - Starts a fresh Copilot chat agent session using `code chat`

.EXAMPLE
  .\scripts\aeos-start-pe.ps1
#>

[CmdletBinding()]
param(
    [string]$PromptFile = (Join-Path $PSScriptRoot ".." ".github" "prompts" "principal-engineer.prompt.md"),
    [switch]$SkipRateLimitCheck
)

$ErrorActionPreference = 'Stop'

function Get-PromptBody {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        throw "Prompt file not found: $Path"
    }

    $raw = Get-Content $Path -Raw -ErrorAction Stop

    # Strip YAML frontmatter if present
    if ($raw -match "(?s)^---\s*\r?\n.*?\r?\n---\s*\r?\n") {
        $raw = [regex]::Replace($raw, "(?s)^---\s*\r?\n.*?\r?\n---\s*\r?\n", "")
    }

    return $raw.Trim()
}

Write-Host 'Starting AEOS...' -ForegroundColor Cyan
Write-Host ''

if (-not $SkipRateLimitCheck) {
    $rateCheck = .\scripts\check-rate-limits.ps1
    if ($rateCheck.status -eq 'stop') {
        Write-Host "Rate limit critical: $($rateCheck.message)" -ForegroundColor Red
        exit 1
    }

    Write-Host "Rate limits: $($rateCheck.graphql) GraphQL, $($rateCheck.core) REST" -ForegroundColor Green
    Write-Host ''
}

$prompt = Get-PromptBody -Path $PromptFile

Write-Host 'Spawning Principal Engineer...' -ForegroundColor Yellow
code chat -r -m 'Principal Engineer' -a AGENTS.md $prompt
