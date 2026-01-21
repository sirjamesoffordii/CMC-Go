[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('alpha-tech-lead','software-engineer-agent')]
  [string]$Account,

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$GhArgs
)

$ErrorActionPreference = 'Stop'

$base = $env:USERPROFILE
$map = @{
  'alpha-tech-lead' = Join-Path $base '.gh-alpha-tech-lead'
  'software-engineer-agent' = Join-Path $base '.gh-software-engineer-agent'
}

$env:GH_CONFIG_DIR = $map[$Account]
$env:GH_PAGER = 'cat'

& gh @GhArgs
exit $LASTEXITCODE
