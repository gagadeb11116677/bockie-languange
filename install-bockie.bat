@echo off
REM Bockie v3.1.0 Windows Installer
REM Run: install-bockie.bat

setlocal enabledelayedexpansion

echo.
echo   ____            _    _
echo  ^|  _ \          ^| ^|  ^| ^|
echo  ^| ^|_) ^| _____  _^| ^| _^| ^| _____ _ __
echo  ^|  _ ^< / _ \ \/ /^| ^|/ /^| ^|/ / _ \ '__^|
echo  ^| ^|_) ^| (_) ^>  ^<^|   ^<^|   ^<  __/ ^|
echo  ^|____/ \___/_/\_\_|\_\_|\_\___^|_^|
echo.
echo    v3.1.0 - Windows Installer (from source)
echo    Created by xobe
echo.
echo ==================================================

set "INSTALL_DIR=%USERPROFILE%\bockie"
set "VSCODE_EXT_DIR=%USERPROFILE%\.vscode\extensions\bockie-1.0.0"
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

echo.
echo [1/6] Checking Node.js installation...
where node >nul 2>nul
if errorlevel 1 (
    echo   [-] Node.js is not installed!
    echo       Download from: https://nodejs.org/ (LTS version)
    echo       After install, restart cmd and re-run this script.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo   [+] Node.js installed: !NODE_VER!

echo.
echo [2/6] Creating install directory: %INSTALL_DIR%
if not exist "%INSTALL_DIR%" (
    mkdir "%INSTALL_DIR%"
    echo   [+] Created
) else (
    echo   [i] Already exists
)

echo.
echo [3/6] Copying source code...
xcopy /E /I /Y /Q "%SCRIPT_DIR%\src" "%INSTALL_DIR%\src" > nul
xcopy /E /I /Y /Q "%SCRIPT_DIR%\examples" "%INSTALL_DIR%\examples" > nul
copy /Y "%SCRIPT_DIR%\package.json" "%INSTALL_DIR%\" > nul
copy /Y "%SCRIPT_DIR%\tsconfig.json" "%INSTALL_DIR%\" > nul
copy /Y "%SCRIPT_DIR%\LICENSE" "%INSTALL_DIR%\" > nul
copy /Y "%SCRIPT_DIR%\README.md" "%INSTALL_DIR%\" > nul
echo   [+] Copied source files

echo.
echo [4/6] Installing npm dependencies (this takes a minute)...
cd /d "%INSTALL_DIR%"
call npm install
if errorlevel 1 (
    echo   [-] npm install failed!
    pause
    exit /b 1
)
echo   [+] Dependencies installed

echo.
echo [5/6] Building TypeScript to dist/...
call npm run build
if errorlevel 1 (
    echo   [-] Build failed!
    pause
    exit /b 1
)
echo   [+] Build successful

echo.
echo [6/6] Setting up PATH & VSCode extension...
REM Create bockie.bat in INSTALL_DIR
(
    echo @echo off
    echo node "%INSTALL_DIR%\dist\index.js" %%*
) > "%INSTALL_DIR%\bockie.bat"

REM Add to PATH (user level)
echo %PATH% | findstr /C:"%INSTALL_DIR%" > nul
if errorlevel 1 (
    for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USER_PATH=%%b"
    if defined USER_PATH (
        setx PATH "!USER_PATH!;%INSTALL_DIR%" > nul
    ) else (
        setx PATH "%INSTALL_DIR%" > nul
    )
    echo   [+] Added %INSTALL_DIR% to user PATH
) else (
    echo   [i] %INSTALL_DIR% already in PATH
)

REM Install VSCode extension
if exist "%SCRIPT_DIR%\vscode-extension" (
    if not exist "%VSCODE_EXT_DIR%" mkdir "%VSCODE_EXT_DIR%"
    xcopy /E /I /Y /Q "%SCRIPT_DIR%\vscode-extension\*" "%VSCODE_EXT_DIR%\" > nul
    echo   [+] Installed VSCode extension
) else (
    echo   [i] vscode-extension folder not found, skipping
)

echo.
echo ==================================================
echo   [+] Installation successful!
echo ==================================================
echo.
echo Testing...
"%INSTALL_DIR%\bockie.bat" --version
echo.
echo Next steps:
echo   1. Restart cmd/PowerShell (to reload PATH)
echo   2. Test: bockie --version
echo   3. Run: bockie run examples\hello.bckie
echo   4. REPL: bockie
echo.
echo To use in VSCode:
echo   1. Restart VSCode
echo   2. Open any .bckie file
echo   3. Syntax highlighting active!
echo.
echo Quick test:
echo   bockie -e "print(\"Hello from Bockie on Windows!\")"
echo.
pause
