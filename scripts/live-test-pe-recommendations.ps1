<#
.SYNOPSIS
  Live test runner: spawns a NEW Principal Engineer chat session constrained to recommendations-only.

.DESCRIPTION
  Starts a NEW VS Code Copilot Chat session (no -r reuse) in Principal Engineer mode,
  attaching AGENTS.md and the recommendations-only prompt file.

  The script waits for a configurable duration (default: 2 hours) and writes a
  timestamped log file capturing the spawn configuration (and any CLI output).

.PARAMETER DurationMinutes
  How long to allow the session to run before attempting to stop it. Default: 120.

.PARAMETER LogDir
  Directory to write logs into. Default: .\test-results\pe-recommendations-only

.PARAMETER PromptPath
  Path to the recommendations-only prompt file. Default:
  .github\prompts\pe-recommendations-only.prompt.md

.EXAMPLE
  .\scripts\live-test-pe-recommendations.ps1

.EXAMPLE
  # Run for 30 minutes
  .\scripts\live-test-pe-recommendations.ps1 -DurationMinutes 30
#>

[CmdletBinding()]
param(
  [int]$DurationMinutes = 120,
  [string]$LogDir = '.\\test-results\\pe-recommendations-only',
  [string]$PromptPath = '.github\\prompts\\pe-recommendations-only.prompt.md'
)

$ErrorActionPreference = 'Stop'

if ($DurationMinutes -lt 1) {
  throw 'DurationMinutes must be >= 1'
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot

$agentsPath = Join-Path $repoRoot 'AGENTS.md'
if (-not (Test-Path -LiteralPath $agentsPath)) {
  throw "AGENTS.md not found at repo root: $agentsPath"
}

$promptFullPath = Join-Path $repoRoot $PromptPath
if (-not (Test-Path -LiteralPath $promptFullPath)) {
  throw "Prompt file not found: $promptFullPath"
}

if (-not (Test-Path -LiteralPath $LogDir)) {
  New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stdoutLog = Join-Path $LogDir "live-test-pe-recommendations-$timestamp.log"
$stderrLog = Join-Path $LogDir "live-test-pe-recommendations-$timestamp.stderr.log"

Write-Host '============================================' -ForegroundColor Cyan
Write-Host '   Live Test — PE Recommendations Only' -ForegroundColor Cyan
Write-Host '============================================' -ForegroundColor Cyan
Write-Host "Repo: $repoRoot" -ForegroundColor Gray
Write-Host "Prompt: $PromptPath" -ForegroundColor Gray
Write-Host "Duration: $DurationMinutes minute(s)" -ForegroundColor Gray
Write-Host "Log (stdout): $stdoutLog" -ForegroundColor Yellow
Write-Host "Log (stderr): $stderrLog" -ForegroundColor Yellow
Write-Host ''

$header = @(
  "[$(Get-Date -Format o)] Starting PE recommendations-only live test",
  "Repo: $repoRoot",
  "Prompt: $PromptPath",
  "DurationMinutes: $DurationMinutes",
  ''
)
$header | Out-File -FilePath $stdoutLog -Encoding utf8

$seedPrompt = @"
Follow instructions in the attached prompt file: $PromptPath

You are PE-1.

Start now.
"@

Write-Host 'Spawning PE chat session (no -r reuse)...' -ForegroundColor Cyan

$proc = Start-Process -FilePath 'code' -ArgumentList @(
  'chat',
  '-m', 'principal-engineer',
  '-a', 'AGENTS.md',
  '-a', $PromptPath,
  $seedPrompt
) -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -PassThru

Write-Host "Started process id: $($proc.Id)" -ForegroundColor Gray
Write-Host "Waiting up to $DurationMinutes minute(s)..." -ForegroundColor Gray

$timeoutSeconds = $DurationMinutes * 60
Wait-Process -Id $proc.Id -Timeout $timeoutSeconds

try { $proc.Refresh() } catch { }

if (-not $proc.HasExited) {
  Write-Host "Time limit reached; stopping process $($proc.Id)..." -ForegroundColor Yellow

  try { $null = $proc.CloseMainWindow() } catch { }
  Start-Sleep -Seconds 5

  try { $proc.Refresh() } catch { }
  if (-not $proc.HasExited) {
    Stop-Process -Id $proc.Id -Force
  }

  Write-Host 'Stopped.' -ForegroundColor Green
} else {
  Write-Host "Process exited early with code $($proc.ExitCode)." -ForegroundColor Green
}

"[$(Get-Date -Format o)] Finished" | Add-Content -Path $stdoutLog -Encoding utf8

Write-Host ''
Write-Host 'Logs written:' -ForegroundColor Cyan
Write-Host "  $stdoutLog" -ForegroundColor Gray
Write-Host "  $stderrLog" -ForegroundColor Gray
