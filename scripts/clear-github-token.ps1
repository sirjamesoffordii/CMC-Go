param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$path = Join-Path (Join-Path $env:LOCALAPPDATA 'CMC-Go') 'github_token.dpapi'

if (Test-Path -LiteralPath $path) {
  Remove-Item -LiteralPath $path -Force
  Write-Host "Removed: $path" -ForegroundColor Yellow
} else {
  Write-Host "No stored token found at: $path" -ForegroundColor DarkGray
}
