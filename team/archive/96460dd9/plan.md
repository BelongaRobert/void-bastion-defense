# Plan: Team Mode CLI Implementation

## Overview
Build a functional Team Mode CLI that integrates with OpenClaw's subagent system to enable multi-phase task execution (planning → execution → verification). The CLI must support creating tasks, running the pipeline, and monitoring status.

## Requirements

### Core CLI Commands
- [ ] `team create "<description>"` - Create new task via PowerShell module
- [ ] `team run <task-id>` - Execute full pipeline (planning → exec → verify)
- [ ] `team status` - List all active tasks with current phase
- [ ] `team show <task-id>` - Display detailed task information
- [ ] `team cancel <task-id>` - Cancel and optionally archive a task

### Phase Execution
- [ ] Each phase spawns appropriate subagent via `openclaw sessions:spawn`
- [ ] Automatic phase chaining (planning → exec → verify)
- [ ] State persistence between phases via state.json
- [ ] Phase retry logic with configurable max attempts

### Integration Requirements
- [ ] Parse `team-config.json` for agent configurations
- [ ] Load phase-specific templates from `templates/`
- [ ] Read/write task state via `team-state.psm1` PowerShell module
- [ ] Proper working directory context for each subagent

### Error Handling
- [ ] Handle missing task IDs gracefully
- [ ] Handle failed phase execution with retry option
- [ ] Validate required files exist before proceeding (e.g., plan.md before exec)
- [ ] Clear error messages for common failure modes

### User Experience
- [ ] Colorized terminal output
- [ ] Progress indicators during phase execution
- [ ] Summary output after pipeline completion
- [ ] Artifact listing (files created by each phase)

## Architecture

### Component Diagram
```
┌─────────────────┐
│   team-cli.ps1  │  ← Main CLI entry point
│   (PowerShell)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Command Router         │
│  create | run | status  │
└────────┬────────────────┘
         │
    ┌────┴────┬──────────┐
    ▼         ▼          ▼
┌────────┐ ┌────────┐ ┌────────────┐
│Create  │ │Run     │ │Status/Show │
│Task    │ │Pipeline│ │Queries     │
└────┬───┘ └────┬───┘ └─────┬──────┘
     │          │           │
     ▼          ▼           ▼
┌─────────────────────────────────────────┐
│      team-state.psm1 (PowerShell)      │
│  New-Task | Get-TaskState | Move-Phase  │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│   openclaw-integration.js (Node.js)      │
│  spawnSubagent | runPipeline | buildCtx │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│      openclaw sessions:spawn            │
│  Actual subagent spawning via OpenClaw  │
└─────────────────────────────────────────┘
```

### File Structure
```
team/
├── bin/
│   └── openclaw-team.ps1          # Wrapper for global `team` command
├── scripts/
│   ├── team-cli.ps1               # Main CLI (current - needs refinement)
│   ├── team-state.psm1            # State management (current - working)
│   └── show-status.ps1            # Status helper
├── lib/
│   └── openclaw-integration.js    # OpenClaw integration (needs refinement)
├── templates/
│   ├── planner.md                 # Planner agent template
│   ├── executor.md                # Executor agent template
│   ├── verifier.md                # Verifier agent template
│   ├── planner-prompt.md          # Prompt wrapper
│   ├── executor-prompt.md         # Prompt wrapper
│   └── verifier-prompt.md       # Prompt wrapper
└── active/
    └── {task-id}/
        ├── state.json             # Task state
        ├── plan.md                # Planner output
        ├── exec/                  # Executor output
        ├── verify/
        │   └── report.json        # Verifier output
        └── {phase}-prompt.txt     # Generated prompt for each phase
```

### State Management Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   PENDING   │───▶│ IN_PROGRESS │───▶│  COMPLETED  │───▶│   ARCHIVED  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │   FAILED    │
                   └─────────────┘
```

## Implementation Steps

### Phase 1: CLI Command Router Enhancement
1. **Argument Parsing**
   - Parse command + subcommand structure
   - Validate required arguments
   - Support `-h/--help` for each command

2. **Command Dispatch**
   ```powershell
   switch ($Command) {
       "create" { Invoke-TeamCreate }
       "run" { Invoke-TeamRun }
       "status" { Invoke-TeamStatus }
       "show" { Invoke-TeamShow }
       "cancel" { Invoke-TeamCancel }
       default { Show-TeamHelp }
   }
   ```

3. **Color/Output Utilities**
   - Standardize color scheme across commands
   - Add progress spinners for long operations
   - Implement table formatting for status lists

### Phase 2: OpenClaw Integration Refinement
1. **Fix Command Syntax**
   - Current: `openclaw subagent spawn` (incorrect)
   - Correct: `openclaw sessions:spawn --runtime agent ...`

2. **Implement Actual Spawning**
   ```javascript
   // lib/openclaw-integration.js
   async function spawnPhaseAgent(taskId, phase) {
       const config = await loadConfig();
       const state = await loadTaskState(taskId);
       
       // Build agent context
       const context = buildAgentContext(taskId, phase, config, state);
       
       // Spawn via OpenClaw CLI
       const cmd = `openclaw sessions:spawn` +
                   ` --runtime agent` +
                   ` --label "team-${taskId}-${phase}"` +
                   ` --task "${escapeShellArg(context)}"`;
       
       return execAsync(cmd);
   }
   ```

3. **Context Building**
   - Merge template + task state + phase-specific data
   - Include working directory instructions
   - Add artifact output paths

### Phase 3: Phase Execution Flow
1. **Sequential Phase Runner**
   ```
   planning → exec → verify → completed
   ```

2. **Phase Execution Logic**
   ```powershell
   function Invoke-TeamRun($TaskId) {
       $state = Get-TaskState -TaskId $TaskId
       $phases = @("planning", "exec", "verify")
       $startIdx = $phases.IndexOf($state.phase)
       
       foreach ($phase in $phases[$startIdx..-1]) {
           Update-PhaseStatus -TaskId $TaskId -Phase $phase -Status "in_progress"
           
           $result = node lib/openclaw-integration.js spawn $TaskId $phase
           
           if ($result.ExitCode -ne 0) {
               Handle-PhaseFailure -TaskId $TaskId -Phase $phase -Error $result.Stderr
               break
           }
           
           Update-PhaseStatus -TaskId $TaskId -Phase $phase -Status "completed"
       }
   }
   ```

3. **Phase Validation**
   - Before exec: Verify plan.md exists
   - Before verify: Verify exec/ directory exists and has files
   - Post-verify: Check verify/report.json exists

### Phase 4: Subagent Spawning Strategy
1. **Spawn Options**
   - Use `--runtime agent` for subagent sessions
   - Label format: `team-{task-id}-{phase}`
   - Pass full context as task description

2. **Context Template**
   ```markdown
   # Team Mode Task Context
   
   **Task ID:** {taskId}
   **Phase:** {phase}
   **Description:** {description}
   
   ## Instructions
   {template_content}
   
   ---
   
   **Working Directory:** ~/.openclaw/workspace/team/active/{taskId}/
   **Output:** Write results to appropriate location
   ```

3. **Phase-Specific Instructions**
   - Planning: Output to `plan.md`
   - Exec: Output to `exec/` directory
   - Verify: Output to `verify/report.json`

### Phase 5: Error Handling & Retry Logic
1. **Retry Configuration**
   ```json
   // team-config.json
   {
     "settings": {
       "maxRetries": 3,
       "retryDelay": 5000
     }
   }
   ```

2. **Retry Logic**
   ```javascript
   async function runWithRetry(fn, maxRetries) {
       for (let i = 0; i < maxRetries; i++) {
           try {
               return await fn();
           } catch (err) {
               if (i === maxRetries - 1) throw err;
               await delay(config.settings.retryDelay);
           }
       }
   }
   ```

3. **Failure Modes**
   - Phase timeout → Retry with extended timeout
   - Missing artifacts → Re-run previous phase
   - Subagent crash → Clean up and retry

### Phase 6: Testing Approach
1. **Unit Tests**
   - Test command parsing
   - Test state transitions
   - Test context building

2. **Integration Tests**
   - Test full pipeline with mock subagent
   - Test error recovery
   - Test concurrent task handling

3. **Manual Tests**
   ```bash
   # Test 1: Create task
   team create "Test task implementation"
   
   # Test 2: Run pipeline
   team run <task-id>
   
   # Test 3: Check status
   team status
   
   # Test 4: View details
   team show <task-id>
   ```

## Success Criteria
- [ ] All 5 CLI commands work end-to-end
- [ ] `team create` initializes task with correct state
- [ ] `team run` spawns subagents and chains phases
- [ ] `team status` shows accurate task list
- [ ] `team show` displays complete task details
- [ ] Failed phases can be retried
- [ ] Completed tasks auto-archive (if configured)

## Notes

### Critical Implementation Details
1. **Working Directory**: Each subagent must receive correct working directory path
2. **State Synchronization**: Node.js and PowerShell must use same state.json format
3. **Template Loading**: Support both .md templates and phase-specific prompt wrappers
4. **Signal Handling**: Graceful shutdown on Ctrl+C during pipeline execution

### Open Questions
1. Should `team run` wait for subagent completion or spawn async?
2. How to handle subagent output streaming back to CLI?
3. Should failed phases auto-retry or require manual intervention?

### Dependencies
- OpenClaw CLI with `sessions:spawn` support
- Node.js for integration layer
- PowerShell 5.1+ for state module

### Risks
- OpenClaw subagent spawning API may change
- Phase timeouts need careful tuning
- Concurrent task execution may hit resource limits
