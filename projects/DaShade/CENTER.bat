@echo off
chcp 65001 > nul
title DaShade Command Center
color 0B
cls

echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║           DASHADE COMMAND CENTER - Web Interface                 ║
echo ║              Knowledge Base Management Portal                    ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

set "DASHADE_ROOT=%~dp0"
cd /d "%DASHADE_ROOT%"

echo 🐙 Starting Command Center...
echo.
echo This will open a web interface in your browser.
echo You can:
echo   - View knowledge base stats
echo   - See indexed documents
echo   - Monitor system status
echo.

:: Check if Node.js is available
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Node.js not found!
    echo    Command Center requires Node.js.
    echo    DaShade chat (START.bat) will still work.
    echo.
    echo    Download Node.js from: https://nodejs.org
    pause
    exit /b 1
)

:: Check if Ollama is running
curl -s http://localhost:11434/api/tags > nul 2>&1
if %errorlevel% neq 0 (
    echo 🚀 Starting Ollama server first...
    start /b ollama serve > nul 2>&1
    timeout /t 3 > nul
)

echo 🌐 Starting web server...
echo.
echo ════════════════════════════════════════════════════════════════════
echo.
echo    🖥️  Command Center will be available at:
echo       http://localhost:3473
echo.
echo    📱 Mobile-friendly interface
echo    📊 Real-time knowledge stats
echo    📚 Document management
echo.
echo ════════════════════════════════════════════════════════════════════
echo.
echo Press Ctrl+C to stop the server
echo.

node "launcher\command-center.mjs"
