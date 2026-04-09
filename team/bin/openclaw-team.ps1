#!/usr/bin/env pwsh
# Global entry point: openclaw team <command>
# Symlink or copy this to somewhere in PATH

$teamCli = Join-Path $PSScriptRoot ".." "scripts" "team-cli.ps1"
& $teamCli @args
