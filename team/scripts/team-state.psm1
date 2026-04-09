# DaSage Team Mode - State Management
# PowerShell Module for Task State Operations

$script:ConfigPath = "~/.openclaw/workspace/team/team-config.json"
$script:BasePath = "~/.openclaw/workspace/team"

function Get-TeamConfig {
    $config = Get-Content -Path $script:ConfigPath -Raw | ConvertFrom-Json
    return $config
}

function Get-ActiveTasks {
    $activePath = Resolve-Path "$script:BasePath/active"
    $tasks = Get-ChildItem -Path $activePath -Directory | ForEach-Object {
        $stateFile = "$($_.FullName)/state.json"
        if (Test-Path $stateFile) {
            $state = Get-Content $stateFile -Raw | ConvertFrom-Json
            [PSCustomObject]@{
                Id = $_.Name
                Description = $state.description
                Phase = $state.phase
                Status = $state.status
                CreatedAt = $state.createdAt
                UpdatedAt = $state.updatedAt
                Path = $_.FullName
            }
        }
    }
    return $tasks
}

function Get-TaskState($TaskId) {
    $statePath = Resolve-Path "$script:BasePath/active/$TaskId/state.json"
    if (Test-Path $statePath) {
        return Get-Content $statePath -Raw | ConvertFrom-Json
    }
    return $null
}

function Set-TaskState($TaskId, $State) {
    $statePath = Resolve-Path "$script:BasePath/active/$TaskId/state.json"
    $State.updatedAt = (Get-Date).ToString("o")
    $State | ConvertTo-Json -Depth 10 | Set-Content -Path $statePath
}

function New-Task($Description, $Context = @{}) {
    $taskId = [System.Guid]::NewGuid().ToString("N").Substring(0, 8)
    $taskPath = "$script:BasePath/active/$taskId"
    
    New-Item -ItemType Directory -Path $taskPath -Force | Out-Null
    New-Item -ItemType Directory -Path "$taskPath/exec" -Force | Out-Null
    New-Item -ItemType Directory -Path "$taskPath/verify" -Force | Out-Null
    
    $state = @{
        id = $taskId
        description = $Description
        phase = "planning"
        status = "in_progress"
        createdAt = (Get-Date).ToString("o")
        updatedAt = (Get-Date).ToString("o")
        context = $Context
        phases = @{
            planning = @{ status = "in_progress"; startedAt = (Get-Date).ToString("o") }
            exec = @{ status = "pending" }
            verify = @{ status = "pending" }
        }
        artifacts = @()
    }
    
    $state | ConvertTo-Json -Depth 10 | Set-Content -Path "$taskPath/state.json"
    
    return $taskId
}

function Move-Phase($TaskId, $NewPhase) {
    $state = Get-TaskState -TaskId $TaskId
    if (-not $state) { throw "Task not found: $TaskId" }
    
    $oldPhase = $state.phase
    $state.phases.$oldPhase.status = "completed"
    $state.phases.$oldPhase.completedAt = (Get-Date).ToString("o")
    
    $state.phase = $NewPhase
    $state.phases.$NewPhase.status = "in_progress"
    $state.phases.$NewPhase.startedAt = (Get-Date).ToString("o")
    
    Set-TaskState -TaskId $TaskId -State $state
    
    return $state
}

function Complete-Task($TaskId, $Success = $true, $Summary = "") {
    $state = Get-TaskState -TaskId $TaskId
    if (-not $state) { throw "Task not found: $TaskId" }
    
    $currentPhase = $state.phase
    $state.phases.$currentPhase.status = "completed"
    $state.phases.$currentPhase.completedAt = (Get-Date).ToString("o")
    
    $state.phase = "completed"
    $state.status = if ($Success) { "completed" } else { "failed" }
    $state.completedAt = (Get-Date).ToString("o")
    $state.summary = $Summary
    
    Set-TaskState -TaskId $TaskId -State $state
    
    # Archive if configured
    $config = Get-TeamConfig
    if ($config.settings.autoArchive) {
        $source = Resolve-Path "$script:BasePath/active/$TaskId"
        $dest = Resolve-Path "$script:BasePath/archive"
        Move-Item -Path $source -Destination "$dest/$TaskId" -Force
    }
    
    return $state
}

Export-ModuleMember -Function Get-TeamConfig, Get-ActiveTasks, Get-TaskState, Set-TaskState, New-Task, Move-Phase, Complete-Task
