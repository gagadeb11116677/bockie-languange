# install-bockie.ps1
# Bockie v2.0.0 Windows Installer (build from source)
# Run: powershell -ExecutionPolicy Bypass -File install-bockie.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "  Bockie v2.0.0 - Windows Installer (from source)" -ForegroundColor Cyan
Write-Host "  Created by xobe" -ForegroundColor Gray
Write-Host ""
Write-Host ("=" * 50)

$installDir = "$env:USERPROFILE\bockie"
$vscodeExtDir = "$env:USERPROFILE\.vscode\extensions\bockie-1.0.0"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Step 1: Check Node.js
Write-Host ""
Write-Host "[1/6] Checking Node.js installation..." -ForegroundColor Cyan
$nodeVersion = $null
try { $nodeVersion = (node --version 2>$null) } catch {}
if (-not $nodeVersion) {
    Write-Host "  [-] Node.js is not installed!" -ForegroundColor Red
    Write-Host "      Download from: https://nodejs.org/ (LTS version)" -ForegroundColor Yellow
    Write-Host "      After install, restart PowerShell and re-run this script." -ForegroundColor Yellow
    exit 1
}
Write-Host "  [+] Node.js installed: $nodeVersion" -ForegroundColor Green

# Step 2: Create directory
Write-Host ""
Write-Host "[2/6] Creating install directory: $installDir" -ForegroundColor Cyan
if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
    Write-Host "  [+] Created" -ForegroundColor Green
} else {
    Write-Host "  [i] Already exists" -ForegroundColor Yellow
}

# Step 3: Copy source code
Write-Host ""
Write-Host "[3/6] Copying source code..." -ForegroundColor Cyan
$dirsToCopy = @("src", "examples", "vscode-extension")
$filesToCopy = @("package.json", "tsconfig.json", "LICENSE", "README.md")

foreach ($dir in $dirsToCopy) {
    $srcPath = Join-Path $scriptDir $dir
    if (Test-Path $srcPath) {
        $dstPath = Join-Path $installDir $dir
        if (Test-Path $dstPath) { Remove-Item -Recurse -Force $dstPath }
        Copy-Item -Path $srcPath -Destination $installDir -Recurse -Force
        Write-Host "  [+] Copied: $dir/" -ForegroundColor Green
    }
}

foreach ($file in $filesToCopy) {
    $srcFile = Join-Path $scriptDir $file
    if (Test-Path $srcFile) {
        Copy-Item -Path $srcFile -Destination $installDir -Force
        Write-Host "  [+] Copied: $file" -ForegroundColor Green
    }
}

# Step 4: npm install
Write-Host ""
Write-Host "[4/6] Installing npm dependencies (this takes a minute)..." -ForegroundColor Cyan
Push-Location $installDir
try {
    $npmResult = & npm install 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [-] npm install failed!" -ForegroundColor Red
        Write-Host $npmResult -ForegroundColor Yellow
        exit 1
    }
    Write-Host "  [+] Dependencies installed" -ForegroundColor Green
} finally {
    Pop-Location
}

# Step 5: Build
Write-Host ""
Write-Host "[5/6] Building TypeScript to dist/..." -ForegroundColor Cyan
Push-Location $installDir
try {
    $buildResult = & npm run build 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [-] Build failed!" -ForegroundColor Red
        Write-Host $buildResult -ForegroundColor Yellow
        exit 1
    }
    Write-Host "  [+] Build successful" -ForegroundColor Green
} finally {
    Pop-Location
}

# Step 6: Setup PATH + VSCode
Write-Host ""
Write-Host "[6/6] Setting up PATH & VSCode extension..." -ForegroundColor Cyan

# Create bockie.bat
$batContent = @"
@echo off
node "$installDir\dist\index.js" %*
"@
Set-Content -Path "$installDir\bockie.bat" -Value $batContent -Encoding ASCII

# Add to PATH
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$installDir*") {
    $newPath = if ($userPath) { "$userPath;$installDir" } else { $installDir }
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "  [+] Added $installDir to user PATH" -ForegroundColor Green
    $env:Path += ";$installDir"
} else {
    Write-Host "  [i] $installDir already in PATH" -ForegroundColor Yellow
}

# Install VSCode extension
$vscodeExtSrc = Join-Path $scriptDir "vscode-extension"
if (Test-Path $vscodeExtSrc) {
    if (-not (Test-Path $vscodeExtDir)) {
        New-Item -ItemType Directory -Path $vscodeExtDir -Force | Out-Null
    }
    Copy-Item -Path "$vscodeExtSrc\*" -Destination $vscodeExtDir -Recurse -Force
    Write-Host "  [+] Installed VSCode extension" -ForegroundColor Green
} else {
    Write-Host "  [i] vscode-extension folder not found, skipping" -ForegroundColor Yellow
}

# Test
Write-Host ""
Write-Host "Testing..." -ForegroundColor Cyan
$bockieBat = "$installDir\bockie.bat"
if (Test-Path $bockieBat) {
    & cmd /c $bockieBat --version
}

Write-Host ""
Write-Host ("=" * 50) -ForegroundColor Green
Write-Host "  [+] Installation successful!" -ForegroundColor Green
Write-Host ("=" * 50) -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Restart PowerShell (to reload PATH)"
Write-Host "  2. Test: bockie --version"
Write-Host "  3. Run: bockie run examples\hello.bckie"
Write-Host "  4. REPL: bockie"
Write-Host ""
Write-Host "To use in VSCode:" -ForegroundColor Cyan
Write-Host "  1. Restart VSCode"
Write-Host "  2. Open any .bckie file"
Write-Host "  3. Syntax highlighting active!"
Write-Host ""
Write-Host "Quick test:" -ForegroundColor Cyan
Write-Host '  bockie -e "print(\"Hello from Bockie on Windows!\")"'
Write-Host ""
Write-Host "Created by xobe" -ForegroundColor Gray
Write-Host ""
