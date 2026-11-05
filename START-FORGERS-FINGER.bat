@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js 22 or newer is required. Install it from https://nodejs.org/
 pause
 exit /b 1
)
call npm ci --offline --ignore-scripts --no-audit --no-fund
if errorlevel 1 (
 echo Locked installation failed. Please see README.md.
 pause
 exit /b 1
)
echo Starting FORGER'S FINGER. Keep this window open while playing.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\start-local-recovery.ps1"
if errorlevel 1 echo Please check the error above and README.md.
pause
