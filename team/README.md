# DaSage Team Mode - CLI Commands

PowerShell script for Team Mode operations.

## Commands

### team-create
Create a new task
```powershell
./team-cli.ps1 create "Implement JWT authentication"
```

### team-status
Show all active tasks
```powershell
./team-cli.ps1 status
```

### team-show
Show specific task details
```powershell
./team-cli.ps1 show {task-id}
```

### team-archive
Manually archive a completed task
```powershell
./team-cli.ps1 archive {task-id}
```

## Usage with OpenClaw

Tasks can be created via OpenClaw sessions:
```
Create a team task: "Build user authentication"
```

The DaSage will:
1. Create the task structure
2. Spawn Planner agent
3. Progress through phases automatically
4. Notify via Notification_bot when complete
