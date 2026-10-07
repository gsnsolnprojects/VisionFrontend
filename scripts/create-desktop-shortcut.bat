@echo off
setlocal
rem ===========================================================================
rem  GSN Showcase - run this ONCE on the demo laptop.
rem  Creates a "GSN Showcase" icon on the Desktop that starts the demo.
rem  It also removes the old auto-start entry (from the previous version of
rem  this script), so the demo no longer opens by itself at login.
rem ===========================================================================

set "TARGET=%~dp0start-demo.bat"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$lnk = Join-Path ([Environment]::GetFolderPath('Desktop')) 'GSN Showcase.lnk';" ^
  "$s = $ws.CreateShortcut($lnk);" ^
  "$s.TargetPath = '%TARGET%';" ^
  "$s.WorkingDirectory = '%~dp0';" ^
  "$s.WindowStyle = 7;" ^
  "$s.Description = 'Start the GSN project showcase';" ^
  "$s.Save();" ^
  "Write-Host ('Created: ' + $lnk);" ^
  "$old = Join-Path ([Environment]::GetFolderPath('Startup')) 'GSN Showcase.lnk';" ^
  "if (Test-Path $old) { Remove-Item $old; Write-Host ('Removed auto-start: ' + $old) }"

if errorlevel 1 (
  echo Could not create the shortcut.
) else (
  echo.
  echo All set. Double-click "GSN Showcase" on the Desktop to start the demo.
)
pause
