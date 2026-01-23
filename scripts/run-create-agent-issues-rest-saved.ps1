param(
  # GitHub repo in owner/name format. If omitted, derived from `git remote get-url origin`.
  [string]$Repo
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$path = Join-Path (Join-Path $env:LOCALAPPDATA 'CMC-Go') 'github_token.dpapi'
if (-not (Test-Path -LiteralPath $path)) {
  throw "No saved token found at $path. Run scripts/setup-github-token.ps1 first."
}

$encoded = Get-Content -LiteralPath $path -Raw
$sec = $encoded | ConvertTo-SecureString
$token = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
)

$args = @('-NoProfile','-File','scripts/create-agent-issues.ps1','-Mode','rest','-Token',$token)
if ($Repo) { $args += @('-Repo',$Repo) }

powershell @args
