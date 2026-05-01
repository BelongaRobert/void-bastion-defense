#!/usr/bin/env node
/**
 * DaSage Task Completion & Idle Alert System
 * Sends Telegram notifications when tasks complete or after extended idle time
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'fs';
import https from 'https';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || 'C:/Users/belon/.openclaw/workspace';
const STATE_FILE = `${WORKSPACE_DIR}/memory/task-alert-state.json`;
const LOG_FILE = `${WORKSPACE_DIR}/memory/task-alerts.log`;

// Load environment
function loadEnv() {
  const envPath = `${WORKSPACE_DIR}/.env.alerts`;
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([A-Z_]+)=(.+)$/);
      if (match) {
        process.env[match[1]] = match[2];
      }
    });
  }
}

loadEnv();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8666283585';

// Idle thresholds (in minutes)
const IDLE_THRESHOLDS = {
  warning: 30,    // Alert after 30 min idle
  extended: 60,     // Alert after 1 hour idle
  veryExtended: 120 // Alert after 2 hours idle
};

// Load state
function loadState() {
  if (existsSync(STATE_FILE)) {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  }
  return {
    lastActivity: null,
    lastAlertTime: null,
    lastAlertLevel: null,
    tasksInProgress: [],
    completedTasks: []
  };
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  console.log(line.trim());
  appendFileSync(LOG_FILE, line);
}

// Send Telegram message using Node's https
function sendTelegramMessage(message) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log('[TELEGRAM] No token configured');
    return false;
  }
  
  return new Promise((resolve) => {
    const data = JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    });
    
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = https.request(options, (res) => {
      let response = '';
      res.on('data', (chunk) => response += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(response);
          if (result.ok) {
            log('📨 Telegram message sent');
            resolve(true);
          } else {
            log(`❌ Telegram error: ${result.description}`);
            resolve(false);
          }
        } catch (e) {
          log(`❌ Parse error: ${e.message}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (e) => {
      log(`❌ Request failed: ${e.message}`);
      resolve(false);
    });
    
    req.write(data);
    req.end();
  });
}

// Mark activity detected (called when I'm working)
export function markActivity(description = 'Working') {
  const state = loadState();
  state.lastActivity = new Date().toISOString();
  state.lastAlertLevel = null; // Reset alert level
  saveState(state);
  log(`📝 Activity: ${description}`);
}

// Mark task complete
export function markTaskComplete(taskDescription, duration = null) {
  const state = loadState();
  const completionTime = new Date().toISOString();
  
  const task = {
    description: taskDescription,
    completedAt: completionTime,
    duration: duration
  };
  
  state.completedTasks.push(task);
  state.lastActivity = completionTime;
  saveState(state);
  
  // Send completion notification
  const durationStr = duration ? ` (${duration})` : '';
  const message = `✅ <b>Task Complete</b>\n\n${taskDescription}${durationStr}\n\n<i>${new Date().toLocaleTimeString()}</i>`;
  sendTelegramMessage(message);
  
  log(`✅ Task completed: ${taskDescription}`);
}

// Check for idle time
function checkIdleStatus() {
  const state = loadState();
  
  if (!state.lastActivity) {
    return; // No activity recorded yet
  }
  
  const now = Date.now();
  const lastActivity = new Date(state.lastActivity).getTime();
  const minutesIdle = Math.floor((now - lastActivity) / (1000 * 60));
  
  // Determine if we should alert
  let alertLevel = null;
  let message = null;
  
  if (minutesIdle >= IDLE_THRESHOLDS.veryExtended && state.lastAlertLevel !== 'veryExtended') {
    alertLevel = 'veryExtended';
    message = `⏰ <b>Extended Idle</b>\n\nI haven't been active for ${Math.floor(minutesIdle / 60)} hours.\n\nAvailable for tasks when you're ready! 🐙`;
  } else if (minutesIdle >= IDLE_THRESHOLDS.extended && state.lastAlertLevel !== 'extended' && state.lastAlertLevel !== 'veryExtended') {
    alertLevel = 'extended';
    message = `☕ <b>Idle for 1 hour</b>\n\nJust waiting here when you need me.\n\nReady for your next task! 🐙`;
  } else if (minutesIdle >= IDLE_THRESHOLDS.warning && state.lastAlertLevel !== 'warning' && state.lastAlertLevel !== 'extended' && state.lastAlertLevel !== 'veryExtended') {
    alertLevel = 'warning';
    message = `🤔 <b>30 minutes idle</b>\n\nStanding by... let me know if you need anything! 🐙`;
  }
  
  if (alertLevel && message) {
    sendTelegramMessage(message);
    state.lastAlertLevel = alertLevel;
    state.lastAlertTime = new Date().toISOString();
    saveState(state);
    log(`⏰ Idle alert sent: ${alertLevel} (${minutesIdle} min)`);
  }
}

// Daemon mode - check periodically
function startDaemon() {
  log('🚀 Task Alert Daemon started');
  log(`📱 Notifications to: ${TELEGRAM_CHAT_ID}`);
  log('⏰ Checking every 5 minutes for idle status');
  
  // Check immediately
  checkIdleStatus();
  
  // Check every 5 minutes
  setInterval(checkIdleStatus, 5 * 60 * 1000);
}

// CLI
if (process.argv.includes('--daemon')) {
  startDaemon();
} else if (process.argv.includes('--test-task')) {
  markTaskComplete('Test task completed successfully', '5 minutes');
} else if (process.argv.includes('--test-idle')) {
  // Simulate extended idle
  const state = loadState();
  state.lastActivity = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
  saveState(state);
  checkIdleStatus();
} else {
  console.log('Usage:');
  console.log('  node task-alerts.js --daemon       # Start monitoring daemon');
  console.log('  node task-alerts.js --test-task    # Send test task completion');
  console.log('  node task-alerts.js --test-idle    # Simulate idle alert');
}

// Export for use by other scripts
export { sendTelegramMessage };
