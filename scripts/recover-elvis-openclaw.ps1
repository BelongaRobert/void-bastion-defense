# OpenClaw Recovery Script for Elvis
# Run this on Elvis's machine via remote access

$ErrorActionPreference = "Stop"

Write-Host "🐙 OpenClaw Recovery Script" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if OpenClaw is installed
Write-Host "Step 1: Checking OpenClaw installation..." -ForegroundColor Yellow
$openclawPath = (Get-Command openclaw -ErrorAction SilentlyContinue).Source
if (-not $openclawPath) {
    # Check common npm locations
    $possiblePaths = @(
        "$env:APPDATA\npm\openclaw.cmd",
        "$env:APPDATA\npm\openclaw.ps1",
        "$env:LOCALAPPDATA\npm\openclaw.cmd",
        "$env:ProgramFiles\nodejs\openclaw.cmd",
        "$env:LOCALAPPDATA\npm-cache\_npx\*\node_modules\openclaw\bin\openclaw.js"
    )
    
    $found = $false
    foreach ($path in $possiblePaths) {
        $matches = Get-ChildItem -Path $path -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($matches) {
            Write-Host "   Found OpenClaw at: $($matches.FullName)" -ForegroundColor Green
            $found = $true
            break
        }
    }
    
    if (-not $found) {
        Write-Host "   OpenClaw not found. Installing..." -ForegroundColor Red
        npm install -g openclaw
        if ($LASTEXITCODE -ne 0) {
            Write-Host "   Failed to install OpenClaw. Check npm is installed." -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "   OpenClaw found at: $openclawPath" -ForegroundColor Green
}

# Step 2: Backup existing config
Write-Host ""
Write-Host "Step 2: Backing up existing config..." -ForegroundColor Yellow
$openclawDir = "$env:USERPROFILE\.openclaw"
$backupDir = "$env:USERPROFILE\.openclaw.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"

if (Test-Path $openclawDir) {
    Write-Host "   Backing up to: $backupDir" -ForegroundColor Green
    Copy-Item -Path $openclawDir -Destination $backupDir -Recurse -Force
} else {
    Write-Host "   No existing config found (fresh install)" -ForegroundColor Green
}

# Step 3: Prompt for bot token
Write-Host ""
Write-Host "Step 3: Bot Token Setup" -ForegroundColor Yellow
Write-Host "   Elvis needs his OWN bot token from @BotFather" -ForegroundColor Magenta
Write-Host "   Do NOT use Robert's token - each person needs their own bot" -ForegroundColor Magenta
Write-Host ""

$botToken = Read-Host "Enter Elvis's bot token (from @BotFather)"

if (-not $botToken -or $botToken.Length -lt 20) {
    Write-Host "   Invalid token. Token should be ~46 characters long." -ForegroundColor Red
    Write-Host "   Get a token: Message @BotFather -> /newbot -> follow prompts" -ForegroundColor Yellow
    exit 1
}

# Step 4: Test the token
Write-Host ""
Write-Host "Step 4: Testing bot token..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$botToken/getMe" -Method GET -TimeoutSec 10
    if ($response.ok) {
        Write-Host "   Token valid! Bot name: $($response.result.username)" -ForegroundColor Green
    } else {
        Write-Host "   Token test failed: $($response.description)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   Token test failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Common causes:" -ForegroundColor Yellow
    Write-Host "     - Wrong token copied" -ForegroundColor Yellow
    Write-Host "     - Token was revoked" -ForegroundColor Yellow
    Write-Host "     - Network issue" -ForegroundColor Yellow
    exit 1
}

# Step 5: Create minimal working config
Write-Host ""
Write-Host "Step 5: Creating working config..." -ForegroundColor Yellow

# Create directory
New-Item -ItemType Directory -Path $openclawDir -Force | Out-Null

$ConfigContent = @"
{
  "gateway": {
    "bind": "127.0.0.1:18789",
    "auth": {
      "token": "$(-join ((65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ }))"
    }
  },
  "agents": {
    "main": {
      "model": "ollama/phi4",
      "systemPrompt": "default"
    }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "dmPolicy": "open",
      "botToken": "$botToken",
      "allowFrom": ["*"],
      "groupPolicy": "allowlist",
      "streaming": "partial"
    }
  },
  "plugins": {
    "allowlist": ["*"]
  }
}
"@

$configPath = Join-Path $openclawDir "openclaw.json"
$ConfigContent | Out-File -FilePath $configPath -Encoding UTF8 -Force
Write-Host "   Config created at: $configPath" -ForegroundColor Green

# Step 6: Create workspace directory
Write-Host ""
Write-Host "Step 6: Setting up workspace..." -ForegroundColor Yellow
$workspaceDir = Join-Path $openclawDir "workspace"
New-Item -ItemType Directory -Path $workspaceDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $workspaceDir "projects") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $workspaceDir "memory") -Force | Out-Null

# Create basic identity files
$identityContent = @"# IDENTITY.md - Who Am I?

- **Name:** Elvis's Assistant
- **Creature:** AI assistant - helping with web development
- **Vibe:** Friendly, direct, gets things done
- **Emoji:** 🤖
- **Focus:** Web applications, SMS integration, automation

---

Built to help Elvis with his projects. Competent and resourceful.
"@

$identityContent | Out-File -FilePath (Join-Path $workspaceDir "IDENTITY.md") -Encoding UTF8 -Force

$userContent = @"# USER.md - About Your Human

- **Name:** Elvis
- **What to call them:** Elvis
- **Pronouns:** 
- **Timezone:** America/New_York (EDT)
- **Notes:**
  - Focus: Web apps, SMS integration
  - Projects: elvis-sms-app

## Context

Building web applications and automation tools.
"@

$userContent | Out-File -FilePath (Join-Path $workspaceDir "USER.md") -Encoding UTF8 -Force

$agentsContent = @"# AGENTS.md - Your Workspace

This folder is home. Treat it that way.

## Session Startup

Before doing anything else:

1. Read `SOUL.md` — this is who you are
2. Read `USER.md` — this is who you're helping
3. Read `memory/YYYY-MM-DD.md` (today + yesterday) for recent context

Don't ask permission. Just do it.

## Memory

- **Daily notes:** `memory/YYYY-MM-DD.md` — raw logs of what happened
- **Long-term:** `MEMORY.md` — curated memories

## Red Lines

- Private things stay private. Period.
- Don't run destructive commands without asking.
- `trash` > `rm` (recoverable beats gone forever)
- When in doubt, ask.

## External vs Internal

**Safe to do freely:**
- Read files, explore, organize, learn
- Search the web
- Work within this workspace

**Ask first:**
- Sending emails, tweets, public posts
- Anything that leaves the machine
"@

$agentsContent | Out-File -FilePath (Join-Path $workspaceDir "AGENTS.md") -Encoding UTF8 -Force

Write-Host "   Workspace structure created" -ForegroundColor Green

# Step 7: Kill any existing OpenClaw processes
Write-Host ""
Write-Host "Step 7: Cleaning up old processes..." -ForegroundColor Yellow
$processes = Get-Process -Name "openclaw" -ErrorAction SilentlyContinue
if ($processes) {
    Write-Host "   Stopping existing OpenClaw processes..." -ForegroundColor Yellow
    $processes | Stop-Process -Force
    Start-Sleep -Seconds 2
}
Write-Host "   Cleanup complete" -ForegroundColor Green

# Step 8: Start the gateway
Write-Host ""
Write-Host "Step 8: Starting OpenClaw Gateway..." -ForegroundColor Yellow
Write-Host "   (This will run in background)" -ForegroundColor Gray

Start-Process -FilePath "openclaw" -ArgumentList "gateway", "start" -WindowStyle Hidden

# Wait for startup
Start-Sleep -Seconds 5

# Step 9: Verify with doctor
Write-Host ""
Write-Host "Step 9: Verifying installation..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

$doctorOutput = & openclaw doctor 2>&1
Write-Host $doctorOutput -ForegroundColor Gray

if ($doctorOutput -match "Telegram:\s*ok") {
    Write-Host ""
    Write-Host "✅ SUCCESS! OpenClaw is running and Telegram is connected." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "   1. Elvis should message his bot (@$($response.result.username))" -ForegroundColor White
    Write-Host "   2. The bot should respond automatically" -ForegroundColor White
    Write-Host "   3. If no response in 30 seconds, check BotFather /setprivacy is DISABLED" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "⚠️ Gateway started but Telegram check failed." -ForegroundColor Yellow
    Write-Host "   Check: openclaw doctor" -ForegroundColor White
    Write-Host "   Common fixes:" -ForegroundColor Yellow
    Write-Host "     - Message @BotFather, send /setprivacy, choose DISABLE" -ForegroundColor White
    Write-Host "     - Check network connection" -ForegroundColor White
    Write-Host "     - Verify token is correct (not expired)" -ForegroundColor White
}

Write-Host ""
Write-Host "Recovery complete!" -ForegroundColor Cyan
Write-Host "Backup saved to: $backupDir" -ForegroundColor Gray
Write-Host ""
Read-Host "Press Enter to exit"
