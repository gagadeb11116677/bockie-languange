@echo off
REM upload-to-github.bat - Upload Bockie source ke GitHub
powershell -ExecutionPolicy Bypass -File "%~dp0upload-to-github.ps1"
pause
