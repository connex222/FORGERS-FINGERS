@echo off
cd /d "%~dp0"
echo ====================================================
echo FORGER'S FINGER - SAVE PREMIUM NARRATION AND SOUNDS
echo ====================================================
echo Downloads all 9 Lord Gavelby chapters and 3 premium sound effects.
echo Creative Claw audio must be reachable on your internet connection.
echo No GitHub or Render deployment is performed by this script.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\download-premium-audio.ps1"
if errorlevel 1 ( echo DOWNLOAD FAILED - game will still try to stream the audio online. ) else ( echo COMPLETE - premium audio is now bundled locally in this folder. )
echo.
pause
