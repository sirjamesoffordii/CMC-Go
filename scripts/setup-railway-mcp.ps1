# Prompts for a Railway token and stores it in the user environment (no repo changes).
# Usage: .\scripts\setup-railway-mcp.ps1

$secureToken = Read-Host "Enter your Railway token" -AsSecureString
if (-not $secureToken) {
    Write-Host "No token provided. Aborting." -ForegroundColor Yellow
    exit 1
}

$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
try {
    $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "Token was empty. Aborting." -ForegroundColor Yellow
    exit 1
}

[Environment]::SetEnvironmentVariable("RAILWAY_TOKEN", $token, "User")
$env:RAILWAY_TOKEN = $token

Write-Host "RAILWAY_TOKEN set for current session and user profile." -ForegroundColor Green
Write-Host "Restart VS Code to ensure MCP picks up the updated environment." -ForegroundColor Cyan
