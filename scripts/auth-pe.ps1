<#
.SYNOPSIS
  Authenticate GitHub CLI for Principal-Engineer-Agent (PE) using a PAT.
.DESCRIPTION
  Prompts securely (no echo) and logs into GitHub CLI using the PE GH_CONFIG_DIR.
  Does NOT print or store the token anywhere except where `gh` stores auth.

  Usage:
    .\scripts\auth-pe.ps1
#>

$ErrorActionPreference = 'Stop'

$env:GH_CONFIG_DIR = 'C:/Users/sirja/.gh-principal-engineer-agent'

Write-Host ''
Write-Host '=== PE GitHub Auth (Principal-Engineer-Agent) ===' -ForegroundColor Cyan
Write-Host 'Paste the PE PAT when prompted (input hidden), then press Enter.' -ForegroundColor DarkGray
Write-Host ''

# Read token securely and convert via PSCredential (more reliable than BSTR in VS Code terminals)
$secure = Read-Host -AsSecureString 'PE GitHub token'
$token = ([pscredential]::new('token', $secure)).GetNetworkCredential().Password

if (-not $token) {
  Write-Host 'No token entered. Aborting.' -ForegroundColor Yellow
  exit 1
}

# Clear any bad cached auth first (ignore errors)
try {
  gh auth logout -h github.com -u Principal-Engineer-Agent --yes | Out-Null
} catch {}

# Login with token via stdin
$token | gh auth login -h github.com -p https --with-token

Write-Host ''
Write-Host '✅ PE authenticated. Current status:' -ForegroundColor Green
gh auth status -h github.com
