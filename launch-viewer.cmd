@echo off
setlocal

set "SCRIPT_DIR=%~dp0"

where pwsh >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%launch-viewer.ps1" %*
) else (
  powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%launch-viewer.ps1" %*
)

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Launch failed. Press any key to close this window.
  pause >nul
)
