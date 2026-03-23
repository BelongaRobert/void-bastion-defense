#!/usr/bin/env node
/**
 * DaSage Auto-Commit System
 * Watches workspace for changes and commits with AI-generated messages
 */

import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || 'C:/\Users/belon/.openclaw/workspace';
const LOG_FILE = `${WORKSPACE_DIR}/memory/auto-commit.log`;

// Ensure log directory exists
const logDir = dirname(LOG_FILE);
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

function log(message) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  console.log(logLine.trim());
  // Append to log file (would need fs.appendFile in real implementation)
}

function getGitStatus() {
  try {
    const output = execSync('git status --short', { 
      cwd: WORKSPACE_DIR, 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return output.trim();
  } catch (e) {
    return '';
  }
}

function getChangedFiles() {
  try {
    const output = execSync('git diff --name-only', { 
      cwd: WORKSPACE_DIR, 
      encoding: 'utf-8' 
    });
    return output.trim().split('\n').filter(f => f);
  } catch (e) {
    return [];
  }
}

function generateCommitMessage(files) {
  // Simple categorization
  const categories = {
    'memory/': '📝 Memory update',
    'projects/': '🔧 Project work',
    'SKILL.md': '📚 Skills updated',
    'MEMORY.md': '🧠 Memory refreshed',
    'AGENTS.md': '🤖 Agent config',
    'USER.md': '👤 User profile',
    '.md': '📝 Documentation'
  };
  
  let message = 'Auto-commit: ';
  const fileStr = files.join(', ');
  
  // Find best category match
  for (const [pattern, desc] of Object.entries(categories)) {
    if (files.some(f => f.includes(pattern))) {
      message = desc;
      break;
    }
  }
  
  // Add file count
  if (files.length > 3) {
    message += ` (${files.length} files)`;
  } else if (files.length > 0) {
    message += `: ${files.slice(0, 2).join(', ')}${files.length > 2 ? '...' : ''}`;
  }
  
  return message;
}

function commitChanges(message) {
  try {
    execSync('git add -A', { cwd: WORKSPACE_DIR });
    execSync(`git commit -m "${message}"`, { cwd: WORKSPACE_DIR });
    log(`✅ Committed: ${message}`);
    return true;
  } catch (e) {
    log(`❌ Commit failed: ${e.message}`);
    return false;
  }
}

function checkAndCommit() {
  const status = getGitStatus();
  
  if (!status) {
    return; // No changes
  }
  
  const files = getChangedFiles();
  const message = generateCommitMessage(files);
  
  log(`📝 Detected ${files.length} changed files`);
  commitChanges(message);
}

// Main loop - check every 5 minutes
log('🚀 Auto-commit system started');
log(`📁 Watching: ${WORKSPACE_DIR}`);

// Initial check
checkAndCommit();

// Set up interval
setInterval(checkAndCommit, 5 * 60 * 1000);

// Also check on SIGUSR1 (manual trigger)
process.on('SIGUSR1', () => {
  log('📣 Manual trigger received');
  checkAndCommit();
});

log('⏰ Checking every 5 minutes. Press Ctrl+C to stop.');
