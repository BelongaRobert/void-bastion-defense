// Gateway Integration Module
// Real OpenClaw Gateway status, cron jobs, and subagents

import { execSync } from 'child_process';

const GATEWAY_URL = 'http://localhost:18789';
const GATEWAY_HEALTH_URL = `${GATEWAY_URL}/health`;

// Gateway data cache
let gatewayData = {
  status: 'unknown',
  uptime: 0,
  version: 'unknown',
  lastCheck: null,
  cronJobs: [],
  subagents: []
};

// Fetch Gateway health
async function fetchGatewayHealth() {
  try {
    const response = await fetch(GATEWAY_HEALTH_URL, { 
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      gatewayData.status = 'error';
      gatewayData.lastCheck = new Date().toISOString();
      return;
    }
    
    const data = await response.json();
    gatewayData = {
      status: data.status || 'online',
      uptime: data.uptime || 0,
      version: data.version || 'unknown',
      lastCheck: new Date().toISOString(),
      cronJobs: gatewayData.cronJobs,
      subagents: gatewayData.subagents
    };
  } catch (err) {
    gatewayData.status = 'offline';
    gatewayData.lastCheck = new Date().toISOString();
    console.log('Gateway health check failed:', err.message);
  }
}

// Fetch cron jobs via CLI
async function fetchCronJobs() {
  try {
    const output = execSync('openclaw cron list --json', { 
      encoding: 'utf-8',
      timeout: 5000
    });
    const jobs = JSON.parse(output);
    gatewayData.cronJobs = jobs.jobs || [];
  } catch (err) {
    console.log('Cron fetch failed:', err.message);
    gatewayData.cronJobs = [];
  }
}

// Fetch subagents
async function fetchSubagents() {
  try {
    const output = execSync('openclaw agents list --json', { 
      encoding: 'utf-8',
      timeout: 5000
    });
    const data = JSON.parse(output);
    gatewayData.subagents = data.agents || [];
  } catch (err) {
    console.log('Subagent fetch failed:', err.message);
    gatewayData.subagents = [];
  }
}

// Start gateway monitoring
function startGatewayMonitoring(io, notifyFn) {
  // Initial fetch
  fetchGatewayHealth();
  fetchCronJobs();
  fetchSubagents();
  
  // Broadcast to clients
  io.emit('gateway-update', gatewayData);
  
  // Periodic updates (every 10 seconds)
  setInterval(async () => {
    await fetchGatewayHealth();
    io.emit('gateway-update', gatewayData);
  }, 10000);
  
  // Cron job updates (every 30 seconds)
  setInterval(async () => {
    await fetchCronJobs();
    io.emit('gateway-update', gatewayData);
  }, 30000);
  
  // Subagent updates (every 15 seconds)
  setInterval(async () => {
    await fetchSubagents();
    io.emit('gateway-update', gatewayData);
  }, 15000);
  
  console.log('🔌 Gateway monitoring started');
}

// API endpoints
function setupGatewayRoutes(app) {
  // Gateway status
  app.get('/api/gateway/status', (req, res) => {
    res.json(gatewayData);
  });
  
  // Cron jobs
  app.get('/api/gateway/cron', (req, res) => {
    res.json({ jobs: gatewayData.cronJobs });
  });
  
  // Subagents
  app.get('/api/gateway/subagents', (req, res) => {
    res.json({ subagents: gatewayData.subagents });
  });
  
  // Gateway control (protected)
  app.post('/api/gateway/restart', (req, res) => {
    // This would require authentication
    res.json({ message: 'Gateway restart requires authentication', status: 'protected' });
  });
}

export { startGatewayMonitoring, setupGatewayRoutes, gatewayData };
