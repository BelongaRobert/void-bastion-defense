@echo off
chcp 65001 > nul
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    DaShade Launcher                          ║
echo ║           Knowledge That Never Goes Offline                  ║
echo ║                    [OFFLINE MODE]                            ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Check if running from USB
set "DASHADE_ROOT=%~dp0"
set "WORKSPACE_DIR=%DASHADE_ROOT%workspace"

:: Create workspace if not exists
if not exist "%WORKSPACE_DIR%" mkdir "%WORKSPACE_DIR%"

echo 🐙 Initializing Blood Raven systems...
echo 📍 Location: %DASHADE_ROOT%
echo 📂 Workspace: %WORKSPACE_DIR%
echo.

:: Check for Ollama
ollama --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Ollama not found in PATH!
    echo    Please install Ollama from https://ollama.com
echo    Or ensure it's in your PATH
    pause
    exit /b 1
)

:: Check if model exists
echo 🔍 Checking for qwen2.5:7b model...
ollama list | findstr "qwen2.5:7b" > nul
if %errorlevel% neq 0 (
    echo 📥 Model not found. Downloading... (4.7GB)
    ollama pull qwen2.5:7b
    if %errorlevel% neq 0 (
        echo ❌ Failed to download model
        echo    Connect to internet briefly for first download
        pause
        exit /b 1
    )
)

echo ✅ Model ready!
echo.

:: Start Ollama server if not running
echo 🔌 Checking Ollama server...
curl -s http://localhost:11434/api/tags > nul 2>&1
if %errorlevel% neq 0 (
    echo 🚀 Starting Ollama server...
    start /b ollama serve > nul 2>&1
    timeout /t 3 > nul
) else (
    echo ✅ Ollama server already running
)

echo.
echo 🎤 Starting DaShade TUI Chat...
echo.
echo ════════════════════════════════════════════════════════════════
echo.

:: Run the chat
node "%~dp0launcher\tui-chat.mjs"

echo.
echo ⚔️  The Emperor protects!
echo.
pause
