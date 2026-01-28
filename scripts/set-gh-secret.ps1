[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$SecretName
)

$ErrorActionPreference = 'Stop'

Write-Host "Paste the secret value for $SecretName and press Enter:" -ForegroundColor Cyan
$secretValueSecure = Read-Host -AsSecureString

$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretValueSecure)
try {
  $secretValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

$repo = 'sirjamesoffordii/CMC-Go'

$env:GH_PAGER = 'cat'

& gh secret set $SecretName --body $secretValue --repo $repo
if ($LASTEXITCODE -eq 0) {
  Write-Host "Secret $SecretName set successfully." -ForegroundColor Green
} else {
  Write-Host "Failed to set secret $SecretName." -ForegroundColor Red
  exit $LASTEXITCODE
}
