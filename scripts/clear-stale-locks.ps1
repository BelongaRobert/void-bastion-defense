#!/usr/bin/env pwsh
#Requires -Version 5.1
<#
.SYNOPSIS
    Clears stale OpenClaw session lock files
.DESCRIPTION
    Removes .jsonl.lock files older than 5 minutes from the sessions directory.
    Run this before starting OpenClaw if you encounter "session file locked" errors.
.EXAMPLE
    .\clear-stale-locks.ps1
.EXAMPLE
    # Add to your PowerShell profile to run automatically:
    Add-Content $PROFILE "& 'C:\Users\$env:USERNAME\.openclaw\workspace\scripts\clear-stale-locks.ps1'"
#>

[CmdletBinding()]
param(
    [int]$OlderThanMinutes = 5,
    [switch]$Force
)

$ErrorActionPreference = 'Continue'

$SESSIONS_DIR = Join-Path $env:USERPROFILE ".openclaw" "agents" "main" "sessions"
$LOCK_PATTERN = "*.jsonl.lock"

Write-Host "[clear-stale-locks] Checking for stale session locks..." -ForegroundColor Cyan

if (-not (Test-Path $SESSIONS_DIR)) {
    Write-Host "[clear-stale-locks] Sessions directory not found: $SESSIONS_DIR" -ForegroundColor Yellow
    Write-Host "[clear-stale-locks] Nothing to clean." -ForegroundColor Yellow
    exit 0
}

$lockFiles = Get-ChildItem -Path $SESSIONS_DIR -Filter $LOCK_PATTERN -ErrorAction SilentlyContinue

if (-not $lockFiles) {
    Write-Host "[clear-stale-locks] No lock files found." -ForegroundColor Green
    exit 0
}

$cleared = 0
$now = Get-Date
$kept = 0

foreach ($file in $lockFiles) {
    $ageMinutes = ($now - $file.LastWriteTime).TotalMinutes
    
    if ($ageMinutes -gt $OlderThanMinutes -or $Force) {
        try {
            Remove-Item $file.FullName -Force -ErrorAction Stop
            $action = if ($Force) { "(forced)" } else { "($([math]::Round($ageMinutes)) min old)" }
            Write-Host "  Cleared: $($file.Name) $action" -ForegroundColor Yellow
            $cleared++
        } catch {
            Write-Error "  Failed to remove $($file.Name): $_"
        }
    } else {
        Write-Host "  Keeping: $($file.Name) ($([math]::Round($ageMinutes)) min old)" -ForegroundColor DarkGray
        $kept++
    }
}

Write-Host "[clear-stale-locks] Result: $cleared cleared, $kept kept" -ForegroundColor Cyan
exit 0
