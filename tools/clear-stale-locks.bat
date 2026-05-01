@echo off
REM clear-stale-locks.bat - Removes stale OpenClaw session lock files
REM Run this before starting OpenClaw if you encounter "session file locked" errors

echo [clear-stale-locks] Checking for stale session locks...

set "SESSIONS_DIR=%USERPROFILE%\.openclaw\agents\main\sessions"

if not exist "%SESSIONS_DIR%" (
    echo [clear-stale-locks] Sessions directory not found: %SESSIONS_DIR%
    echo [clear-stale-locks] Nothing to clean.
    exit /b 0
)

set "CLEARED=0"
set "KEPT=0"

for %%f in ("%SESSIONS_DIR%\*.jsonl.lock") do (
    REM Get file age in minutes (approximate using forfiles)
    forfiles /p "%SESSIONS_DIR%" /m "%%~nxf" /c "cmd /c exit 0" >nul 2>&1
    if errorlevel 1 (
        echo   Keeping: %%~nxf (recent)
        set /a KEPT+=1
    ) else (
        echo   Cleared: %%~nxf
        del /f "%%f" >nul 2>&1
        set /a CLEARED+=1
    )
)

echo [clear-stale-locks] Result: %CLEARED% cleared, %KEPT% kept
exit /b 0
