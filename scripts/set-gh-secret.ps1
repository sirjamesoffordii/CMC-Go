[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('COPILOT_ASSIGN_TOKEN_TL','COPILOT_ASSIGN_TOKEN_SWE')]
  [string]$SecretName
)

$ErrorActionPreference = 'Stop'

Write-Host "Paste the token for $SecretName and press Enter:" -ForegroundColor Cyan
$token = Read-Host

$repo = 'sirjamesoffordii/CMC-Go'

$env:GH_PAGER = 'cat'

& gh secret set $SecretName --body $token --repo $repo
if ($LASTEXITCODE -eq 0) {
  Write-Host "Secret $SecretName set successfully." -ForegroundColor Green
} else {
  Write-Host "Failed to set secret $SecretName." -ForegroundColor Red
  exit $LASTEXITCODE
}
