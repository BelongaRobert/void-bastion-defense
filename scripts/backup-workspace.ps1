# DaSage Workspace Backup Script
# Creates timestamped backups and maintains last 7 days

$WorkspaceDir = "$env:USERPROFILE\.openclaw\workspace"
$BackupDir = "$env:USERPROFILE\.openclaw\backups"
$Timestamp = Get-Date -Format "yyyy-MM-dd-HHmm"
$BackupName = "workspace-$Timestamp.zip"
$BackupPath = Join-Path $BackupDir $BackupName

Write-Host "🔒 Starting workspace backup..."
Write-Host "📁 Source: $WorkspaceDir"
Write-Host "💾 Destination: $BackupPath"

# Ensure backup directory exists
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "✅ Created backup directory"
}

# Create zip backup
try {
    # Exclude node_modules and .git to keep size manageable
    $items = Get-ChildItem -Path $WorkspaceDir -Exclude @('node_modules', '.git', 'dist', 'build') -ErrorAction SilentlyContinue
    
    Compress-Archive -Path $items -DestinationPath $BackupPath -Force
    
    $size = (Get-Item $BackupPath).Length / 1MB
    Write-Host "✅ Backup created: $([math]::Round($size, 2)) MB"
} catch {
    Write-Host "❌ Backup failed: $_"
    exit 1
}

# Clean up old backups (keep last 7)
$oldBackups = Get-ChildItem -Path $BackupDir -Filter "workspace-*.zip" | 
    Sort-Object CreationTime -Descending | 
    Select-Object -Skip 7

if ($oldBackups) {
    Write-Host "🗑️ Cleaning up old backups..."
    $oldBackups | Remove-Item -Force
    Write-Host "✅ Removed $($oldBackups.Count) old backup(s)"
}

# Show current backups
$allBackups = Get-ChildItem -Path $BackupDir -Filter "workspace-*.zip" | 
    Sort-Object CreationTime -Descending

Write-Host ""
Write-Host "📦 Current backups:"
$allBackups | ForEach-Object { 
    $size = [math]::Round($_.Length / 1MB, 2)
    Write-Host "  - $($_.Name) ($size MB)" 
}

Write-Host ""
Write-Host "✨ Backup complete!"
