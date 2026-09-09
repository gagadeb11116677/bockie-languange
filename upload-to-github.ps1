# upload-to-github.ps1 (FIXED - handles special chars + remote errors)
# Run: powershell -ExecutionPolicy Bypass -File upload-to-github.ps1

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "Bockie v1.0.0 - GitHub Upload Script" -ForegroundColor Cyan
Write-Host "Repo target: https://github.com/gagadeb11116677/bockie-languange" -ForegroundColor Gray
Write-Host ""

# Check git
Write-Host "[1/6] Checking Git installation..." -ForegroundColor Cyan
$gitVersion = $null
try { $gitVersion = (git --version 2>$null) } catch {}
if (-not $gitVersion) {
    Write-Host "  [-] Git is not installed." -ForegroundColor Red
    Write-Host "      Download from: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}
Write-Host "  [+] $gitVersion" -ForegroundColor Green

# Check git config
$name = git config --global user.name 2>$null
$email = git config --global user.email 2>$null
if (-not $name -or -not $email) {
    Write-Host ""
    Write-Host "  [!] Git user.name or user.email not set" -ForegroundColor Yellow
    $newName = Read-Host "  Enter your GitHub username"
    $newEmail = Read-Host "  Enter your GitHub email"
    git config --global user.name $newName
    git config --global user.email $newEmail
    git config --global init.defaultBranch main
    Write-Host "  [+] Git config set" -ForegroundColor Green
} else {
    Write-Host "  [i] user.name: $name" -ForegroundColor Yellow
    Write-Host "  [i] user.email: $email" -ForegroundColor Yellow
}

# Project folder
Write-Host ""
Write-Host "[2/6] Setting up project folder..." -ForegroundColor Cyan
$projectDir = "$env:USERPROFILE\bockie-languange"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

if (Test-Path $projectDir) {
    Write-Host "  [i] $projectDir already exists" -ForegroundColor Yellow
    $overwrite = Read-Host "  Overwrite? (y/N)"
    if ($overwrite -ne 'y' -and $overwrite -ne 'Y') {
        Write-Host "  [-] Aborted by user" -ForegroundColor Red
        exit 1
    }
    Remove-Item -Recurse -Force $projectDir
}
New-Item -ItemType Directory -Path $projectDir -Force | Out-Null
Write-Host "  [+] Created $projectDir" -ForegroundColor Green

# Copy files
Write-Host ""
Write-Host "[3/6] Copying files..." -ForegroundColor Cyan
Copy-Item -Path "$scriptDir\*" -Destination $projectDir -Recurse -Force
$nodeModulesPath = Join-Path $projectDir "node_modules"
if (Test-Path $nodeModulesPath) { Remove-Item -Recurse -Force $nodeModulesPath }
$distPath = Join-Path $projectDir "dist"
if (Test-Path $distPath) { Remove-Item -Recurse -Force $distPath }
Write-Host "  [+] Copied files to $projectDir" -ForegroundColor Green

# Init git
Write-Host ""
Write-Host "[4/6] Initializing Git repository..." -ForegroundColor Cyan
Set-Location $projectDir
git init 2>&1 | Out-Null
git branch -M main
Write-Host "  [+] Git initialized" -ForegroundColor Green

# Commit - use temp file to avoid shell escaping issues with { } chars
Write-Host ""
Write-Host "[5/6] Committing files..." -ForegroundColor Cyan
git add .

$commitMsg = @'
Initial commit - Bockie v1.0.0

Bahasa pemrograman general-purpose dengan ciri khas:
- String interpolation: print("Halo {nama}")
- Pipeline operator: 5 |> double |> add_one
- Null coalescing: x ?? default
- Spread operator: [0, ...arr, 4]
- Match/case, repeat/unless, walrus :=
- Power operator: 2 ** 10
- Slicing: s[1:5]

Built-in modules: game, fs, os, regex, datetime, process, crypto, http, json
80+ built-in functions
VSCode extension included

Created by xobe
'@

$tempFile = [System.IO.Path]::GetTempFileName()
Set-Content -Path $tempFile -Value $commitMsg -Encoding UTF8
git commit -F $tempFile 2>&1 | Out-Null
Remove-Item $tempFile -Force
Write-Host "  [+] Committed" -ForegroundColor Green

# Push - safely handle existing remote
Write-Host ""
Write-Host "[6/6] Pushing to GitHub..." -ForegroundColor Cyan
$remoteUrl = "https://github.com/gagadeb11116677/bockie-languange.git"

# Check if remote exists, add or update as needed
$existingRemote = git remote get-url origin 2>$null
if ($existingRemote) {
    Write-Host "  [i] Remote origin already exists, updating URL" -ForegroundColor Yellow
    git remote set-url origin $remoteUrl
} else {
    git remote add origin $remoteUrl
}
Write-Host "  [+] Remote set: $remoteUrl" -ForegroundColor Green

Write-Host ""
Write-Host "  Now you'll be asked for credentials:" -ForegroundColor Yellow
Write-Host "  - Username: gagadeb11116677 (or GianzOfficial)" -ForegroundColor White
Write-Host "  - Password: paste your Personal Access Token (PAT)" -ForegroundColor White
Write-Host "    (NOT your GitHub password!)" -ForegroundColor Red
Write-Host ""
Write-Host "  Don't have a PAT? Get one at:" -ForegroundColor Yellow
Write-Host "  https://github.com/settings/tokens" -ForegroundColor Cyan
Write-Host "  - Generate new token (classic)" -ForegroundColor White
Write-Host "  - Check 'repo' scope" -ForegroundColor White
Write-Host "  - Generate, copy the token" -ForegroundColor White
Write-Host ""
$continue = Read-Host "  Ready to push? (y/N)"
if ($continue -ne 'y' -and $continue -ne 'Y') {
    Write-Host "  [-] Push aborted" -ForegroundColor Red
    Write-Host "  You can push manually later:" -ForegroundColor Yellow
    Write-Host "    cd $projectDir" -ForegroundColor White
    Write-Host "    git push -u origin main" -ForegroundColor White
    exit 1
}

# Try push, handle rejection (if remote already has commits)
git push -u origin main 2>&1 | ForEach-Object {
    Write-Host $_
    if ($_ -match "Updates were rejected" -or $_ -match "non-fast-forward") {
        Write-Host ""
        Write-Host "  [!] Push rejected - remote has commits. Pulling first..." -ForegroundColor Yellow
        git pull origin main --allow-unrelated-histories 2>&1 | Out-Null
        git push -u origin main
    }
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host ("=" * 50) -ForegroundColor Green
    Write-Host "  [+] Upload successful!" -ForegroundColor Green
    Write-Host ("=" * 50) -ForegroundColor Green
    Write-Host ""
    Write-Host "Your repo is now live at:" -ForegroundColor Cyan
    Write-Host "  https://github.com/gagadeb11116677/bockie-languange" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Install Bockie on this laptop: run install-bockie.ps1"
    Write-Host "  2. Test in VSCode (restart VSCode first)"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "  [-] Push failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Common issues:" -ForegroundColor Yellow
    Write-Host "    - Wrong PAT (re-generate at https://github.com/settings/tokens)" -ForegroundColor White
    Write-Host "    - Repo not created (create at https://github.com/new)" -ForegroundColor White
    Write-Host ""
    Write-Host "  Manual push:" -ForegroundColor Cyan
    Write-Host "    cd $projectDir" -ForegroundColor White
    Write-Host "    git push -u origin main" -ForegroundColor White
}
