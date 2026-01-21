[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ConfigDir,

  [string]$Host = 'github.com',

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $ConfigDir)) {
  New-Item -ItemType Directory -Force -Path $ConfigDir | Out-Null
}

$stdin = [Console]::In.ReadToEnd()

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = 'gh'
$psi.Arguments = ('auth git-credential -h ' + $Host + ' ' + ($Args -join ' ')).Trim()
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$psi.EnvironmentVariables['GH_CONFIG_DIR'] = $ConfigDir
$psi.EnvironmentVariables['GH_PAGER'] = 'cat'

$p = New-Object System.Diagnostics.Process
$p.StartInfo = $psi
$null = $p.Start()

if ($stdin) {
  $p.StandardInput.Write($stdin)
}
$p.StandardInput.Close()

$out = $p.StandardOutput.ReadToEnd()
$err = $p.StandardError.ReadToEnd()
$p.WaitForExit()

if ($out) { [Console]::Out.Write($out) }
if ($err) { [Console]::Error.Write($err) }

exit $p.ExitCode
