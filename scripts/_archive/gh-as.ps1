[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('principal-engineer-agent','tech-lead-agent','software-engineer-agent')]
  [string]$Account,

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$GhArgs
)

$ErrorActionPreference = 'Stop'

$base = $env:USERPROFILE
$map = @{
  'principal-engineer-agent' = Join-Path $base '.gh-principal-engineer-agent'
  'tech-lead-agent' = Join-Path $base '.gh-tech-lead-agent'
  'software-engineer-agent' = Join-Path $base '.gh-software-engineer-agent'
}

$env:GH_CONFIG_DIR = $map[$Account]
$env:GH_PAGER = 'cat'

& gh @GhArgs
exit $LASTEXITCODE
