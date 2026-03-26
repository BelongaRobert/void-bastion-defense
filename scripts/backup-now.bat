@echo off
echo ==================================================
echo Running Backup Now (Test)
echo ==================================================
echo.

powershell -ExecutionPolicy Bypass -File "%USERPROFILE%\.openclaw\workspace\scripts\backup-workspace.ps1"

echo.
echo Press any key to exit...
pause > nul
