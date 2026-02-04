[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('principal-engineer-agent','tech-lead-agent','software-engineer-agent')]
  [string]$Account
)

$ErrorActionPreference = 'Stop'

$base = $env:USERPROFILE
$configDirs = @{
  'principal-engineer-agent' = Join-Path $base '.gh-principal-engineer-agent'
  'tech-lead-agent' = Join-Path $base '.gh-tech-lead-agent'
  'software-engineer-agent' = Join-Path $base '.gh-software-engineer-agent'
}
$configDir = $configDirs[$Account]

$env:GH_CONFIG_DIR = $configDir
$env:GH_PAGER = 'cat'

Write-Host "Using GH_CONFIG_DIR=$configDir" -ForegroundColor Cyan
Write-Host "A browser/device flow will open; sign in as $Account" -ForegroundColor Cyan

& gh auth login -h github.com -p https --web
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& gh auth status -h github.com
exit $LASTEXITCODE
