@echo off
echo ==================================================
echo DaSage Daily Backup Scheduler Setup
echo ==================================================
echo.

REM Check if running as admin (needed for Task Scheduler)
net session > nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Please run this as Administrator!
    echo Right-click -> "Run as administrator"
    pause
    exit /b 1
)

set BACKUP_SCRIPT=%USERPROFILE%\.openclaw\workspace\scripts\backup-workspace.ps1
set TASK_NAME=DaSage-Daily-Backup

REM Check if script exists
if not exist "%BACKUP_SCRIPT%" (
    echo ❌ Backup script not found: %BACKUP_SCRIPT%
    pause
    exit /b 1
)

echo Creating scheduled task: %TASK_NAME%
echo.
echo This will run daily at 2:00 AM
echo.

REM Create the task
schtasks /create ^
    /tn "%TASK_NAME%" ^
    /tr "powershell.exe -ExecutionPolicy Bypass -File \"%BACKUP_SCRIPT%\"" ^
    /sc daily ^
    /st 02:00 ^
    /rl highest ^
    /f ^
    /ru SYSTEM

if %errorlevel% equ 0 (
    echo ✅ Task created successfully!
    echo.
    echo Backup will run daily at 2:00 AM
    echo Location: %USERPROFILE%\.openclaw\backups\
    echo.
    echo To verify, run: schtasks /query /tn "%TASK_NAME%"
    echo To remove, run: schtasks /delete /tn "%TASK_NAME%" /f
) else (
    echo ❌ Failed to create task (error %errorlevel%)
    echo You may need to run as Administrator
)

echo.
pause
