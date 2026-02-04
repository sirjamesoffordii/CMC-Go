[CmdletBinding()]
param(
	[Parameter(Mandatory = $true)]
	[string]$Pattern,

	[Parameter(Mandatory = $false)]
	[string]$Path = ".",

	[switch]$CaseInsensitive,
	[switch]$Regex
)

$ErrorActionPreference = "Stop"

$repoRoot = (git rev-parse --show-toplevel 2>$null)
if (-not $repoRoot) {
	throw "Not in a git repository. Run from within the repo root."
}

Set-Location $repoRoot

$gitArgs = @("ls-files", "--", $Path)
$files = git @gitArgs

if (-not $files -or $files.Count -eq 0) {
	Write-Error "No tracked files under path '$Path'."
	exit 1
}

$selectArgs = @(
	"-Path", $files,
	"-Pattern", $Pattern
)

if ($CaseInsensitive) {
	$selectArgs += "-CaseSensitive"
	$selectArgs += $false
}

if (-not $Regex) {
	$selectArgs += "-SimpleMatch"
}

Select-String @selectArgs
