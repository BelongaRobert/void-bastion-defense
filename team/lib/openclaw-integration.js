#!/usr/bin/env node
/**
 * DaSage Team Mode - OpenClaw Integration Layer
 * Connects Team Mode pipeline to OpenClaw subagent system
 * 
 * FIXED: Now properly awaits subagent completion via sessions_yield pattern
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn, exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

const TEAM_BASE = process.env.TEAM_BASE || path.join(process.env.HOME || process.env.USERPROFILE, '.openclaw/workspace/team');
const ACTIVE_DIR = path.join(TEAM_BASE, 'active');
const TEMPLATES_DIR = path.join(TEAM_BASE, 'templates');
const CONFIG_PATH = path.join(TEAM_BASE, 'team-config.json');

// ANSI colors for TUI
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

async function loadConfig() {
  const configRaw = await fs.readFile(CONFIG_PATH, 'utf8');
  return JSON.parse(configRaw);
}

async function loadTaskState(taskId) {
  const statePath = path.join(ACTIVE_DIR, taskId, 'state.json');
  const stateRaw = await fs.readFile(statePath, 'utf8');
  return JSON.parse(stateRaw);
}

async function saveTaskState(taskId, state) {
  const statePath = path.join(ACTIVE_DIR, taskId, 'state.json');
  state.updatedAt = new Date().toISOString();
  await fs.writeFile(statePath, JSON.stringify(state, null, 2));
}

async function loadTemplate(templateName) {
  const templatePath = path.join(TEMPLATES_DIR, `${templateName}.md`);
  return await fs.readFile(templatePath, 'utf8');
}

async function loadPlan(taskId) {
  const planPath = path.join(ACTIVE_DIR, taskId, 'plan.md');
  try {
    return await fs.readFile(planPath, 'utf8');
  } catch {
    return null;
  }
}

async function loadExecutionReport(taskId) {
  const reportPath = path.join(ACTIVE_DIR, taskId, 'exec', 'REPORT.md');
  try {
    return await fs.readFile(reportPath, 'utf8');
  } catch {
    return null;
  }
}

function escapeShellArg(arg) {
  // Escape for PowerShell
  return arg.replace(/`/g, '``').replace(/"/g, '`"');
}

/**
 * Build agent context for a specific phase
 */
function buildAgentContext(taskId, phase, template, taskState, plan) {
  const taskPath = path.join(ACTIVE_DIR, taskId);
  const parts = [
    `# Team Mode Task Context`,
    ``,
    `**Task ID:** ${taskId}`,
    `**Phase:** ${phase}`,
    `**Description:** ${taskState.description}`,
    ``
  ];
  
  if (taskState.context && Object.keys(taskState.context).length > 0) {
    parts.push(`**Context:**`);
    for (const [key, value] of Object.entries(taskState.context)) {
      parts.push(`- ${key}: ${value}`);
    }
    parts.push(``);
  }
  
  if (plan) {
    parts.push(`## Plan`,
               ``,
               plan,
               ``);
  }
  
  // Phase-specific output instructions
  let outputInstruction = '';
  if (phase === 'planning') {
    outputInstruction = `Write your plan to: ${taskPath}/plan.md`;
  } else if (phase === 'exec') {
    outputInstruction = `Write all implementation to: ${taskPath}/exec/\nAlso create ${taskPath}/exec/REPORT.md documenting what was done.`;
  } else if (phase === 'verify') {
    outputInstruction = `Write verification report to: ${taskPath}/verify/report.json`;
  }
  
  parts.push(`## Instructions`,
             ``,
             template,
             ``,
             `---`,
             ``,
             `## Working Context`,
             `**Working Directory:** ${taskPath}`,
             `**Task State:** ${taskPath}/state.json`,
             `**Output:** ${outputInstruction}`,
             ``,
             `When complete, update state.json to mark phase as completed.`,
             `If you encounter errors, update state.json with status "failed" and include error details.`);
  
  return parts.join('\n');
}

/**
 * Spawn a subagent and wait for completion using OpenClaw sessions:spawn
 * CRITICAL: Uses proper --runtime agent and awaits completion
 */
async function spawnSubagent(taskId, phase, options = {}) {
  const config = await loadConfig();
  const taskState = await loadTaskState(taskId);
  
  console.log(`${colors.cyan}[Team Mode]${colors.reset} Spawning ${phase} agent for task ${taskId}`);
  
  // Build agent context
  const templateName = phase === 'exec' ? 'executor' : phase === 'planning' ? 'planner' : phase;
  const template = await loadTemplate(templateName);
  const plan = phase !== 'planning' ? await loadPlan(taskId) : null;
  const context = buildAgentContext(taskId, phase, template, taskState, plan);
  
  // Save the prompt to a file for reference/debugging
  const promptPath = path.join(ACTIVE_DIR, taskId, `${phase}-prompt.txt`);
  await fs.writeFile(promptPath, context);
  console.log(`${colors.dim}  Prompt saved: ${promptPath}${colors.reset}`);
  
  // Determine model and timeout based on config
  const model = config.agents[templateName]?.model || 'kimi-k2.5:cloud';
  const timeout = config.agents[templateName]?.timeout || 300;
  
  // Build the OpenClaw sessions:spawn command
  // This is the CORRECT syntax for spawning subagents
  const agentLabel = `team-${taskId}-${phase}`;
  const workingDir = path.join(ACTIVE_DIR, taskId);
  
  console.log(`${colors.dim}  Model: ${model}${colors.reset}`);
  console.log(`${colors.dim}  Label: ${agentLabel}${colors.reset}`);
  console.log(`${colors.dim}  Working Dir: ${workingDir}${colors.reset}`);
  
  // IMPORTANT: We need to spawn the subagent via PowerShell since we're calling openclaw CLI
  // The subagent will receive the context as its task description
  const spawnCommand = `openclaw sessions:spawn` +
    ` --runtime agent` +
    ` --model "${model}"` +
    ` --label "${agentLabel}"` +
    ` --timeout ${timeout}` +
    ` --task "${escapeShellArg(context)}"`;
  
  console.log(`${colors.dim}  Command: ${spawnCommand}${colors.reset}`);
  
  return new Promise((resolve, reject) => {
    const proc = spawn('powershell', ['-Command', spawnCommand], {
      cwd: workingDir,
      env: { 
        ...process.env, 
        TEAM_TASK_ID: taskId, 
        TEAM_PHASE: phase,
        TEAM_BASE: TEAM_BASE
      }
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => { 
      stdout += data.toString();
      // Stream output to console for visibility
      process.stdout.write(data);
    });
    
    proc.stderr.on('data', (data) => { 
      stderr += data.toString();
      // Stream errors to console
      process.stderr.write(data);
    });
    
    proc.on('close', async (code) => {
      // Update task state with subagent result
      const currentState = await loadTaskState(taskId);
      currentState.phases[phase].exitCode = code;
      currentState.phases[phase].stdout = stdout.substring(0, 1000); // Truncate for state
      await saveTaskState(taskId, currentState);
      
      if (code === 0) {
        resolve({ 
          stdout, 
          stderr, 
          code,
          taskId,
          phase,
          promptPath,
          workingDir
        });
      } else {
        reject(new Error(`Subagent exited with code ${code}: ${stderr}`));
      }
    });
    
    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn subagent: ${err.message}`));
    });
  });
}

/**
 * Run a single phase with retry logic
 */
async function runPhaseWithRetry(taskId, phase, maxRetries = 3) {
  const config = await loadConfig();
  const retries = config.settings?.maxRetries || maxRetries;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`${colors.yellow}  Attempt ${attempt}/${retries}${colors.reset}`);
      
      const result = await spawnSubagent(taskId, phase);
      
      // Check if expected artifacts exist
      if (phase === 'exec') {
        const execDir = path.join(ACTIVE_DIR, taskId, 'exec');
        try {
          const files = await fs.readdir(execDir);
          if (files.length === 0) {
            throw new Error('Exec phase completed but no files were created');
          }
        } catch (err) {
          throw new Error(`Exec output validation failed: ${err.message}`);
        }
      }
      
      return result;
    } catch (err) {
      console.error(`${colors.red}  Attempt ${attempt} failed: ${err.message}${colors.reset}`);
      
      if (attempt === retries) {
        throw new Error(`Phase ${phase} failed after ${retries} attempts: ${err.message}`);
      }
      
      // Wait before retry
      const delay = config.settings?.retryDelay || 5000;
      console.log(`${colors.dim}  Retrying in ${delay}ms...${colors.reset}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Run the complete Team Mode pipeline for a task
 * CRITICAL: Chains phases automatically using sessions_yield pattern
 */
async function runPipeline(taskId) {
  const config = await loadConfig();
  const phases = ['planning', 'exec', 'verify'];
  
  console.log(`${colors.bright}${colors.green}=== Team Mode Pipeline ===${colors.reset}\n`);
  console.log(`Task: ${taskId}`);
  console.log(`Phases: ${phases.join(' → ')}\n`);
  
  for (const phase of phases) {
    console.log(`${colors.yellow}▶ Phase: ${phase}${colors.reset}`);
    
    try {
      // Update task state
      const state = await loadTaskState(taskId);
      state.phase = phase;
      state.phases[phase] = {
        ...state.phases[phase],
        status: 'in_progress',
        startedAt: new Date().toISOString()
      };
      await saveTaskState(taskId, state);
      
      // Validate prerequisites before running phase
      if (phase === 'exec') {
        const planPath = path.join(ACTIVE_DIR, taskId, 'plan.md');
        try {
          await fs.access(planPath);
        } catch {
          throw new Error('Cannot run exec phase: plan.md does not exist. Run planning phase first.');
        }
      }
      
      if (phase === 'verify') {
        const execDir = path.join(ACTIVE_DIR, taskId, 'exec');
        try {
          const files = await fs.readdir(execDir);
          if (files.length === 0) {
            throw new Error('Cannot run verify phase: exec/ directory is empty. Run exec phase first.');
          }
        } catch {
          throw new Error('Cannot run verify phase: exec/ directory does not exist. Run exec phase first.');
        }
      }
      
      // Run phase with retry logic
      const result = await runPhaseWithRetry(taskId, phase);
      
      // Mark phase complete
      const currentState = await loadTaskState(taskId);
      currentState.phases[phase].status = 'completed';
      currentState.phases[phase].completedAt = new Date().toISOString();
      await saveTaskState(taskId, currentState);
      
      console.log(`${colors.green}✓ Phase ${phase} complete${colors.reset}\n`);
      
    } catch (err) {
      console.error(`${colors.red}✗ Phase ${phase} failed: ${err.message}${colors.reset}`);
      
      const state = await loadTaskState(taskId);
      state.phases[phase].status = 'failed';
      state.phases[phase].error = err.message;
      await saveTaskState(taskId, state);
      
      // Don't proceed to next phase on failure
      throw err;
    }
  }
  
  // Mark task complete
  const finalState = await loadTaskState(taskId);
  finalState.status = 'completed';
  finalState.phase = 'completed';
  finalState.completedAt = new Date().toISOString();
  await saveTaskState(taskId, finalState);
  
  console.log(`${colors.bright}${colors.green}=== Pipeline Complete ===${colors.reset}`);
  
  // Archive if enabled
  if (config.settings.autoArchive) {
    await archiveTask(taskId);
  }
  
  // Notify if enabled
  if (config.settings.notifyOnComplete) {
    await notifyComplete(taskId, finalState);
  }
  
  return finalState;
}

async function archiveTask(taskId) {
  const archiveDir = path.join(TEAM_BASE, 'archive');
  const sourceDir = path.join(ACTIVE_DIR, taskId);
  const destDir = path.join(archiveDir, taskId);
  
  await fs.mkdir(archiveDir, { recursive: true });
  await fs.rename(sourceDir, destDir);
  
  console.log(`${colors.dim}Archived to: ${destDir}${colors.reset}`);
}

async function notifyComplete(taskId, state) {
  const config = await loadConfig();
  const prefix = `[${config.settings?.notificationPrefix || 'Team'}]`;
  console.log(`${prefix} Task ${taskId} completed: ${state.description}`);
}

// CLI Commands
const commands = {
  async create(args) {
    const description = args.join(' ');
    if (!description) {
      console.error(`${colors.red}Error: Description required${colors.reset}`);
      console.log('Usage: team create "<description>"');
      process.exit(1);
    }
    
    // Use PowerShell module to create task
    const psCommand = `
Import-Module "${path.join(TEAM_BASE, 'scripts/team-state.psm1')}"
New-Task -Description "${escapeShellArg(description)}"
`;
    
    const { stdout } = await execAsync(`powershell -Command "${psCommand}"`, {
      cwd: TEAM_BASE
    });
    
    const taskId = stdout.trim();
    console.log(`${colors.green}✓ Task created:${colors.reset} ${colors.cyan}${taskId}${colors.reset}`);
    console.log(`  Description: ${description}`);
    console.log(`  Path: ${path.join(ACTIVE_DIR, taskId)}`);
    console.log(`\n${colors.dim}Next: Run 'team run ${taskId}' to start the pipeline${colors.reset}`);
    
    return taskId;
  },
  
  async run(args) {
    const taskId = args[0];
    if (!taskId) {
      console.error(`${colors.red}Error: Task ID required${colors.reset}`);
      console.log('Usage: team run <task-id>');
      process.exit(1);
    }
    
    // Validate task exists
    const taskPath = path.join(ACTIVE_DIR, taskId);
    try {
      await fs.access(taskPath);
    } catch {
      console.error(`${colors.red}Error: Task not found: ${taskId}${colors.reset}`);
      process.exit(1);
    }
    
    await runPipeline(taskId);
  },
  
  async spawn(args) {
    // Internal command: spawn a specific phase subagent
    const taskId = args[0];
    const phase = args[1];
    
    if (!taskId || !phase) {
      console.error(`${colors.red}Error: Task ID and phase required${colors.reset}`);
      console.log('Usage: team spawn <task-id> <phase>');
      process.exit(1);
    }
    
    const result = await spawnSubagent(taskId, phase);
    console.log(JSON.stringify(result, null, 2));
  },
  
  async status() {
    const psCommand = `
Import-Module "${path.join(TEAM_BASE, 'scripts/team-state.psm1')}"
$tasks = Get-ActiveTasks
if ($tasks) {
    $tasks | ForEach-Object {
        $status = $_.Status
        $phase = $_.Phase
        Write-Output "$($_.Id)|$status|$phase|$($_.Description)"
    }
} else {
    Write-Output "NO_TASKS"
}
`;
    
    try {
      const { stdout } = await execAsync(`powershell -Command "${psCommand}"`, {
        cwd: TEAM_BASE
      });
      
      const lines = stdout.trim().split('\n').filter(l => l.trim());
      
      if (lines[0] === 'NO_TASKS' || lines.length === 0) {
        console.log(`${colors.dim}No active tasks.${colors.reset}`);
        console.log(`${colors.dim}Create one with: team create "<description>"${colors.reset}`);
        return;
      }
      
      console.log(`${colors.bright}=== Active Tasks ===${colors.reset}\n`);
      console.log(`${colors.bright}ID        | Status      | Phase       | Description${colors.reset}`);
      console.log('-'.repeat(70));
      
      for (const line of lines) {
        const parts = line.split('|');
        if (parts.length >= 4) {
          const [id, status, phase, ...descParts] = parts;
          const desc = descParts.join('|').substring(0, 40);
          const statusColor = status === 'completed' ? colors.green : 
                             status === 'in_progress' ? colors.yellow : 
                             status === 'failed' ? colors.red : colors.dim;
          console.log(`${colors.cyan}${id}${colors.reset} | ${statusColor}${status.padEnd(11)}${colors.reset} | ${colors.yellow}${phase.padEnd(11)}${colors.reset} | ${desc}`);
        }
      }
    } catch (err) {
      console.error(`${colors.red}Error loading status: ${err.message}${colors.reset}`);
    }
  },
  
  async list() {
    await this.status();
  },
  
  async show(args) {
    const taskId = args[0];
    if (!taskId) {
      console.error(`${colors.red}Error: Task ID required${colors.reset}`);
      console.log('Usage: team show <task-id>');
      process.exit(1);
    }
    
    const state = await loadTaskState(taskId);
    if (!state) {
      console.error(`${colors.red}Error: Task not found: ${taskId}${colors.reset}`);
      process.exit(1);
    }
    
    console.log(`${colors.bright}=== Task: ${taskId} ===${colors.reset}\n`);
    console.log(`Description: ${state.description}`);
    console.log(`Phase: ${state.phase}`);
    console.log(`Status: ${state.status}`);
    console.log(`Created: ${state.createdAt}`);
    console.log(`Updated: ${state.updatedAt}`);
    console.log('');
    
    console.log(`${colors.bright}Phase Status:${colors.reset}`);
    for (const [phaseName, phaseData] of Object.entries(state.phases)) {
      const status = phaseData.status || 'pending';
      const statusColor = status === 'completed' ? colors.green : 
                         status === 'in_progress' ? colors.yellow : 
                         status === 'failed' ? colors.red : colors.dim;
      console.log(`  ${phaseName.padEnd(10)} ${statusColor}${status}${colors.reset}`);
    }
    console.log('');
    
    // Show artifacts
    console.log(`${colors.bright}Artifacts:${colors.reset}`);
    const taskPath = path.join(ACTIVE_DIR, taskId);
    const artifacts = [];
    
    try {
      await fs.access(path.join(taskPath, 'plan.md'));
      artifacts.push('plan.md ✓');
    } catch {
      artifacts.push('plan.md ✗');
    }
    
    try {
      const execFiles = await fs.readdir(path.join(taskPath, 'exec'));
      if (execFiles.length > 0) {
        artifacts.push(`exec/ (${execFiles.length} files) ✓`);
      } else {
        artifacts.push('exec/ (empty)');
      }
    } catch {
      artifacts.push('exec/ ✗');
    }
    
    try {
      await fs.access(path.join(taskPath, 'verify/report.json'));
      artifacts.push('verify/report.json ✓');
    } catch {
      artifacts.push('verify/report.json ✗');
    }
    
    artifacts.forEach(a => console.log(`  ${a}`));
  },
  
  async cancel(args) {
    const taskId = args[0];
    if (!taskId) {
      console.error(`${colors.red}Error: Task ID required${colors.reset}`);
      console.log('Usage: team cancel <task-id>');
      process.exit(1);
    }
    
    const state = await loadTaskState(taskId);
    if (!state) {
      console.error(`${colors.red}Error: Task not found: ${taskId}${colors.reset}`);
      process.exit(1);
    }
    
    state.status = 'cancelled';
    await saveTaskState(taskId, state);
    
    console.log(`${colors.yellow}Task ${taskId} cancelled${colors.reset}`);
    
    // Move to archive
    const config = await loadConfig();
    if (config.settings.autoArchive) {
      await archiveTask(taskId);
    }
  },
  
  async help() {
    console.log(`
${colors.bright}DaSage Team Mode CLI${colors.reset}

Commands:
  create "<desc>"          Create a new task
  run <task-id>            Run full pipeline (planning → exec → verify)
  spawn <task-id> <phase>  Spawn a specific phase subagent
  status                   Show active tasks
  list                     Alias for status
  show <task-id>           Show detailed task info
  cancel <task-id>         Cancel/delete a task
  help                     Show this help

Examples:
  team create "Implement JWT authentication"
  team run a1b2c3d4
  team status

Environment:
  TEAM_BASE                  Override base path
  `);
  }
};

// Main entry
async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  
  if (!cmd || cmd === 'help') {
    await commands.help();
    return;
  }
  
  if (commands[cmd]) {
    try {
      await commands[cmd](args);
    } catch (err) {
      console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
      process.exit(1);
    }
  } else {
    console.error(`${colors.red}Unknown command: ${cmd}${colors.reset}`);
    await commands.help();
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = {
  loadConfig,
  loadTaskState,
  saveTaskState,
  spawnSubagent,
  runPhaseWithRetry,
  runPipeline,
  buildAgentContext,
  colors
};
