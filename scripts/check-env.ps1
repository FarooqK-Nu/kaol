Write-Host "=== KAOL Environment Pre-flight Check ===" -ForegroundColor Cyan

# 1. Git branch
$branch = git branch --show-current
Write-Host "Git Branch: $branch" -ForegroundColor Yellow

# 2. Bun
try {
    $bunVer = bun --version
    Write-Host "[OK] Bun: v$bunVer" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Bun is not installed!" -ForegroundColor Red
}

# 3. Python 3.11 Virtualenv
$venvPython = "services/ml-service/.venv/Scripts/python.exe"
if (Test-Path $venvPython) {
    $pyVer = & $venvPython -c "import sys; print(sys.version.split()[0])"
    Write-Host "[OK] ML Service Python: v$pyVer (3.11 Environment)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] ML Service Python .venv not found!" -ForegroundColor Red
}

# 4. Docker & Containers
try {
    $dockerVer = docker --version
    Write-Host "[OK] Docker CLI: $dockerVer" -ForegroundColor Green
    $psOut = docker compose ps --format json | ConvertFrom-Json
    foreach ($c in $psOut) {
        Write-Host "  -> Container $($c.Name): $($c.Status)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "[FAIL] Docker daemon is not reachable!" -ForegroundColor Red
}

Write-Host "=== Pre-flight Check Completed ===" -ForegroundColor Cyan
