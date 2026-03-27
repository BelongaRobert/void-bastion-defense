# Terminal Display Feature - Vision & Plan

## Overview
Add a real-time terminal display to DaSage Dashboard that shows:
- Commands being executed
- Command outputs (stdout/stderr)
- Execution status (success/failure)
- Timestamps and duration
- Filterable by type/source

## Use Cases
1. **Transparency**: User sees exactly what I'm doing
2. **Debugging**: Real-time visibility into errors
3. **Learning**: User can see how tasks are accomplished
4. **Monitoring**: Track long-running operations

---

## Architecture

### 1. Command Logger Module
**File**: `src/logger.js`

```javascript
// Intercept and log all exec/execSync calls
// Structure:
{
  id: timestamp-based,
  command: string,
  cwd: working directory,
  startTime: Date,
  endTime: Date,
  duration: ms,
  stdout: string,
  stderr: string,
  exitCode: number,
  status: 'running' | 'success' | 'error'
}
```

### 2. WebSocket Stream
- Emit `command-start` when command begins
- Emit `command-output` for real-time stdout/stderr
- Emit `command-end` with results
- Buffer last 100 commands in memory

### 3. Terminal UI Component
**File**: `public/index.html` (new tab: "Terminal")

Features:
- XTerm.js or custom terminal interface
- Scrollable output buffer
- Syntax highlighting for commands
- Collapsible command groups
- Export/download logs
- Clear/freeze buttons

### 4. Categories/Filtering
- 🟢 System (file operations, health checks)
- 🔵 Git (commits, pushes, status)
- 🟡 Network (API calls, fetches)
- 🔴 Errors (failed commands)
- ⚪ Info (general messages)

---

## Implementation Phases

### Phase 1: Basic Logger (2 hours)
- [ ] Create `src/logger.js`
- [ ] Intercept exec/execSync calls
- [ ] Store last 50 commands
- [ ] Basic API endpoint `/api/terminal`

### Phase 2: Real-time Stream (2 hours)
- [ ] WebSocket events (start/output/end)
- [ ] HTML terminal display
- [ ] Scroll to bottom auto-follow
- [ ] Timestamp formatting

### Phase 3: UI Polish (2 hours)
- [ ] Terminal tab in navigation
- [ ] Command categorization
- [ ] Filter buttons (System/Git/Network/Errors)
- [ ] Collapsible command details
- [ ] Copy command button

### Phase 4: Advanced Features (2 hours)
- [ ] Search/filter by text
- [ ] Export logs to file
- [ ] Pause/resume streaming
- [ ] Command retry button
- [ ] Execution time warnings (>30s)

---

## Technical Details

### Command Interception
Wrap Node.js child_process:

```javascript
import { exec, execSync } from 'child_process';

const originalExec = exec;
const originalExecSync = execSync;

export function loggedExec(command, options, callback) {
  const logEntry = logger.start(command);
  const child = originalExec(command, options, (error, stdout, stderr) => {
    logger.end(logEntry, { error, stdout, stderr });
    callback(error, stdout, stderr);
  });
  return child;
}
```

### Terminal UI Options

**Option A: Simple DIV-based**
- Pros: Easy, lightweight, no dependencies
- Cons: No terminal features

**Option B: XTerm.js**
- Pros: Full terminal emulation, colors, scrollback
- Cons: Heavy, overkill for just logs

**Option C: Custom Component**
- Pros: Tailored for command display, lightweight
- Cons: More development time

**Recommendation**: Option C - Custom component optimized for command logging

### Data Flow
```
Agent executes command
    ↓
Logger intercepts
    ↓
Emit WebSocket event
    ↓
Dashboard receives
    ↓
Terminal UI updates
```

---

## UI Mockup

```
┌────────────────────────────────────────────┐
│ Terminal                                   │
├────────────────────────────────────────────┤
│ [All] [System] [Git] [Network] [Errors]   │
├────────────────────────────────────────────┤
│ 11:05:23 🟢 ls -la                         │
│     drwxr-xr-x  12 user  staff  384 ...   │
│     -rw-r--r--   1 user  staff  2345 ...   │
│                                            │
│ 11:05:24 🔵 git status --short             │
│     M src/server.js                        │
│     ?? docs/new-file.md                    │
│                                            │
│ 11:05:25 🟡 curl http://localhost:3472     │
│     {"status":"online",...}                │
│                                            │
│ 11:05:26 🔴 some-failing-command           │
│     ✗ Command failed: exit code 1          │
│     Error: File not found                  │
│                                            │
│ [Clear] [Export] [Pause]          [▼ Auto] │
└────────────────────────────────────────────┘
```

---

## Security Considerations

⚠️ **Sensitive Data Filtering**
- Filter out tokens/passwords from display
- Redact: `ghp_****`, API keys, `.env` contents
- Configurable filter list

⚠️ **Rate Limiting**
- Max 100 commands in buffer
- Prevent memory exhaustion
- Auto-truncate old entries

---

## Integration with Existing Features

| Feature | Terminal Enhancement |
|---------|---------------------|
| Activity Feed | Terminal shows raw commands |
| Gateway Tab | Terminal shows OpenClaw CLI calls |
| Notifications | Errors appear in terminal + notifications |
| Monitor Tab | Terminal shows connection tracking |

---

## Success Metrics

- [ ] Commands appear within 100ms of execution
- [ ] Terminal scrolls smoothly with 100+ entries
- [ ] Filter changes apply instantly
- [ ] No sensitive data leaked in terminal
- [ ] Works on mobile (condensed view)

---

## Future Enhancements

1. **Command Replay**: Re-run previous commands
2. **Script Generation**: Export session as script
3. **Collaborative**: Multiple users see same terminal
4. **AI Insights**: "This command took 5x longer than usual"
5. **Quick Actions**: Click-to-run common commands

---

## Estimated Timeline

| Phase | Time | Deliverable |
|-------|------|---------------|
| 1 | 2h | Logger + API |
| 2 | 2h | WebSocket + Basic UI |
| 3 | 2h | UI Polish |
| 4 | 2h | Advanced Features |
| **Total** | **8h** | **Full Terminal Feature** |

---

## Priority: HIGH

This feature provides immediate value through transparency and aids in debugging. Recommend starting Phase 1 next.

---

*Vision Document v1.0 - 2026-03-27*
