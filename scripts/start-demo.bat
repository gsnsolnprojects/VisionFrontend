@echo off
setlocal
rem ===========================================================================
rem  GSN Showcase - launcher (Windows)
rem  Serves the built showcase and opens it in a maximised app window in Chrome (or Edge):
rem  no tabs or address bar, but normal minimise / maximise / close buttons.
rem  Run create-desktop-shortcut.bat once to get a "GSN Showcase" icon on the Desktop.
rem  Use the fullscreen button on the page for true fullscreen.
rem ===========================================================================

if not defined DEMO_PORT set DEMO_PORT=8080
set "URL=http://localhost:%DEMO_PORT%/showcase"
cd /d "%~dp0.."

rem First run on this laptop: build the showcase once.
if not exist "dist\index.html" (
  echo First run: building the showcase. This takes a minute...
  call "%~dp0update-demo.bat" --no-pull || goto :error
)

rem If the server is already running (script started twice), just open the browser.
curl -s -o nul "http://127.0.0.1:%DEMO_PORT%/" && goto :browser

start "GSN Showcase server" /min cmd /c "npx vite preview --port %DEMO_PORT% --strictPort --host 127.0.0.1"

echo Waiting for the showcase to start...
for /l %%i in (1,1,90) do (
  curl -s -o nul "http://127.0.0.1:%DEMO_PORT%/" && goto :browser
  timeout /t 1 /nobreak >nul
)
echo The showcase server did not start within 90 seconds.
goto :error

:browser
if defined DEMO_NO_BROWSER (
  echo Server is running at %URL%
  exit /b 0
)

set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"

rem A separate browser profile, so the app window opens even if the browser is already running.
set "PROFILE=%LocalAppData%\GSNShowcaseKiosk"

if exist "%CHROME%" (
  start "" "%CHROME%" --app="%URL%" --start-maximized --user-data-dir="%PROFILE%" --no-first-run --disable-session-crashed-bubble
) else if exist "%EDGE%" (
  start "" "%EDGE%" --app="%URL%" --start-maximized --user-data-dir="%PROFILE%" --no-first-run
) else (
  start "" "%URL%"
)
exit /b 0

:error
echo.
echo Something went wrong - see the messages above.
pause
exit /b 1
