# MCP Server Diagnostic Script
# Run this to verify MCP servers are properly installed and configured

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " MCP Server Diagnostic Report" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node.js
Write-Host "[Node.js]" -ForegroundColor Yellow
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "  ❌ Node.js not found!" -ForegroundColor Red
}
Write-Host ""

# 2. Check global npm path
Write-Host "[Global npm modules path]" -ForegroundColor Yellow
$npmPath = "$env:APPDATA\npm\node_modules"
Write-Host "  Path: $npmPath"
if (Test-Path $npmPath) {
    Write-Host "  ✅ Directory exists" -ForegroundColor Green
} else {
    Write-Host "  ❌ Directory missing!" -ForegroundColor Red
}
Write-Host ""

# 3. Check memory server
Write-Host "[Memory Server]" -ForegroundColor Yellow
$memoryPath = "$npmPath\@modelcontextprotocol\server-memory\dist\index.js"
Write-Host "  Expected: $memoryPath"
if (Test-Path $memoryPath) {
    Write-Host "  ✅ INSTALLED" -ForegroundColor Green
} else {
    Write-Host "  ❌ NOT INSTALLED" -ForegroundColor Red
    Write-Host "  Run: npm install -g @modelcontextprotocol/server-memory" -ForegroundColor Yellow
}
Write-Host ""

# 4. Check Railway server
Write-Host "[Railway Server]" -ForegroundColor Yellow
$railwayPath = "$npmPath\@railway\mcp-server\dist\index.js"
Write-Host "  Expected: $railwayPath"
if (Test-Path $railwayPath) {
    Write-Host "  ✅ INSTALLED" -ForegroundColor Green
} else {
    Write-Host "  ❌ NOT INSTALLED" -ForegroundColor Red
    Write-Host "  Run: npm install -g @railway/mcp-server" -ForegroundColor Yellow
}
Write-Host ""

# 5. Check RAILWAY_TOKEN
Write-Host "[RAILWAY_TOKEN]" -ForegroundColor Yellow
if ($env:RAILWAY_TOKEN) {
    $tokenLen = $env:RAILWAY_TOKEN.Length
    Write-Host "  ✅ Set in current session ($tokenLen chars)" -ForegroundColor Green
} else {
    Write-Host "  ⚠️ Not set in current session" -ForegroundColor Yellow
    # Check user environment
    $userToken = [System.Environment]::GetEnvironmentVariable("RAILWAY_TOKEN", "User")
    if ($userToken) {
        Write-Host "  ✅ Set in user environment ($($userToken.Length) chars)" -ForegroundColor Green
        Write-Host "  Note: VS Code may need restart to pick up" -ForegroundColor Yellow
    } else {
        Write-Host "  ❌ Not set in user environment" -ForegroundColor Red
    }
}
Write-Host ""

# 6. Check memory persistence file
Write-Host "[Memory Persistence]" -ForegroundColor Yellow
$memFile = "c:\Dev\CMC Go\.agent-memory\knowledge-graph.jsonl"
if (Test-Path $memFile) {
    $size = (Get-Item $memFile).Length
    Write-Host "  ✅ File exists ($size bytes)" -ForegroundColor Green
} else {
    Write-Host "  ⚠️ File not created yet (will be created on first use)" -ForegroundColor Yellow
}
Write-Host ""

# 7. Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " NEXT STEPS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. If any servers show NOT INSTALLED, run the install commands above"
Write-Host "2. Reload VS Code window (Ctrl+Shift+P -> 'Developer: Reload Window')"
Write-Host "3. Check MCP servers (Ctrl+Shift+P -> 'MCP: List Servers')"
Write-Host "4. If still failing, check Output panel -> 'Copilot Chat MCP Servers'"
Write-Host ""
