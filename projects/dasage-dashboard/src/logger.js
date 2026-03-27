// Terminal Logger Module - Phase 1
// Intercepts and logs all command executions

import { exec, execSync, spawn } from 'child_process';
import { EventEmitter } from 'events';

// Command log storage (last 100 commands)
const commandLog = [];
const MAX_COMMANDS = 100;
const logEmitter = new EventEmitter();

// Sensitive data patterns to redact
const SENSITIVE_PATTERNS = [
  /ghp_[a-zA-Z0-9]{36}/g,           // GitHub tokens
  /[a-f0-9]{40}/g,                    // Generic SHA tokens  
  /Bearer\s+[a-zA-Z0-9_-]+/gi,       // Bearer tokens
  /api[_-]?key[:\s=]+[a-zA-Z0-9]{20,}/gi, // API keys
  /password[:\s=]+[^\s]+/gi,          // Passwords
  /token[:\s=]+[^\s]+/gi              // Generic tokens
];

// Redact sensitive data
function redactSensitive(text) {
  if (!text) return text;
  let redacted = text;
  SENSITIVE_PATTERNS.forEach(pattern => {
    redacted = redacted.replace(pattern, '***REDACTED***');
  });
  return redacted;
}

// Log entry structure
function createLogEntry(command, cwd) {
  return {
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    command: redactSensitive(command),
    cwd: cwd || process.cwd(),
    startTime: Date.now(),
    endTime: null,
    duration: null,
    stdout: '',
    stderr: '',
    exitCode: null,
    status: 'running',
    category: categorizeCommand(command)
  };
}

// Categorize commands
function categorizeCommand(command) {
  const cmd = command.toLowerCase();
  if (cmd.includes('git')) return 'git';
  if (cmd.includes('curl') || cmd.includes('fetch') || cmd.includes('http')) return 'network';
  if (cmd.includes('docker') || cmd.includes('kubectl')) return 'container';
  if (cmd.includes('npm') || cmd.includes('node')) return 'node';
  if (cmd.includes('openclaw')) return 'openclaw';
  return 'system';
}

// Add to log
function addToLog(entry) {
  commandLog.unshift(entry);
  if (commandLog.length > MAX_COMMANDS) {
    commandLog.pop();
  }
  logEmitter.emit('command', entry);
}

// Update log entry
function updateLogEntry(id, updates) {
  const entry = commandLog.find(c => c.id === id);
  if (entry) {
    Object.assign(entry, updates);
    logEmitter.emit('update', entry);
  }
  return entry;
}

// Logged exec (async)
export function loggedExec(command, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  const entry = createLogEntry(command, options?.cwd);
  addToLog(entry);
  
  const child = exec(command, options, (error, stdout, stderr) => {
    const updates = {
      endTime: Date.now(),
      duration: Date.now() - entry.startTime,
      stdout: redactSensitive(stdout?.toString() || ''),
      stderr: redactSensitive(stderr?.toString() || ''),
      exitCode: error?.code || 0,
      status: error ? 'error' : 'success'
    };
    updateLogEntry(entry.id, updates);
    
    if (callback) callback(error, stdout, stderr);
  });
  
  return child;
}

// Logged execSync
export function loggedExecSync(command, options = {}) {
  const entry = createLogEntry(command, options?.cwd);
  addToLog(entry);
  
  try {
    const result = execSync(command, { ...options, encoding: 'utf-8' });
    updateLogEntry(entry.id, {
      endTime: Date.now(),
      duration: Date.now() - entry.startTime,
      stdout: redactSensitive(result?.toString() || ''),
      exitCode: 0,
      status: 'success'
    });
    return result;
  } catch (error) {
    updateLogEntry(entry.id, {
      endTime: Date.now(),
      duration: Date.now() - entry.startTime,
      stdout: redactSensitive(error.stdout?.toString() || ''),
      stderr: redactSensitive(error.stderr?.toString() || ''),
      exitCode: error.status || 1,
      status: 'error'
    });
    throw error;
  }
}

// Logged spawn
export function loggedSpawn(command, args, options) {
  const fullCommand = `${command} ${args?.join(' ') || ''}`;
  const entry = createLogEntry(fullCommand, options?.cwd);
  addToLog(entry);
  
  const child = spawn(command, args, options);
  
  let stdout = '';
  let stderr = '';
  
  child.stdout?.on('data', (data) => {
    stdout += data.toString();
    entry.stdout = redactSensitive(stdout);
    logEmitter.emit('output', { id: entry.id, stdout: data.toString() });
  });
  
  child.stderr?.on('data', (data) => {
    stderr += data.toString();
    entry.stderr = redactSensitive(stderr);
    logEmitter.emit('output', { id: entry.id, stderr: data.toString() });
  });
  
  child.on('close', (code) => {
    updateLogEntry(entry.id, {
      endTime: Date.now(),
      duration: Date.now() - entry.startTime,
      exitCode: code,
      status: code === 0 ? 'success' : 'error'
    });
  });
  
  return child;
}

// Get command log
export function getCommandLog(filter = {}) {
  let filtered = [...commandLog];
  
  if (filter.category) {
    filtered = filtered.filter(c => c.category === filter.category);
  }
  if (filter.status) {
    filtered = filtered.filter(c => c.status === filter.status);
  }
  if (filter.limit) {
    filtered = filtered.slice(0, filter.limit);
  }
  
  return filtered;
}

// Get log emitter for real-time updates
export function getLogEmitter() {
  return logEmitter;
}

// Clear log
export function clearLog() {
  commandLog.length = 0;
  logEmitter.emit('clear');
}

// Export for use in other modules
export { commandLog, logEmitter };
