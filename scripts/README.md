# OpenClaw Session Lock Cleaner

Scripts to clear stale `.jsonl.lock` files that can prevent OpenClaw sessions from starting.

## Problem

When the OpenClaw gateway crashes or is forcefully terminated, session lock files may not be cleaned up properly. These stale locks cause errors like:

```
session file locked (timeout 10000ms): pid=XXXX C:\Users\...\session.jsonl.lock
```

## Solution

Run these scripts before starting OpenClaw to clear any stale locks.

## Usage

### PowerShell (Recommended)

```powershell
# Run once
.\clear-stale-locks.ps1

# Force clear all locks regardless of age
.\clear-stale-locks.ps1 -Force

# Change the stale threshold (default: 5 minutes)
.\clear-stale-locks.ps1 -OlderThanMinutes 10
```

### Node.js

```bash
# Run once
node clear-stale-locks.js

# With options
node clear-stale-locks.js --older-than 10 --force
```

## Auto-run on PowerShell Startup

Add to your PowerShell profile to automatically clear stale locks when opening a new terminal:

```powershell
# Open your profile in an editor
notepad $PROFILE

# Add this line:
& "$env:USERPROFILE\.openclaw\workspace\scripts\clear-stale-locks.ps1"
```

Or run this one-liner to add it:

```powershell
Add-Content $PROFILE "`n# Clear OpenClaw stale locks on startup`n& `"$env:USERPROFILE\.openclaw\workspace\scripts\clear-stale-locks.ps1`""
```

## Create an Alias

Add to your PowerShell profile:

```powershell
function Clear-StaleLocks {
    & "$env:USERPROFILE\.openclaw\workspace\scripts\clear-stale-locks.ps1" @args
}
Set-Alias -Name oll -Value Clear-StaleLocks
```

Now you can just run `oll` anytime.

## Files

| File | Description |
|------|-------------|
| `clear-stale-locks.ps1` | PowerShell script (recommended for Windows) |
| `clear-stale-locks.js` | Node.js script (cross-platform) |
