param(
    [int]$PollIntervalSeconds = 30,
    [int]$DurationSeconds = 0,
    [switch]$KeepDisplayOn
)

$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class SleepUtil {
    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern uint SetThreadExecutionState(uint esFlags);
}
"@

$ES_CONTINUOUS = [uint32]2147483648
$ES_SYSTEM_REQUIRED = [uint32]1
$ES_DISPLAY_REQUIRED = [uint32]2

$flags = ($ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED)
if ($KeepDisplayOn) {
    $flags = $flags -bor $ES_DISPLAY_REQUIRED
}

Write-Host "Keeping Windows awake while VS Code is running..." -ForegroundColor Cyan
Write-Host "- Poll interval: $PollIntervalSeconds seconds"
if ($DurationSeconds -gt 0) {
    Write-Host "- Duration: $DurationSeconds seconds"
}
Write-Host "- Keep display on: $($KeepDisplayOn.IsPresent)"
Write-Host "Terminate this VS Code task to stop." -ForegroundColor DarkGray

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

$exitReason = "unknown"

while ($true) {
    $vsCode = Get-Process -Name "Code" -ErrorAction SilentlyContinue

    if (-not $vsCode) {
        $exitReason = "vscode_not_detected"
        break
    }

    if ($DurationSeconds -gt 0 -and $stopwatch.Elapsed.TotalSeconds -ge $DurationSeconds) {
        $exitReason = "duration_elapsed"
        break
    }

    [void][SleepUtil]::SetThreadExecutionState([uint32]$flags)
    Start-Sleep -Seconds $PollIntervalSeconds
}

# Clear the continuous request on exit
[void][SleepUtil]::SetThreadExecutionState([uint32]$ES_CONTINUOUS)
if ($exitReason -eq "duration_elapsed") {
    Write-Host "Duration elapsed. Allowing normal sleep behavior." -ForegroundColor Yellow
} elseif ($exitReason -eq "vscode_not_detected") {
    Write-Host "VS Code not detected. Allowing normal sleep behavior." -ForegroundColor Yellow
} else {
    Write-Host "Stopped. Allowing normal sleep behavior." -ForegroundColor Yellow
}
