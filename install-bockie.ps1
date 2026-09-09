# install-bockie.ps1
# Bockie v2.0.0 Windows Installer (build from source)
# Run: powershell -ExecutionPolicy Bypass -File install-bockie.ps1

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "  Bockie v2.0.0 - Windows Installer (from source)" -ForegroundColor Cyan
Write-Host "  Created by xobe" -ForegroundColor Gray
Write-Host ""
Write-Host ("=" * 50)

$vscodeExtDir = "$env:USERPROFILE\.vscode\extensions\bockie-2.0.0"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Ask install location
Write-Host ""
Write-Host "Install location:" -ForegroundColor Cyan
Write-Host "  1. $env:USERPROFILE\bockie (default, recommended)"
Write-Host "  2. Custom location"
Write-Host "  3. Use existing git repo at $env:USERPROFILE\bockie-languange"
$choice = Read-Host "Choose (1/2/3) [default: 1]"

if ($choice -eq "2") {
    $installDir = Read-Host "Enter install directory"
} elseif ($choice -eq "3") {
    $installDir = "$env:USERPROFILE\bockie-languange"
    if (-not (Test-Path $installDir)) {
        Write-Host "  [-] $installDir does not exist!" -ForegroundColor Red
        Write-Host "      Clone repo first: git clone https://github.com/gagadeb11116677/bockie-languange.git" -ForegroundColor Yellow
        exit 1
    }
} else {
    $installDir = "$env:USERPROFILE\bockie"
}

Write-Host ""
Write-Host "  Install directory: $installDir" -ForegroundColor Green

# Step 1: Check Node.js
Write-Host ""
Write-Host "[1/7] Checking Node.js installation..." -ForegroundColor Cyan
$nodeVersion = $null
try { $nodeVersion = (node --version 2>$null) } catch {}
if (-not $nodeVersion) {
    Write-Host "  [-] Node.js is not installed!" -ForegroundColor Red
    Write-Host "      Download from: https://nodejs.org/ (LTS version)" -ForegroundColor Yellow
    exit 1
}
Write-Host "  [+] Node.js: $nodeVersion" -ForegroundColor Green

# Step 2: Copy source (only if not using existing repo)
Write-Host ""
Write-Host "[2/7] Setting up source code..." -ForegroundColor Cyan
if ($choice -eq "3") {
    Write-Host "  [i] Using existing repo, skipping copy" -ForegroundColor Yellow
    Write-Host "  [i] Copying new files from $scriptDir..." -ForegroundColor Yellow
    $dirsToCopy = @("src", "examples", "vscode-extension")
    $filesToCopy = @("package.json", "tsconfig.json", "LICENSE", "README.md", "CHANGELOG.md", "test-suite.js", "install-bockie.ps1", "install-bockie.bat", "upload-to-github.ps1", "upload-to-github.bat")
    foreach ($dir in $dirsToCopy) {
        $srcPath = Join-Path $scriptDir $dir
        if (Test-Path $srcPath) {
            $dstPath = Join-Path $installDir $dir
            if (Test-Path $dstPath) { Remove-Item -Recurse -Force $dstPath }
            Copy-Item -Path $srcPath -Destination $installDir -Recurse -Force
            Write-Host "  [+] Updated: $dir" -ForegroundColor Green
        }
    }
    foreach ($file in $filesToCopy) {
        $srcFile = Join-Path $scriptDir $file
        if (Test-Path $srcFile) {
            Copy-Item -Path $srcFile -Destination $installDir -Force
        }
    }
} else {
    if (Test-Path $installDir) {
        Write-Host "  [i] $installDir already exists" -ForegroundColor Yellow
        $overwrite = Read-Host "  Overwrite? (y/N)"
        if ($overwrite -ne 'y' -and $overwrite -ne 'Y') {
            Write-Host "  [-] Aborted" -ForegroundColor Red
            exit 1
        }
        Remove-Item -Recurse -Force $installDir
    }
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
    $dirsToCopy = @("src", "examples", "vscode-extension", "assets")
    $filesToCopy = @("package.json", "tsconfig.json", "LICENSE", "README.md", "CHANGELOG.md", "test-suite.js", ".gitignore", ".gitattributes", "install-bockie.ps1", "install-bockie.bat", "upload-to-github.ps1", "upload-to-github.bat")
    foreach ($dir in $dirsToCopy) {
        $srcPath = Join-Path $scriptDir $dir
        if (Test-Path $srcPath) { Copy-Item -Path $srcPath -Destination $installDir -Recurse -Force }
    }
    foreach ($file in $filesToCopy) {
        $srcFile = Join-Path $scriptDir $file
        if (Test-Path $srcFile) { Copy-Item -Path $srcFile -Destination $installDir -Force }
    }
    Write-Host "  [+] Source copied to $installDir" -ForegroundColor Green
}

# Step 3: npm install
Write-Host ""
Write-Host "[3/7] Installing npm dependencies..." -ForegroundColor Cyan
Push-Location $installDir
try {
    & npm install 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [-] npm install failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "  [+] Dependencies installed" -ForegroundColor Green
} finally { Pop-Location }

# Step 4: Build
Write-Host ""
Write-Host "[4/7] Building TypeScript..." -ForegroundColor Cyan
Push-Location $installDir
try {
    & npm run build 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [-] Build failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "  [+] Build successful" -ForegroundColor Green
} finally { Pop-Location }

# Step 5: Create bockie.bat (points to THIS install dir)
Write-Host ""
Write-Host "[5/7] Creating bockie command..." -ForegroundColor Cyan
$batContent = @"
@echo off
node "$installDir\dist\index.js" %*
"@
Set-Content -Path "$installDir\bockie.bat" -Value $batContent -Encoding ASCII
Write-Host "  [+] Created bockie.bat -> $installDir\dist\index.js" -ForegroundColor Green

# Step 6: Add to PATH
Write-Host ""
Write-Host "[6/7] Setting up PATH..." -ForegroundColor Cyan
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$installDir*") {
    $newPath = if ($userPath) { "$userPath;$installDir" } else { $installDir }
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "  [+] Added $installDir to PATH" -ForegroundColor Green
    $env:Path += ";$installDir"
} else {
    Write-Host "  [i] $installDir already in PATH" -ForegroundColor Yellow
}

# Also remove old install path from PATH if different
$oldPath = "$env:USERPROFILE\bockie"
if ($oldPath -ne $installDir -and $userPath -like "*$oldPath*") {
    $newPath = $userPath -replace [regex]::Escape(";$oldPath"), "" -replace [regex]::Escape("$oldPath;"), "" -replace [regex]::Escape($oldPath), ""
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "  [+] Removed old path: $oldPath" -ForegroundColor Green
}

# Step 7: Install VSCode extension
Write-Host ""
Write-Host "[7/7] Installing VSCode extension..." -ForegroundColor Cyan
$vscodeExtSrc = Join-Path $installDir "vscode-extension"
if (Test-Path $vscodeExtSrc) {
    if (Test-Path "$env:USERPROFILE\.vscode\extensions\bockie-1.0.0") {
        Remove-Item -Recurse -Force "$env:USERPROFILE\.vscode\extensions\bockie-1.0.0"
        Write-Host "  [+] Removed old v1.0.0 extension" -ForegroundColor Green
    }
    if (-not (Test-Path $vscodeExtDir)) {
        New-Item -ItemType Directory -Path $vscodeExtDir -Force | Out-Null
    }
    Copy-Item -Path "$vscodeExtSrc\*" -Destination $vscodeExtDir -Recurse -Force
    Write-Host "  [+] VSCode extension installed to $vscodeExtDir" -ForegroundColor Green
} else {
    Write-Host "  [i] vscode-extension folder not found" -ForegroundColor Yellow
}

# Test
Write-Host ""
Write-Host "Testing..." -ForegroundColor Cyan
& cmd /c "$installDir\bockie.bat" --version

Write-Host ""
Write-Host ("=" * 50) -ForegroundColor Green
Write-Host "  [+] Installation successful!" -ForegroundColor Green
Write-Host ("=" * 50) -ForegroundColor Green
Write-Host ""
Write-Host "Install location: $installDir" -ForegroundColor Cyan
Write-Host "bockie.bat points to: $installDir\dist\index.js" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT: Restart PowerShell to use 'bockie' command" -ForegroundColor Yellow
Write-Host ""
Write-Host "Quick test:" -ForegroundColor Cyan
Write-Host "  bockie --version"
Write-Host "  bockie -e `"print(true)`""
Write-Host "  bockie -e `"print(false)`""
Write-Host "  bockie run examples\hello.bckie"
Write-Host ""
