#!/usr/bin/env pwsh
<#
.SYNOPSIS
    DaSage Team Mode CLI - Multi-Agent Task Pipeline
.DESCRIPTION
    CLI for creating and managing tasks through the plan→exec→verify pipeline
    FIXED: Now properly spawns subagents and chains phases automatically
.EXAMPLE
    ./team-cli.ps1 create "Implement user authentication"
    ./team-cli.ps1 run abc12345
    ./team-cli.ps1 status
#>

param(
    [Parameter(Position=0)]
    [ValidateSet("create", "run", "status", "list", "show", "cancel", "spawn", "help")]
    [string]$Command = "help",
    
    [Parameter(Position=1, ValueFromRemainingArguments=$true)]
    [string[]]$Arguments
)

# Configuration
$script:BasePath = Resolve-Path "$PSScriptRoot/.."
$script:ActivePath = "$BasePath/active"
$script:ArchivePath = "$BasePath/archive"
$script:ConfigPath = "$BasePath/team-config.json"
$script:LibPath = "$BasePath/lib"

# Colors
$Colors = @{
    Reset = "`e[0m"
    Bright = "`e[1m"
    Dim = "`e[2m"
    Red = "`e[31m"
    Green = "`e[32m"
    Yellow = "`e[33m"
    Blue = "`e[34m"
    Magenta = "`e[35m"
    Cyan = "`e[36m"
}

function Write-Color($Text, $Color) {
    Write-Host "$Color$Text$($Colors.Reset)" -NoNewline
}

function Write-Header($Text) {
    Write-Host ""
    Write-Color "=== $Text ===" $Colors.Bright
    Write-Color $Colors.Green
    Write-Host ""
}

function Import-TeamModule {
    $modulePath = "$PSScriptRoot/team-state.psm1"
    if (-not (Get-Module TeamState)) {
        Import-Module $modulePath -Force -Global
    }
}

function Show-Help {
    Write-Header "DaSage Team Mode"
    Write-Host @"
Usage: team <command> [options]

Commands:
  create "<description>"    Create a new task
  run <task-id>            Run full pipeline (plan → exec → verify)
  spawn <task-id> <phase>  Spawn a specific phase subagent directly
  status                   Show all active tasks
  list                     Alias for status
  show <task-id>           Show detailed task info
  cancel <task-id>         Cancel/delete a task
  help                     Show this help

Examples:
  team create "Implement JWT authentication"
  team run a1b2c3d4
  team spawn a1b2c3d4 exec
  team status

Configuration:
  Config: $script:ConfigPath
  Active: $script:ActivePath
  Archive: $script:ArchivePath
  Lib: $script:LibPath

Environment:
  TEAM_BASE                Override base path
"@
}

function Invoke-Create {
    param([string[]]$Args)
    
    $description = $Args -join " "
    if (-not $description) {
        Write-Color "Error: Description required`n" $Colors.Red
        Show-Help
        exit 1
    }
    
    Import-TeamModule
    
    Write-Color "Creating task..." $Colors.Yellow
    Write-Host ""
    
    $taskId = New-Task -Description $description
    
    Write-Color "✓ Task created: " $Colors.Green
    Write-Color $taskId $Colors.Cyan
    Write-Host ""
    Write-Host "Description: $description"
    Write-Host ""
    Write-Color "Next: Run 'team run $taskId' to start the pipeline" $Colors.Dim
    Write-Host ""
}

function Invoke-Run {
    param([string[]]$Args)
    
    $taskId = $Args[0]
    if (-not $taskId) {
        Write-Color "Error: Task ID required`n" $Colors.Red
        Show-Help
        exit 1
    }
    
    Import-TeamModule
    
    $state = Get-TaskState -TaskId $taskId
    if (-not $state) {
        Write-Color "Error: Task not found: $taskId`n" $Colors.Red
        exit 1
    }
    
    Write-Header "Team Mode Pipeline"
    Write-Host "Task: " -NoNewline
    Write-Color $taskId $Colors.Cyan
    Write-Host ""
    Write-Host "Description: $($state.description)"
    Write-Host ""
    
    # Check for plan.md if past planning
    $planPath = "$script:ActivePath/$taskId/plan.md"
    $hasPlan = Test-Path $planPath
    
    if (-not $hasPlan -and $state.phase -ne "planning") {
        Write-Color "Warning: No plan.md found. Resetting to planning phase.`n" $Colors.Yellow
        $state.phase = "planning"
        $state.phases.exec.status = "pending"
        $state.phases.verify.status = "pending"
        Set-TaskState -TaskId $taskId -State $state
    }
    
    # Determine starting phase
    $phases = @("planning", "exec", "verify")
    $startIdx = $phases.IndexOf($state.phase)
    if ($startIdx -lt 0) { $startIdx = 0 }
    
    $remainingPhases = $phases[$startIdx..($phases.Count-1)]
    
    Write-Color "Phases: " $Colors.Dim
    Write-Host ($remainingPhases -join " → ")
    Write-Host ""
    
    # Run each phase using Node.js integration layer
    foreach ($phase in $remainingPhases) {
        Write-Color "▶ Phase: $phase" $Colors.Yellow
        Write-Host ""
        
        $result = Invoke-PhaseNode -TaskId $taskId -Phase $phase -State $state
        
        if (-not $result) {
            Write-Color "✗ Phase $phase failed" $Colors.Red
            Write-Host ""
            Write-Color "Task $taskId remains in phase: $phase" $Colors.Yellow
            exit 1
        }
        
        Write-Color "✓ Phase $phase complete" $Colors.Green
        Write-Host ""
    }
    
    Write-Header "Pipeline Complete"
    Write-Color "Task: " $Colors.Dim
    Write-Color $taskId $Colors.Cyan
    Write-Host ""
    Write-Host "Status: " -NoNewline
    Write-Color "COMPLETED" $Colors.Green
    Write-Host ""
    
    # Show artifacts
    $execDir = "$script:ActivePath/$taskId/exec"
    if (Test-Path $execDir) {
        $files = Get-ChildItem $execDir -Recurse -File | Select-Object -ExpandProperty Name
        if ($files) {
            Write-Color "Artifacts:" $Colors.Bright
            $files | ForEach-Object { Write-Host "  - $_" }
        }
    }
}

<#
.SYNOPSIS
    Invoke a phase using the Node.js integration layer
.DESCRIPTION
    This function actually spawns the subagent via openclaw-integration.js
    and waits for completion. It properly handles the working directory
    context and phase-specific requirements.
#>
function Invoke-PhaseNode {
    param(
        [string]$TaskId,
        [string]$Phase,
        [object]$State
    )
    
    # Update state to in_progress
    $State.phase = $Phase
    if (-not $State.phases.$Phase) {
        $State.phases.$Phase = @{}
    }
    $State.phases.$Phase.status = "in_progress"
    $State.phases.$Phase.startedAt = (Get-Date).ToString("o")
    Set-TaskState -TaskId $TaskId -State $State
    
    $taskPath = "$script:ActivePath/$TaskId"
    
    # Validate prerequisites
    if ($Phase -eq "exec") {
        if (-not (Test-Path "$taskPath/plan.md")) {
            Write-Color "  Error: plan.md required before exec phase" $Colors.Red
            return $false
        }
    }
    
    if ($Phase -eq "verify") {
        if (-not (Test-Path "$taskPath/exec")) {
            Write-Color "  Error: exec/ directory required before verify phase" $Colors.Red
            return $false
        }
        $execFiles = Get-ChildItem "$taskPath/exec" -Recurse -File -ErrorAction SilentlyContinue
        if (-not $execFiles) {
            Write-Color "  Error: exec/ directory must contain files" $Colors.Red
            return $false
        }
    }
    
    Write-Color "  Starting subagent..." $Colors.Yellow
    Write-Host ""
    
    # Build the Node.js command to spawn the subagent
    # This calls openclaw-integration.js which properly handles the sessions:spawn
    $nodePath = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodePath) {
        Write-Color "  Error: Node.js not found in PATH" $Colors.Red
        return $false
    }
    
    $integrationScript = "$script:LibPath/openclaw-integration.js"
    if (-not (Test-Path $integrationScript)) {
        Write-Color "  Error: Integration script not found: $integrationScript" $Colors.Red
        return $false
    }
    
    # Build spawn command arguments
    $spawnArgs = @("$integrationScript", "spawn", $TaskId, $Phase)
    
    Write-Color "  Command: node $($spawnArgs -join ' ')" $Colors.Dim
    Write-Host ""
    
    # Set environment variables for the subagent
    $env:TEAM_TASK_ID = $TaskId
    $env:TEAM_PHASE = $Phase
    $env:TEAM_BASE = $script:BasePath
    
    try {
        # Start the Node.js process which will spawn the subagent
        $process = Start-Process -FilePath "node" -ArgumentList $spawnArgs -WorkingDirectory $taskPath -PassThru -Wait -NoNewWindow
        
        Write-Color "  Subagent process exited with code: $($process.ExitCode)" $Colors.Dim
        Write-Host ""
        
        if ($process.ExitCode -ne 0) {
            Write-Color "  Subagent execution failed" $Colors.Red
            return $false
        }
        
        # Reload state to check if subagent marked phase complete
        $newState = Get-TaskState -TaskId $TaskId
        
        if ($newState.phases.$Phase.status -eq "completed") {
            Write-Color "  Phase marked complete by subagent" $Colors.Green
            return $true
        } else {
            # Check for expected output files as fallback
            $outputValid = $false
            
            if ($Phase -eq "planning") {
                $outputValid = Test-Path "$taskPath/plan.md"
            } elseif ($Phase -eq "exec") {
                $outputValid = (Test-Path "$taskPath/exec") -and ((Get-ChildItem "$taskPath/exec" -Recurse -File).Count -gt 0)
            } elseif ($Phase -eq "verify") {
                $outputValid = Test-Path "$taskPath/verify/report.json"
            }
            
            if ($outputValid) {
                Write-Color "  Output files validated, marking complete" $Colors.Green
                $newState.phases.$Phase.status = "completed"
                $newState.phases.$Phase.completedAt = (Get-Date).ToString("o")
                Set-TaskState -TaskId $TaskId -State $newState
                return $true
            } else {
                Write-Color "  Phase incomplete - no output files found" $Colors.Red
                return $false
            }
        }
    }
    catch {
        Write-Color "  Error spawning subagent: $_" $Colors.Red
        return $false
    }
    finally {
        # Clean up environment
        Remove-Item Env:\TEAM_TASK_ID -ErrorAction SilentlyContinue
        Remove-Item Env:\TEAM_PHASE -ErrorAction SilentlyContinue
        Remove-Item Env:\TEAM_BASE -ErrorAction SilentlyContinue
    }
}

<#
.SYNOPSIS
    Directly spawn a subagent for a specific phase
.DESCRIPTION
    This is a convenience command to spawn just one phase without
    running the full pipeline. Useful for debugging or resuming.
#>
function Invoke-Spawn {
    param([string[]]$Args)
    
    $taskId = $Args[0]
    $phase = $Args[1]
    
    if (-not $taskId -or -not $phase) {
        Write-Color "Error: Task ID and phase required`n" $Colors.Red
        Write-Host "Usage: team spawn <task-id> <phase>"
        Write-Host "       phase: planning | exec | verify"
        exit 1
    }
    
    Import-TeamModule
    
    $state = Get-TaskState -TaskId $taskId
    if (-not $state) {
        Write-Color "Error: Task not found: $taskId`n" $Colors.Red
        exit 1
    }
    
    Write-Header "Spawning $phase Agent"
    Write-Host "Task: " -NoNewline
    Write-Color $taskId $Colors.Cyan
    Write-Host ""
    Write-Host "Phase: $phase"
    Write-Host ""
    
    $result = Invoke-PhaseNode -TaskId $taskId -Phase $phase -State $state
    
    if ($result) {
        Write-Color "✓ Agent spawned successfully" $Colors.Green
    } else {
        Write-Color "✗ Agent spawn failed" $Colors.Red
        exit 1
    }
}

function Invoke-Status {
    Import-TeamModule
    
    $tasks = Get-ActiveTasks
    
    if (-not $tasks) {
        Write-Color "No active tasks.`n" $Colors.Dim
        Write-Color "Create one with: team create `"<description>`"`n" $Colors.Dim
        return
    }
    
    Write-Header "Active Tasks"
    
    # Header
    Write-Color "ID        Phase       Status      Description" $Colors.Bright
    Write-Host ("-" * 70)
    
    $tasks | Sort-Object CreatedAt -Descending | ForEach-Object {
        $statusColor = switch ($_.Status) {
            "completed" { $Colors.Green }
            "in_progress" { $Colors.Yellow }
            "failed" { $Colors.Red }
            "cancelled" { $Colors.Red }
            default { $Colors.Dim }
        }
        
        $phaseColor = switch ($_.Phase) {
            "completed" { $Colors.Green }
            "planning" { $Colors.Blue }
            "exec" { $Colors.Magenta }
            "verify" { $Colors.Cyan }
            default { $Colors.Yellow }
        }
        
        $desc = $_.Description
        if ($desc.Length -gt 35) { $desc = $desc.Substring(0, 32) + "..." }
        
        Write-Color $_.Id.PadEnd(10) $Colors.Cyan
        Write-Host " " -NoNewline
        Write-Color $_.Phase.PadEnd(11) $phaseColor
        Write-Host " " -NoNewline
        Write-Color $_.Status.PadEnd(11) $statusColor
        Write-Host " $desc"
    }
    Write-Host ""
}

function Invoke-Show {
    param([string[]]$Args)
    
    $taskId = $Args[0]
    if (-not $taskId) {
        Write-Color "Error: Task ID required`n" $Colors.Red
        return
    }
    
    Import-TeamModule
    $state = Get-TaskState -TaskId $taskId
    
    if (-not $state) {
        Write-Color "Task not found: $taskId`n" $Colors.Red
        return
    }
    
    Write-Header "Task: $taskId"
    
    Write-Host "Description: $($state.description)"
    Write-Host "Phase: $($state.phase)"
    Write-Host "Status: $($state.status)"
    Write-Host "Created: $($state.createdAt)"
    if ($state.completedAt) {
        Write-Host "Completed: $($state.completedAt)"
    }
    Write-Host ""
    
    Write-Color "Phase Status:" $Colors.Bright
    $state.phases.PSObject.Properties | ForEach-Object {
        $name = $_.Name
        $phase = $_.Value
        $phaseStatus = if ($phase.status) { $phase.status } else { "pending" }
        $color = switch ($phaseStatus) {
            "completed" { $Colors.Green }
            "in_progress" { $Colors.Yellow }
            "failed" { $Colors.Red }
            default { $Colors.Dim }
        }
        Write-Host "  $name`: " -NoNewline
        Write-Color $phaseStatus $color
        
        if ($phase.startedAt) {
            Write-Color "    Started: $($phase.startedAt)" $Colors.Dim
        }
        if ($phase.completedAt) {
            Write-Color "    Completed: $($phase.completedAt)" $Colors.Dim
        }
    }
    
    Write-Host ""
    
    # Show files
    $taskPath = "$script:ActivePath/$taskId"
    $planExists = Test-Path "$taskPath/plan.md"
    $execExists = Test-Path "$taskPath/exec"
    $verifyExists = Test-Path "$taskPath/verify/report.json"
    $promptExists = Test-Path "$taskPath/*-prompt.txt"
    
    Write-Color "Artifacts:" $Colors.Bright
    Write-Host "  plan.md: $(if ($planExists) { Write-Color '✓' $Colors.Green -NoNewline; '' } else { '✗' })"
    Write-Host "  exec/: $(if ($execExists) { 
        $count = (Get-ChildItem "$taskPath/exec" -Recurse -File).Count
        Write-Color "✓ ($count files)" $Colors.Green -NoNewline; '' 
    } else { '✗' })"
    Write-Host "  verify/report.json: $(if ($verifyExists) { Write-Color '✓' $Colors.Green -NoNewline; '' } else { '✗' })"
    
    Write-Host ""
    Write-Color "Prompt Files:" $Colors.Bright
    Get-ChildItem "$taskPath" -Filter "*-prompt.txt" -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "  $($_.Name) ($(($_.Length / 1KB).ToString('F1')) KB)"
    }
}

function Invoke-Cancel {
    param([string[]]$Args)
    
    $taskId = $Args[0]
    if (-not $taskId) {
        Write-Color "Error: Task ID required`n" $Colors.Red
        return
    }
    
    Import-TeamModule
    $state = Get-TaskState -TaskId $taskId
    
    if (-not $state) {
        Write-Color "Task not found: $taskId`n" $Colors.Red
        return
    }
    
    # Confirm
    Write-Color "Cancel task $taskId? (y/N): " $Colors.Yellow -NoNewline
    $confirm = Read-Host
    if ($confirm -notmatch "^[Yy]") {
        Write-Color "Cancelled.`n" $Colors.Dim
        return
    }
    
    # Update state
    $state.status = "cancelled"
    $state.cancelledAt = (Get-Date).ToString("o")
    Set-TaskState -TaskId $taskId -State $state
    
    Write-Color "Task $taskId cancelled`n" $Colors.Yellow
    
    # Archive
    $config = Get-TeamConfig
    if ($config.settings.autoArchive) {
        $source = Resolve-Path "$script:ActivePath/$taskId"
        $dest = "$script:ArchivePath/$taskId"
        if (-not (Test-Path $script:ArchivePath)) {
            New-Item -ItemType Directory -Path $script:ArchivePath -Force | Out-Null
        }
        Move-Item -Path $source -Destination $dest -Force
        Write-Color "Archived to: $dest`n" $Colors.Dim
    }
}

# Main dispatcher
switch ($Command) {
    "create" { Invoke-Create -Args $Arguments }
    "run" { Invoke-Run -Args $Arguments }
    "spawn" { Invoke-Spawn -Args $Arguments }
    "status" { Invoke-Status }
    "list" { Invoke-Status }
    "show" { Invoke-Show -Args $Arguments }
    "cancel" { Invoke-Cancel -Args $Arguments }
    "help" { Show-Help }
    default { Show-Help }
}
