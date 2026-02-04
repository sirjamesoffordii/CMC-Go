<#
.SYNOPSIS
  Safely read and validate the AEOS heartbeat file.

.DESCRIPTION
  Reads heartbeat.json with validation to handle corruption gracefully.
  Returns a PSObject with agent heartbeat data, or empty object if corrupted/missing.

.PARAMETER HeartbeatPath
  Path to heartbeat.json. Defaults to .github/agents/heartbeat.json

.OUTPUTS
  PSObject with PE, TL, SE entries (each with ts, status, and optional fields)

.EXAMPLE
  $hb = .\scripts\read-heartbeat.ps1
  if ($hb.TL) { Write-Host "TL last seen: $($hb.TL.ts)" }

.EXAMPLE
  # Check if TL is stale
  $hb = .\scripts\read-heartbeat.ps1
  $tlTs = [DateTime]::Parse($hb.TL.ts)
  $staleMin = ((Get-Date).ToUniversalTime() - $tlTs).TotalMinutes
  if ($staleMin -gt 6) { Write-Host "TL is stale!" }
#>

[CmdletBinding()]
param(
    [string]$HeartbeatPath
)

function Get-AeosCoordDir {
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
    $commonDirRel = (& git -C $repoRoot rev-parse --git-common-dir 2>$null)
    if (-not $commonDirRel) {
        return (Join-Path $repoRoot ".github" "agents")
    }

    $commonDirPath = (Resolve-Path (Join-Path $repoRoot $commonDirRel)).Path
    return (Join-Path $commonDirPath "aeos")
}

# Resolve path
if (-not $HeartbeatPath) {
    $coordDir = Get-AeosCoordDir
    $HeartbeatPath = Join-Path $coordDir "heartbeat.json"
}

function Read-HeartbeatSafe {
    param([string]$Path)
    
    # Check file exists
    if (-not (Test-Path $Path)) {
        Write-Verbose "No heartbeat file at $Path"
        return [PSCustomObject]@{}
    }
    
    try {
        $content = Get-Content $Path -Raw -ErrorAction Stop
        
        # Validate not empty
        if ([string]::IsNullOrWhiteSpace($content)) {
            Write-Warning "Heartbeat file empty - treating as no agents"
            return [PSCustomObject]@{}
        }
        
        # Parse JSON
        $hb = $content | ConvertFrom-Json -ErrorAction Stop
        
        # Validate structure - each entry must have 'ts' field with valid ISO-8601
        foreach ($role in @('PE', 'TL', 'SE')) {
            if ($hb.$role) {
                # Check ts field exists
                if (-not $hb.$role.ts) {
                    Write-Warning "Heartbeat.$role missing 'ts' field - ignoring entry"
                    $hb.PSObject.Properties.Remove($role)
                    continue
                }
                
                # Validate ts is parseable
                try {
                    [DateTime]::Parse($hb.$role.ts) | Out-Null
                }
                catch {
                    Write-Warning "Heartbeat.$role.ts not valid datetime: $($hb.$role.ts) - ignoring entry"
                    $hb.PSObject.Properties.Remove($role)
                    continue
                }
                
                # Check status field exists
                if (-not $hb.$role.status) {
                    Write-Warning "Heartbeat.$role missing 'status' field - setting to 'unknown'"
                    $hb.$role | Add-Member -NotePropertyName 'status' -NotePropertyValue 'unknown' -Force
                }
            }
        }
        
        return $hb
    }
    catch {
        Write-Warning "Heartbeat JSON corrupted: $($_.Exception.Message)"
        
        # Backup corrupted file for debugging
        $timestamp = Get-Date -Format 'yyyyMMddHHmmss'
        $backupPath = "$Path.corrupted.$timestamp"
        
        try {
            Move-Item $Path $backupPath -ErrorAction Stop
            Write-Warning "Backed up corrupted heartbeat to: $backupPath"
        }
        catch {
            Write-Warning "Could not backup corrupted file: $($_.Exception.Message)"
        }
        
        return [PSCustomObject]@{}
    }
}

# Execute and return
Read-HeartbeatSafe -Path $HeartbeatPath
