#!/usr/bin/env node
/**
 * DaSage Proactive Alert System
 * Monitors critical metrics and sends alerts via Telegram
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || 'C:/Users/belon/.openclaw/workspace';
const STATE_FILE = `${WORKSPACE_DIR}/memory/alert-state.json`;
const LOG_FILE = `${WORKSPACE_DIR}/memory/alert-log.md`;

// Alert thresholds
const THRESHOLDS = {
  diskSpacePercent: 85,      // Alert if disk > 85% full
  tokenUsagePercent: 80,     // Alert if token usage > 80%
  serverDownMinutes: 2,      // Alert if server down > 2 min
  ngrokDownMinutes: 5,       // Alert if ngrok down > 5 min
  pendingTasks: 10           // Alert if > 10 pending tasks
};

// Load environment from .env.alerts file
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

// Load env before anything else
loadEnv();

// Telegram configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8666283585';

// Load or initialize state
function loadState() {
  if (existsSync(STATE_FILE)) {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  }
  return {
    lastAlerts: {},
    serverStatus: { lastSeen: null, wasUp: true },
    ngrokStatus: { lastSeen: null, wasUp: true },
    lastCheck: null
  };
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function logToFile(alert) {
  const timestamp = new Date().toISOString();
  const entry = `\n## ${timestamp}\n- **Type:** ${alert.type}\n- **Message:** ${alert.message}\n- **Severity:** ${alert.severity}\n`;
  
  let content = '';
  if (existsSync(LOG_FILE)) {
    content = readFileSync(LOG_FILE, 'utf-8');
  } else {
    content = '# Alert Log\n';
  }
  writeFileSync(LOG_FILE, content + entry);
}

// Check if we should alert (prevent spam)
function shouldAlert(type, cooldownMinutes = 30) {
  const state = loadState();
  const lastAlert = state.lastAlerts[type];
  
  if (!lastAlert) return true;
  
  const minutesSince = (Date.now() - new Date(lastAlert).getTime()) / (1000 * 60);
  return minutesSince >= cooldownMinutes;
}

function recordAlert(type) {
  const state = loadState();
  state.lastAlerts[type] = new Date().toISOString();
  saveState(state);
}

// Monitoring functions
function checkDiskSpace() {
  try {
    // Windows: check C: drive
    const output = execSync('wmic logicaldisk where "DeviceID=\'C:\'" get Size,FreeSpace', { encoding: 'utf-8' });
    const lines = output.trim().split('\n');
    if (lines.length >= 2) {
      const [size, free] = lines[1].trim().split(/\s+/).map(BigInt);
      const used = size - free;
      const usedPercent = Number((used * 100n) / size);
      
      return {
        usedPercent,
        freeGB: Number(free) / (1024**3),
        totalGB: Number(size) / (1024**3)
      };
    }
  } catch (e) {
    log(`Disk check failed: ${e.message}`);
  }
  return null;
}

function checkServerStatus() {
  try {
    // Check if port 3001 is listening
    const output = execSync('netstat -an | findstr :3001', { encoding: 'utf-8', shell: 'cmd' });
    const isListening = output.includes('LISTENING');
    
    return { isUp: isListening, port: 3001 };
  } catch (e) {
    return { isUp: false, port: 3001, error: e.message };
  }
}

function checkNgrokStatus() {
  try {
    // Try to query ngrok API
    const response = execSync('curl -s http://localhost:4040/api/tunnels', { 
      encoding: 'utf-8',
      timeout: 5000
    });
    const data = JSON.parse(response);
    return { 
      isUp: data.tunnels && data.tunnels.length > 0,
      url: data.tunnels?.[0]?.public_url
    };
  } catch (e) {
    return { isUp: false, error: 'Ngrok API not responding' };
  }
}

function checkTokenUsage() {
  try {
    const tokenFile = `${WORKSPACE_DIR}/projects/Clawsight/server/data/token-history.json`;
    if (existsSync(tokenFile)) {
      const data = JSON.parse(readFileSync(tokenFile, 'utf-8'));
      const latest = data[data.length - 1];
      if (latest) {
        // Calculate percentage based on model limit
        const limit = latest.model_limit || 128000;
        const percent = Math.round((latest.token_count / limit) * 100);
        return { percent, count: latest.token_count, limit };
      }
    }
  } catch (e) {
    log(`Token check failed: ${e.message}`);
  }
  return null;
}

// Send Telegram message
async function sendTelegramMessage(message) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log('[TELEGRAM] No bot token configured - would send:', message);
    return false;
  }
  
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const body = JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    });
    
    // Use curl for simplicity
    const result = execSync(`curl -s -X POST "${url}" -H "Content-Type: application/json" -d '${body}'`, { 
      encoding: 'utf-8',
      timeout: 10000
    });
    
    const response = JSON.parse(result);
    if (response.ok) {
      log('📨 Telegram message sent');
      return true;
    } else {
      log(`❌ Telegram error: ${response.description}`);
      return false;
    }
  } catch (e) {
    log(`❌ Failed to send Telegram: ${e.message}`);
    return false;
  }
}

// Alert handlers
function sendAlert(type, message, severity = 'info') {
  if (!shouldAlert(type)) {
    log(`Alert ${type} suppressed (cooldown)`);
    return;
  }
  
  log(`🚨 ALERT [${severity}]: ${message}`);
  logToFile({ type, message, severity, timestamp: new Date().toISOString() });
  recordAlert(type);
  
  // Send to Telegram
  const emoji = severity === 'critical' ? '🔴' : severity === 'warning' ? '⚠️' : '📢';
  const telegramMessage = `${emoji} <b>DaSage Alert</b>\n\n${message}\n\n<i>${new Date().toLocaleString()}</i>`;
  sendTelegramMessage(telegramMessage);
}

// Main monitoring loop
function runChecks() {
  log('🔍 Running proactive checks...');
  const state = loadState();
  const now = new Date().toISOString();
  
  // Check 1: Disk Space
  const disk = checkDiskSpace();
  if (disk && disk.usedPercent > THRESHOLDS.diskSpacePercent) {
    sendAlert('disk_space', 
      `⚠️ Disk space at ${disk.usedPercent}% (${disk.freeGB.toFixed(1)}GB free)`,
      'warning'
    );
  }
  
  // Check 2: Server Status
  const server = checkServerStatus();
  if (!server.isUp) {
    const downSince = state.serverStatus.lastSeen || now;
    const minutesDown = (Date.now() - new Date(downSince).getTime()) / (1000 * 60);
    
    if (minutesDown > THRESHOLDS.serverDownMinutes && state.serverStatus.wasUp) {
      sendAlert('server_down', 
        `🔴 Clawsight server DOWN for ${Math.round(minutesDown)} minutes`,
        'critical'
      );
      state.serverStatus.wasUp = false;
    }
  } else {
    if (!state.serverStatus.wasUp) {
      // Server recovered
      sendAlert('server_up', 
        `🟢 Clawsight server back online`,
        'info'
      );
      state.serverStatus.wasUp = true;
    }
    state.serverStatus.lastSeen = now;
  }
  
  // Check 3: Ngrok Status
  const ngrok = checkNgrokStatus();
  if (!ngrok.isUp) {
    const downSince = state.ngrokStatus.lastSeen || now;
    const minutesDown = (Date.now() - new Date(downSince).getTime()) / (1000 * 60);
    
    if (minutesDown > THRESHOLDS.ngrokDownMinutes && state.ngrokStatus.wasUp) {
      sendAlert('ngrok_down', 
        `🌐 Ngrok tunnel DOWN for ${Math.round(minutesDown)} minutes`,
        'warning'
      );
      state.ngrokStatus.wasUp = false;
    }
  } else {
    if (!state.ngrokStatus.wasUp) {
      sendAlert('ngrok_up', 
        `🌐 Ngrok tunnel back online: ${ngrok.url}`,
        'info'
      );
      state.ngrokStatus.wasUp = true;
    }
    state.ngrokStatus.lastSeen = now;
  }
  
  // Check 4: Token Usage
  const tokens = checkTokenUsage();
  if (tokens && tokens.percent > THRESHOLDS.tokenUsagePercent) {
    sendAlert('token_high', 
      `📊 Token usage at ${tokens.percent}% (${tokens.count}/${tokens.limit})`,
      'warning'
    );
  }
  
  state.lastCheck = now;
  saveState(state);
  
  log('✅ Checks complete');
}

// CLI interface
if (process.argv.includes('--check')) {
  runChecks();
} else if (process.argv.includes('--daemon')) {
  log('🚀 Starting alert daemon (checking every 2 minutes)...');
  runChecks();
  setInterval(runChecks, 2 * 60 * 1000);
} else {
  console.log('Usage:');
  console.log('  node alert-system.js --check    # Run checks once');
  console.log('  node alert-system.js --daemon   # Run continuously');
}
