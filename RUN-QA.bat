@echo off
cd /d "%~dp0"
call npm ci --offline --ignore-scripts --no-audit --no-fund
if errorlevel 1 goto :failed
call npm run qa
if errorlevel 1 goto :failed
echo QA PASSED. Review QA-REPORT.md for outstanding browser and production checks.
pause
exit /b 0
:failed
echo QA FAILED. Review the messages above.
pause
exit /b 1
