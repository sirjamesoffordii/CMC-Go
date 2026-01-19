param(
  # GitHub repo in owner/name format. If omitted, derived from `git remote get-url origin`.
  [string]$Repo
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$sec = Read-Host 'Paste GitHub token (hidden)' -AsSecureString
if (-not $sec) {
  throw 'No token provided.'
}

$token = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
)

$args = @('-NoProfile','-File','scripts/create-agent-issues.ps1','-Mode','rest','-Token',$token)
if ($Repo) { $args += @('-Repo',$Repo) }

powershell @args
