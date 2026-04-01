@echo off
chcp 65001 > nul
title DaShade Setup - First Time Configuration
color 0E
cls

echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                   DASHADE SETUP WIZARD                             ║
echo ║              One-time configuration (needs internet)             ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.
echo This will prepare your system for offline AI usage.
echo You only need to do this ONCE per computer.
echo.

ollama --version > nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Ollama already installed!
    ollama --version
    echo.
) else (
    echo ❌ Ollama not found.
    echo Please install from https://ollama.com/download/windows
    start https://ollama.com/download/windows
    pause
    exit /b 1
)

echo ════════════════════════════════════════════════════════════════════
echo STEP 2: Downloading AI Model (4.7 GB)...
echo ════════════════════════════════════════════════════════════════════
echo.
echo Press any key to begin download...
pause > nul

echo 📥 Downloading qwen2.5:7b... This may take 10-30 minutes.
ollama pull qwen2.5:7b

if %errorlevel% neq 0 (
    echo ❌ Download failed! Check internet connection.
    pause
    exit /b 1
)

echo.
echo ✅ Model downloaded!
echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                    SETUP COMPLETE!                               ║
echo ║                                                                  ║
echo ║  Your system is now ready for OFFLINE AI usage!                   ║
echo ║  Double-click START.bat to launch DaShade!                       ║
echo ║                                                                  ║
echo ║  ⚔️ The Emperor protects!                                         ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.
pause
