#!/usr/bin/env pwsh
Import-Module ~/.openclaw/workspace/team/scripts/team-state.psm1 -Force

Write-Host '=== DaSage Team Mode ===' -ForegroundColor Green
Write-Host ''

# Show active tasks
$tasks = Get-ActiveTasks
if ($tasks) {
    Write-Host 'Active Tasks:' -ForegroundColor Cyan
    $tasks | Format-Table Id, Phase, Status, @{Name='Description'; Expression={$_.Description.Substring(0, [Math]::Min(50, $_.Description.Length))}} -AutoSize
} else {
    Write-Host 'No active tasks' -ForegroundColor DarkGray
}

Write-Host ''
Write-Host 'Team CLI Commands:' -ForegroundColor Yellow
Write-Host '  team create "description"   - Create new task'
Write-Host '  team run task-id          - Run pipeline'
Write-Host '  team status               - Show tasks'
