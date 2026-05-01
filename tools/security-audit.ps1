# DaSage Security Audit Script
# Checks for common security issues

$WorkspaceDir = "$env:USERPROFILE\.openclaw\workspace"
$ReportPath = "$env:USERPROFILE\.openclaw\workspace\memory\security-audit-report.md"

Write-Host "🔐 Running security audit..."
Write-Host ""

$Report = @"
# Security Audit Report
**Date:** $(Get-Date -Format "yyyy-MM-dd HH:mm")

## Summary

"@

$Issues = @()
$Warnings = @()
$Info = @()

# Check 1: Token files
Write-Host "🔍 Checking for exposed tokens..."
$tokenFiles = Get-ChildItem -Path $WorkspaceDir -Recurse -File | 
    Where-Object { $_.Name -match 'token|secret|key|password|api' -and $_.Name -notmatch '\.md$|\.log$' }

if ($tokenFiles) {
    $tokenFiles | ForEach-Object {
        $content = Get-Content $_.FullName -Raw -First 100
        if ($content -match '[a-zA-Z0-9_-]{20,}') {
            $Warnings += "Potential token in: $($_.FullName)"
        }
    }
}

# Check 2: .env files
Write-Host "🔍 Checking .env files..."
$envFiles = Get-ChildItem -Path $WorkspaceDir -Recurse -Filter ".env*" -ErrorAction SilentlyContinue
if ($envFiles) {
    $envFiles | ForEach-Object {
        $isInGitignore = Test-Path (Join-Path $_.DirectoryName ".gitignore")
        if (!$isInGitignore) {
            $Warnings += "`.env` file not in .gitignore: $($_.FullName)"
        }
        $Info += "`.env` file found: $($_.FullName)"
    }
}

# Check 3: Sensitive directories permissions
Write-Host "🔍 Checking directory permissions..."
$workspaceACL = Get-Acl $WorkspaceDir
$everyone = $workspaceACL.Access | Where-Object { $_.IdentityReference -eq "Everyone" -or $_.IdentityReference -eq "Users" }
if ($everyone) {
    $Info += "Workspace has broad permissions: $($everyone.IdentityReference) has $($everyone.FileSystemRights)"
}

# Check 4: Large files (potential data leaks)
Write-Host "🔍 Checking for large files..."
$largeFiles = Get-ChildItem -Path $WorkspaceDir -Recurse -File -ErrorAction SilentlyContinue | 
    Where-Object { $_.Length -gt 100MB }
if ($largeFiles) {
    $largeFiles | ForEach-Object {
        $size = [math]::Round($_.Length / 1MB, 2)
        $Info += "Large file: $($_.Name) ($size MB)"
    }
}

# Check 5: Git remote security
Write-Host "🔍 Checking git remotes..."
$gitDirs = Get-ChildItem -Path $WorkspaceDir -Recurse -Directory -Filter ".git" -ErrorAction SilentlyContinue
$gitDirs | ForEach-Object {
    $projectDir = $_.Parent.FullName
    $configFile = Join-Path $_.FullName "config"
    if (Test-Path $configFile) {
        $config = Get-Content $configFile -Raw
        if ($config -match "http://github.com" -and $config -notmatch "https://github.com") {
            $Warnings += "Insecure git remote (HTTP not HTTPS): $projectDir"
        }
    }
}

# Check 6: Backup status
Write-Host "🔍 Checking backup status..."
$backupDir = "$env:USERPROFILE\.openclaw\backups"
if (Test-Path $backupDir) {
    $backups = Get-ChildItem -Path $backupDir -Filter "workspace-*.zip" | Sort-Object CreationTime -Descending
    $latest = $backups | Select-Object -First 1
    if ($latest) {
        $daysSince = (Get-Date) - $latest.CreationTime
        if ($daysSince.Days -gt 1) {
            $Warnings += "Last backup was $($daysSince.Days) days ago"
        } else {
            $Info += "Last backup: $($latest.CreationTime)"
        }
    } else {
        $Warnings += "No backups found"
    }
} else {
    $Warnings += "Backup directory not created"
}

# Check 7: Memory file access
Write-Host "🔍 Checking memory file security..."
$memoryFiles = Get-ChildItem -Path "$WorkspaceDir\memory" -Filter "*.md" -ErrorAction SilentlyContinue
if ($memoryFiles) {
    $sensitiveKeywords = @("password", "secret", "token", "api key", "private key")
    $memoryFiles | ForEach-Object {
        $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
        foreach ($keyword in $sensitiveKeywords) {
            if ($content -match $keyword) {
                $Info += "Potential sensitive data in: $($_.Name) (contains '$keyword')"
                break
            }
        }
    }
}

# Generate report
$Report += "### Issues Found: $($Issues.Count)`n"
$Report += "### Warnings: $($Warnings.Count)`n"
$Report += "### Info Items: $($Info.Count)`n`n"

if ($Issues.Count -gt 0) {
    $Report += "## ❌ Issues`n`n"
    $Issues | ForEach-Object { $Report += "- $_`n" }
    $Report += "`n"
}

if ($Warnings.Count -gt 0) {
    $Report += "## ⚠️ Warnings`n`n"
    $Warnings | ForEach-Object { $Report += "- $_`n" }
    $Report += "`n"
}

if ($Info.Count -gt 0) {
    $Report += "## ℹ️ Information`n`n"
    $Info | ForEach-Object { $Report += "- $_`n" }
    $Report += "`n"
}

if ($Issues.Count -eq 0 -and $Warnings.Count -eq 0) {
    $Report += "## ✅ All Clear!`n`nNo major security issues found.`n`n"
}

$Report += @"
## Recommendations

1. **Review .env files** — Ensure they contain no production credentials
2. **Check backup schedule** — Run backup script regularly
3. **Audit large files** — Ensure no sensitive data in large files
4. **Review memory files** — Keep sensitive data minimal

---
*Next audit recommended: $(Get-Date -Format "yyyy-MM-dd")*
"@

# Write report
$Report | Out-File -FilePath $ReportPath -Encoding UTF8

Write-Host ""
Write-Host "📊 Audit complete!"
Write-Host "   Issues: $($Issues.Count)"
Write-Host "   Warnings: $($Warnings.Count)"
Write-Host "   Info: $($Info.Count)"
Write-Host ""
Write-Host "📄 Report saved to: $ReportPath"

# Show summary
Get-Content $ReportPath | Select-Object -First 20
