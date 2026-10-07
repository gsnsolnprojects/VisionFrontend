@echo off
setlocal
rem ===========================================================================
rem  GSN Showcase - update the demo laptop (Windows)
rem  Pulls the latest code, installs packages and rebuilds the showcase.
rem  Afterwards, restart the demo (or the laptop) to see the new version.
rem  Called by start-demo.bat with --no-pull on the very first run.
rem ===========================================================================

cd /d "%~dp0.."

if not exist ".env" (
  echo ERROR: the .env file is missing in:
  echo   %CD%
  echo Copy .env from the development laptop into this folder, then run this again.
  goto :error
)

if /i not "%~1"=="--no-pull" (
  echo Pulling the latest code...
  git pull || goto :error
)

echo Installing packages...
call npm ci --no-audit --no-fund || call npm install --no-audit --no-fund || goto :error

echo Building the showcase...
call npm run build || goto :error

echo.
echo Done. Restart the demo (or the laptop) to use the new version.
if /i not "%~1"=="--no-pull" pause
exit /b 0

:error
echo.
echo Update failed - see the messages above.
pause
exit /b 1
