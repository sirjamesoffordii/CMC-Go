[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('alpha-tech-lead','software-engineer-agent')]
  [string]$Account
)

$ErrorActionPreference = 'Stop'

$base = $env:USERPROFILE
$configDir = if ($Account -eq 'alpha-tech-lead') {
  Join-Path $base '.gh-alpha-tech-lead'
} else {
  Join-Path $base '.gh-software-engineer-agent'
}

$env:GH_CONFIG_DIR = $configDir
$env:GH_PAGER = 'cat'

Write-Host "Using GH_CONFIG_DIR=$configDir" -ForegroundColor Cyan
Write-Host "A browser/device flow will open; sign in as $Account" -ForegroundColor Cyan

& gh auth login -h github.com -p https --web
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& gh auth status -h github.com
exit $LASTEXITCODE
