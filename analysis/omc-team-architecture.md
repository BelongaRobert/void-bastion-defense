# Oh-My-ClaudeCode Team Architecture Analysis

## Executive Summary

This document analyzes the Team mode architecture patterns from the oh-my-claudecode (OMC) repository for potential integration into DaSage's multi-agent system. The architecture is sophisticated but contains both valuable patterns and potentially over-engineered components.

## 1. Team Pipeline Structure

### Core Pipeline Loop

OMC implements a canonical staged pipeline with clear transitions:

```
team-plan → team-prd → team-exec → team-verify → team-fix (loop)
```

**Phase Transition Rules** (from `src/team/phase-controller.ts`):

```typescript
export type TeamPhase =
  | 'initializing'
  | 'planning'
  | 'executing'
  | 'fixing'
  | 'completed'
  | 'failed';

export function inferPhase(tasks: PhaseableTask[]): TeamPhase {
  if (tasks.length === 0) return 'initializing';
  
  const inProgress = tasks.filter(t => t.status === 'in_progress');
  const pending = tasks.filter(t => t.status === 'pending');
  const permanentlyFailed = tasks.filter(
    t => t.status === 'completed' && t.metadata?.permanentlyFailed === true
  );
  
  // Rule 2: Any in_progress → executing
  if (inProgress.length > 0) return 'executing';
  
  // Rule 3: All pending, nothing else → planning
  if (pending.length === tasks.length) return 'planning';
  
  // Rule 6: Failed with retries remaining → fixing
  if (allFailed.length > 0 && hasRetriesRemaining) return 'fixing';
  
  // Rule 8: All genuinely completed → completed
  if (genuinelyCompleted.length === tasks.length) return 'completed';
}
```

**Key Insight**: The phase controller uses rule-based inference from task status distribution rather than explicit state machine transitions. This is elegant but less explicit than a formal state machine.

---

## 2. State Management

### File-Based State System

OMC uses a hierarchical file-based state system under `.omc/state/team/{teamName}/`:

```
.omc/state/team/{teamName}/
├── config.json                    # Team configuration
├── shutdown.json                  # Team shutdown signal
├── manifest.json                  # Team manifest (V2)
├── phase-state.json              # Current pipeline phase
├── events.jsonl                  # Append-only event log
├── monitor-snapshot.json         # Last monitor state
├── summary-snapshot.json         # Team summary cache
├── tasks/
│   └── task-{taskId}.json        # Individual task files
├── workers/
│   └── {workerName}/
│       ├── heartbeat.json        # Worker liveness
│       ├── status.json           # Worker state
│       ├── inbox.md              # Leader→Worker messages
│       ├── outbox.jsonl          # Worker→Leader messages
│       ├── .ready                # Startup sentinel
│       ├── AGENTS.md             # Worker overlay context
│       ├── shutdown-ack.json     # Shutdown acknowledgment
│       └── identity.json         # Worker identity
├── mailbox/
│   └── {workerName}.json         # Worker mailboxes
└── dispatch/
    └── requests.json             # Dispatch queue
```

### State Paths Abstraction

**Critical Pattern** - Centralized path management:

```typescript
// src/team/state-paths.ts
export const TeamPaths = {
  root: (teamName: string) =>
    `.omc/state/team/${teamName}`,

  taskFile: (teamName: string, taskId: string) =>
    `.omc/state/team/${teamName}/tasks/${normalizeTaskFileStem(taskId)}.json`,

  workerDir: (teamName: string, workerName: string) =>
    `.omc/state/team/${teamName}/workers/${workerName}`,

  heartbeat: (teamName: string, workerName: string) =>
    `.omc/state/team/${teamName}/workers/${workerName}/heartbeat.json`,

  inbox: (teamName: string, workerName: string) =>
    `.omc/state/team/${teamName}/workers/${workerName}/inbox.md`,

  outbox: (teamName: string, workerName: string) =>
    `.omc/state/team/${teamName}/workers/${workerName}/outbox.jsonl`,
    
  // ... 20+ more path builders
} as const;
```

**Value**: This prevents path drift and makes the state layout self-documenting.

### Task Status Transitions

```typescript
// src/team/contracts.ts
export const TEAM_TASK_STATUSES = ['pending', 'blocked', 'in_progress', 'completed', 'failed'] as const;

export const TEAM_TASK_STATUS_TRANSITIONS: Readonly<Record<TeamTaskStatus, readonly TeamTaskStatus[]>> = {
  pending: [],
  blocked: [],
  in_progress: ['completed', 'failed'],
  completed: [],
  failed: [],
};

export function canTransitionTeamTaskStatus(from: TeamTaskStatus, to: TeamTaskStatus): boolean {
  return TEAM_TASK_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
```

**Task File Schema**:
```typescript
interface TaskFile {
  id: string;
  subject: string;
  description: string;
  status: TeamTaskStatus;
  owner: string;
  blocks: string[];       // Tasks this task blocks
  blockedBy: string[];   // Tasks blocking this task
  claimedBy?: string;
  claimedAt?: number;
  claimPid?: number;
  metadata?: Record<string, unknown>;
}
```

**Dependency Resolution**:
```typescript
export function areBlockersResolved(teamName: string, blockedBy: string[]): boolean {
  if (!blockedBy || blockedBy.length === 0) return true;
  for (const blockerId of blockedBy) {
    const blocker = readTask(teamName, blockerId);
    if (!blocker || blocker.status !== 'completed') return false;
  }
  return true;
}
```

---

## 3. Worker Communication Patterns

### Inbox/Outbox JSONL Messaging

**Inbox** (Leader → Worker): Markdown file with structured messages
```typescript
interface InboxMessage {
  type: 'message' | 'context';
  content: string;
  timestamp: string;
}
```

**Outbox** (Worker → Leader): JSONL with event types
```typescript
interface OutboxMessage {
  type: 'ready' | 'task_complete' | 'task_failed' | 'idle' | 
        'shutdown_ack' | 'drain_ack' | 'heartbeat' | 'error' | 
        'all_tasks_complete';
  taskId?: string;
  summary?: string;
  error?: string;
  timestamp: string;
}
```

### Heartbeat System

```typescript
// src/team/heartbeat.ts
interface HeartbeatData {
  workerName: string;
  teamName: string;
  provider: 'codex' | 'gemini' | 'claude';
  pid: number;
  lastPollAt: string;       // ISO timestamp
  currentTaskId?: string;   // Currently executing task
  consecutiveErrors: number; // Self-quarantine threshold
  status: 'ready' | 'polling' | 'executing' | 'shutdown' | 'quarantined';
}

// Liveness check with configurable staleness
export function isWorkerAlive(
  workingDirectory: string,
  teamName: string, 
  workerName: string,
  maxAgeMs: number
): boolean {
  const heartbeat = readHeartbeat(workingDirectory, teamName, workerName);
  if (!heartbeat) return false;
  
  const lastPoll = new Date(heartbeat.lastPollAt).getTime();
  return (Date.now() - lastPoll) < maxAgeMs;
}
```

### Event System

Append-only JSONL event log for observability:

```typescript
// src/team/events.ts
interface TeamEvent {
  event_id: string;
  team: string;
  type: 'task_completed' | 'task_failed' | 'worker_idle' | 
        'worker_stopped' | 'message_received' | 'shutdown_ack' | 
        'shutdown_gate' | 'approval_decision' | 'team_leader_nudge';
  worker: string;
  task_id?: string;
  message_id?: string | null;
  reason?: string;
  created_at: string;
}

export async function appendTeamEvent(
  teamName: string,
  event: Omit<TeamEvent, 'event_id' | 'created_at' | 'team'>,
  cwd: string,
): Promise<TeamEvent> {
  const full: TeamEvent = {
    event_id: randomUUID(),
    team: teamName,
    created_at: new Date().toISOString(),
    ...event,
  };
  // Atomic append (O_WRONLY|O_APPEND|O_CREAT)
  await appendFile(p, `${JSON.stringify(full)}\n`, 'utf8');
  return full;
}
```

---

## 4. Worker System

### Worker Bootstrap & AGENTS.md Overlay

Workers receive context via dynamically generated AGENTS.md overlays:

```typescript
// src/team/worker-bootstrap.ts
export function generateWorkerOverlay(params: WorkerBootstrapParams): string {
  return `# Team Worker Protocol

You are a **team worker**, not the team leader.

## MANDATORY WORKFLOW
1. **Claim** task: \`omc team api claim-task ...\`
2. **Do the work**
3. **Send ACK** to leader
4. **Transition** task status (REQUIRED before exit)

## Identity
- **Team**: ${teamName}
- **Worker**: ${workerName}
- **Environment**: OMC_TEAM_WORKER=${teamName}/${workerName}

## Task Lifecycle
- Inspect: \`omc team api read-task ...\`
- Claim: \`omc team api claim-task ...\`
- Complete: \`omc team api transition-task-status ...\`
- Fail: \`omc team api transition-task-status ...\`

## Communication
- **Inbox**: Read for new instructions
- **Status**: Write state updates
- **Heartbeat**: Update every few minutes

## Rules
- You are NOT the leader
- Do NOT edit files outside task paths
- Do NOT spawn sub-agents
- Do NOT create tmux sessions
- Do NOT run team orchestration commands
`;
}
```

### Task Claiming with Atomic Locking

```typescript
// src/team/task-file-ops.ts
export interface LockHandle {
  fd: number;
  path: string;
}

export function acquireTaskLock(
  teamName: string,
  taskId: string,
  opts?: { staleLockMs?: number; workerName?: string }
): LockHandle | null {
  // O_CREAT|O_EXCL|O_WRONLY provides atomic lock creation
  const fd = openSync(lockPath, O_CREAT | O_EXCL | O_WRONLY, 0o600);
  
  // Write PID + timestamp for stale detection
  const payload = JSON.stringify({
    pid: process.pid,
    workerName: opts?.workerName ?? '',
    timestamp: Date.now(),
  });
  writeSync(fd, payload, null, 'utf-8');
  return { fd, path: lockPath };
}

export async function findNextTask(
  teamName: string,
  workerName: string
): Promise<TaskFile | null> {
  for (const id of taskIds) {
    // Pre-check without lock
    const task = readTask(teamName, id);
    if (!task || task.status !== 'pending') continue;
    if (task.owner !== workerName) continue;
    if (!areBlockersResolved(teamName, task.blockedBy)) continue;

    // Attempt atomic lock
    const handle = acquireTaskLock(teamName, id, { workerName });
    if (!handle) continue; // Another worker holds lock

    try {
      // Re-read under lock for consistency
      const freshTask = readTask(teamName, id);
      if (!freshTask || freshTask.status !== 'pending') continue;

      // Claim atomically
      updateTask(teamName, id, {
        claimedBy: workerName,
        claimedAt: Date.now(),
        claimPid: process.pid,
        status: 'in_progress'
      });
      
      return { ...freshTask, status: 'in_progress' };
    } finally {
      releaseTaskLock(handle);
    }
  }
  return null;
}
```

### Worker Capabilities

```typescript
// src/team/capabilities.ts
export type WorkerCapability =
  | 'code-edit'
  | 'code-review'
  | 'security-review'
  | 'architecture'
  | 'testing'
  | 'documentation'
  | 'ui-design'
  | 'refactoring'
  | 'research'
  | 'general';

const DEFAULT_CAPABILITIES: Record<WorkerBackend, WorkerCapability[]> = {
  'claude-native': ['code-edit', 'testing', 'general'],
  'mcp-codex': ['code-review', 'security-review', 'architecture', 'refactoring'],
  'mcp-gemini': ['ui-design', 'documentation', 'research', 'code-edit'],
  'tmux-claude': ['code-edit', 'testing', 'general'],
  'tmux-codex': ['code-review', 'security-review', 'architecture', 'refactoring'],
  'tmux-gemini': ['ui-design', 'documentation', 'research', 'code-edit'],
};
```

---

## 5. Smart Model Routing

### Three-Tier Routing System

```typescript
// src/features/model-routing/types.ts
export type ComplexityTier = 'LOW' | 'MEDIUM' | 'HIGH';

export const TIER_TO_MODEL_TYPE: Record<ComplexityTier, ModelType> = {
  LOW: 'haiku',      // Fast, cheap
  MEDIUM: 'sonnet',  // Balanced
  HIGH: 'opus',      // Deep reasoning
};
```

### Signal Extraction

```typescript
// Complexity signals extracted without model calls
interface ComplexitySignals {
  lexical: {
    wordCount: number;
    filePathCount: number;
    hasArchitectureKeywords: boolean;  // refactor, redesign
    hasDebuggingKeywords: boolean;   // root cause, investigate
    hasSimpleKeywords: boolean;      // find, list, show
    hasRiskKeywords: boolean;        // critical, production, security
    questionDepth: 'why' | 'how' | 'what' | 'where' | 'none';
  };
  structural: {
    estimatedSubtasks: number;
    crossFileDependencies: boolean;
    impactScope: 'local' | 'module' | 'system-wide';
    reversibility: 'easy' | 'moderate' | 'difficult';
  };
  context: {
    previousFailures: number;
    agentChainDepth: number;
    planComplexity: number;
  };
}
```

### Weighted Scoring

```typescript
// src/features/model-routing/scorer.ts
const WEIGHTS = {
  lexical: {
    wordCountHigh: 2,
    architectureKeywords: 3,
    debuggingKeywords: 2,
    simpleKeywords: -2,      // Negative weight
    riskKeywords: 2,
    questionDepthWhy: 2,
  },
  structural: {
    subtasksMany: 3,
    crossFile: 2,
    securityDomain: 2,
    impactSystemWide: 3,
  },
  context: {
    previousFailure: 2,      // Per failure, capped
    deepChain: 2,
  },
};

const TIER_THRESHOLDS = {
  HIGH: 8,    // Score >= 8 → Opus
  MEDIUM: 4,  // Score >= 4 → Sonnet
  // Score < 4 → Haiku
};
```

### Routing Rules

```typescript
// src/features/model-routing/rules.ts
export const DEFAULT_ROUTING_RULES: RoutingRule[] = [
  // Architecture work → HIGH tier
  {
    name: 'architecture-work',
    condition: (ctx, signals) => 
      signals.lexical.hasArchitectureKeywords &&
      signals.structural.impactScope === 'system-wide',
    action: { tier: 'HIGH', reason: 'System-wide architecture work' },
    priority: 100,
  },
  // Security work → HIGH tier
  {
    name: 'security-critical',
    condition: (ctx, signals) =>
      signals.lexical.hasRiskKeywords &&
      signals.structural.domainSpecificity === 'security',
    action: { tier: 'HIGH', reason: 'Security-critical work' },
    priority: 95,
  },
  // Simple lookups → LOW tier
  {
    name: 'simple-lookup',
    condition: (ctx, signals) =>
      signals.lexical.hasSimpleKeywords &&
      signals.lexical.wordCount < 100 &&
      signals.structural.estimatedSubtasks <= 1,
    action: { tier: 'LOW', reason: 'Simple lookup task' },
    priority: 80,
  },
  // Debugging with previous failures → Escalate
  {
    name: 'failed-debugging',
    condition: (ctx, signals) =>
      signals.lexical.hasDebuggingKeywords &&
      signals.context.previousFailures > 0,
    action: { tier: 'HIGH', reason: 'Failed debugging needs deep analysis' },
    priority: 90,
  },
];
```

### Proactive vs Reactive Routing

```typescript
// src/features/model-routing/router.ts
export function routeTask(context: RoutingContext): RoutingDecision {
  // If forceInherit enabled, bypass all routing
  if (mergedConfig.forceInherit) {
    return {
      model: 'inherit',
      tier: 'MEDIUM',
      reasons: ['forceInherit enabled'],
    };
  }

  // Extract signals (no model calls)
  const signals = extractAllSignals(context.taskPrompt, context);
  
  // Evaluate routing rules
  const ruleResult = evaluateRules(context, signals, DEFAULT_ROUTING_RULES);
  
  // Calculate confidence score
  const score = calculateComplexityScore(signals);
  const confidence = calculateConfidence(score, ruleResult.tier);
  
  // Handle scorer/rules divergence
  const divergence = Math.abs(ruleIdx - scoreIdx);
  if (divergence > 1) {
    confidence = Math.min(confidence, 0.5);
    finalTier = tierOrder[Math.max(ruleIdx, scoreIdx)];
  }
  
  return {
    model: mergedConfig.tierModels[finalTier],
    tier: finalTier,
    confidence,
    reasons,
    escalated: false,
  };
}
```

**Cost Optimization Strategy**:
- Route simple tasks to Haiku (30-50% cost savings on high-volume simple work)
- Reserve Opus for architecture, security, and complex debugging
- Sonnet as the default for most implementation work

---

## 6. Integration Recommendations

### High-Value Patterns to Adopt

1. **State Paths Abstraction** - Centralized path builders prevent drift
2. **Atomic Task Locking** - O_EXCL file locking for worker coordination
3. **Append-Only Event Log** - JSONL events for observability and replay
4. **Heartbeat System** - Simple timestamp-based liveness detection
5. **Worker Overlays** - Dynamic AGENTS.md generation per worker
6. **Three-Tier Model Routing** - Cost-effective task-to-model mapping

### Patterns to Simplify

1. **Phase Controller** - The rule-based inference is clever but harder to debug than explicit state machines
2. **MCP Bridge Complexity** - OMC had to pivot from MCP to tmux-based CLI; DaSage should consider direct process management
3. **Dispatch Queue** - Complex notification system may be overkill for initial implementation
4. **Mailbox System** - Worker-to-worker messaging adds complexity; start with leader-mediated

### Minimal Viable Implementation

```typescript
// Core files needed for DaSage adaptation

// 1. State paths abstraction
src/state/paths.ts           # TeamPaths builders

// 2. Task operations
src/tasks/operations.ts      # CRUD + atomic claiming

// 3. Worker lifecycle
src/workers/lifecycle.ts      # Spawn, monitor, cleanup
src/workers/overlays.ts       # AGENTS.md generation

// 4. Model routing
src/routing/scheduler.ts      # Three-tier routing
src/routing/signals.ts        # Complexity detection

// 5. Event system
src/events/store.ts         # JSONL append-only log

// 6. Pipeline
src/pipeline/controller.ts    # Phase transitions
```

### Recommended Architecture for DaSage

```
DaSage Multi-Agent System:
│
├── State Layer (filesystem-based)
│   ├── .dasage/state/teams/{team}/
│   │   ├── tasks/*.json
│   │   ├── workers/*/status.json
│   │   └── events.jsonl
│
├── Pipeline Layer
│   ├── Phase: initializing → planning → executing → verifying → fixing
│   └── State machine with explicit transitions
│
├── Worker Layer
│   ├── Spawn: Create sub-process with context injection
│   ├── Monitor: Heartbeat + status polling
│   └── Route: Task → Worker assignment
│
├── Routing Layer
│   ├── Signal extraction (keywords, complexity)
│   ├── Tier assignment (Haiku/Sonnet/Opus)
│   └── Cost tracking per task
│
└── Event Layer
    ├── Append-only log
    └── Real-time notification
```

### Key Abstractions for DaSage

```typescript
// Simplified state management
interface TeamState {
  id: string;
  phase: 'planning' | 'executing' | 'verifying' | 'fixing' | 'completed';
  tasks: Task[];
  workers: Worker[];
}

interface Task {
  id: string;
  status: 'pending' | 'blocked' | 'in_progress' | 'completed' | 'failed';
  assignedTo?: string;
  blockedBy: string[];
  complexity: 'low' | 'medium' | 'high';
}

interface Worker {
  id: string;
  status: 'idle' | 'working' | 'dead';
  currentTask?: string;
  capabilities: string[];
  lastHeartbeat: Date;
}

// Worker context injection
interface WorkerContext {
  teamId: string;
  workerId: string;
  taskQueue: string[];
  overlay: string;  // AGENTS.md content
}
```

### Critical Success Factors

1. **Start Simple**: Implement task claiming + heartbeat first
2. **Explicit State**: Use explicit state machines over inference
3. **File-Based**: Leverage filesystem for durability and debugging
4. **Atomic Operations**: Use file locking for coordination
5. **Observability**: Log everything to JSONL
6. **Cost Awareness**: Route tasks to appropriate models from day one

---

## 7. Over-Engineered Components to Avoid

1. **MCP Server Bridge** - Complex, deprecated in favor of direct CLI
2. **Multi-Backend Worker System** - Claude + Codex + Gemini complexity; start with Claude only
3. **Permission Enforcement Layer** - Sophisticated but adds overhead
4. **Git Worktree Support** - Nice-to-have, not essential
5. **Complex Dispatch Queue** - Simple polling works for most cases
6. **Mailbox System** - Worker-to-worker messaging; leader mediation is simpler

---

## Conclusion

The OMC architecture demonstrates sophisticated multi-agent orchestration patterns. The most valuable elements for DaSage are:

1. **File-based state management** with atomic operations
2. **Worker lifecycle management** with heartbeats and overlays
3. **Model routing** for cost optimization
4. **Event-driven architecture** for observability

Start with a minimal implementation focusing on task claiming, worker heartbeats, and simple phase transitions. Add complexity only when needed.

The 30-50% cost savings claim from model routing is achievable by routing simple tasks to lighter models while reserving powerful models for complex work.
