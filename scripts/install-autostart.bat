@echo off
setlocal
rem ===========================================================================
rem  GSN Showcase - run this ONCE on the demo laptop.
rem  Adds "GSN Showcase" to Windows Startup (opens automatically at login)
rem  and to the Desktop (to restart it by hand).
rem  To undo: delete "GSN Showcase" from the Startup folder (Win+R, shell:startup).
rem ===========================================================================

set "TARGET=%~dp0start-demo.bat"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "foreach ($folder in @([Environment]::GetFolderPath('Startup'), [Environment]::GetFolderPath('Desktop'))) {" ^
  "  $s = $ws.CreateShortcut((Join-Path $folder 'GSN Showcase.lnk'));" ^
  "  $s.TargetPath = '%TARGET%';" ^
  "  $s.WorkingDirectory = '%~dp0';" ^
  "  $s.WindowStyle = 7;" ^
  "  $s.Description = 'Start the GSN project showcase in fullscreen';" ^
  "  $s.Save();" ^
  "  Write-Host ('Created: ' + (Join-Path $folder 'GSN Showcase.lnk'))" ^
  "}"

if errorlevel 1 (
  echo Could not create the shortcuts.
) else (
  echo.
  echo All set. The showcase will open by itself the next time you log in.
)
pause
