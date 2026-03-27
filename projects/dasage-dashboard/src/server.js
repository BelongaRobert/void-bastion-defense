import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { startGatewayMonitoring, setupGatewayRoutes } from './gateway.js';
import { startActivityMonitoring } from './activities.js';
import { startNotificationMonitoring, setupNotificationRoutes, checkThresholds } from './notifications.js';
import { getCommandLog, getLogEmitter, loggedExec, loggedExecSync, clearLog } from './logger.js';
import { sendSmartNotification, checkSmartThresholds, setupPresenceTracking, updatePresence, userPresence } from './smart-notify.js';
import { addHistoryPoint, getAllPredictions, startAnalyticsCollection } from './analytics.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3456;

// Static files
app.use(express.static(join(__dirname, '../public')));

// Store client connections with details
const clients = new Map();

// DaNotify API URL
const DANOTIFY_URL = process.env.DANOTIFY_URL || 'http://localhost:18789/api/notify';

// System data cache
let systemData = {
  memory: 46,
  cpu: 4.7,
  health: 98,
  projects: 7,
  activeUsers: 0,
  diskC: { used: 54.59, total: 100 },
  diskD: { used: 40.14, total: 100 }
};

// Historical data for charts (last 60 readings = 5 minutes)
const historyData = {
  cpu: [],
  memory: [],
  diskC: [],
  diskD: [],
  timestamps: []
};

// Activity log
const activities = [];

function addActivity(icon, text) {
  try {
    const activity = { icon, text, timestamp: Date.now() };
    activities.unshift(activity);
    if (activities.length > 20) activities.pop();

    // Broadcast to all clients
    io.emit('activity', activity);
  } catch (err) {
    console.log('Error in addActivity:', err.message);
  }
}

// Collect system data
async function collectSystemData() {
  try {
    // Get memory info
    const memResult = loggedExecSync(
      'wmic ComputerSystem get TotalPhysicalMemory /value && wmic OS get FreePhysicalMemory /value',
      { shell: 'cmd', encoding: 'utf-8', timeout: 5000 }
    );

    let memory = systemData.memory;
    const totalMatch = memResult.match(/TotalPhysicalMemory=(\d+)/);
    const freeMatch = memResult.match(/FreePhysicalMemory=(\d+)/);

    if (totalMatch && freeMatch) {
      const total = parseInt(totalMatch[1]);
      const free = parseInt(freeMatch[1]) * 1024;
      memory = Math.round(((total - free) / total) * 100);
    }

    // Get CPU
    let cpu = systemData.cpu;
    try {
      const cpuResult = loggedExecSync(
        'wmic cpu get loadpercentage /value',
        { shell: 'cmd', encoding: 'utf-8', timeout: 3000 }
      );
      const cpuMatch = cpuResult.match(/LoadPercentage=(\d+)/);
      if (cpuMatch) cpu = parseInt(cpuMatch[1]);
    } catch (e) { /* Use cached */ }

    // Static disk data (fetched from DaSystem)
    const diskC = { used: 55, total: 931 }; // C: Drive ~55% full
    const diskD = { used: 40, total: 1862 }; // D: Drive ~40% full

    // Update system data
    systemData = {
      memory,
      cpu,
      health: calculateHealth(memory, cpu),
      projects: 7,
      activeUsers: clients.size + 1,
      diskC,
      diskD
    };

    // Update history (keep last 60 readings)
    const now = Date.now();
    historyData.cpu.push(cpu);
    historyData.memory.push(memory);
    historyData.diskC.push(diskC.used);
    historyData.diskD.push(diskD.used);
    historyData.timestamps.push(now);

    if (historyData.cpu.length > 60) {
      historyData.cpu.shift();
      historyData.memory.shift();
      historyData.diskC.shift();
      historyData.diskD.shift();
      historyData.timestamps.shift();
    }

    // Emit to clients
    io.emit('system-update', systemData);
    io.emit('history-update', historyData);

    // Add to analytics for predictions
    addHistoryPoint('cpu', cpu);
    addHistoryPoint('memory', memory);
    addHistoryPoint('diskC', diskC.used);
    addHistoryPoint('diskD', diskD.used);

    // Check thresholds for notifications
    const alerts = await checkSmartThresholds(systemData, io, notifyDaNotify);
    if (alerts.length > 0) {
      alerts.forEach(alert => {
        addActivity('⚠️', alert.message);
      });
    }

  } catch (err) {
    console.log('System data error:', err.message);
  }
}

function calculateHealth(memory, cpu) {
  // Simple health calculation
  let health = 100;
  if (memory > 80) health -= 15;
  if (memory > 90) health -= 20;
  if (cpu > 70) health -= 10;
  if (cpu > 90) health -= 20;
  return Math.max(0, Math.min(100, health));
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Dashboard client connected:', socket.id);

  // Parse connection details
  const userAgent = socket.handshake.headers['user-agent'] || 'Unknown';
  const clientIp = socket.handshake.address || socket.handshake.headers['x-forwarded-for'] || 'Unknown';
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent);

  // Extract browser
  let browser = 'Unknown';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  // Store client with details
  clients.set(socket.id, {
    id: socket.id,
    device: isMobile ? 'mobile' : 'desktop',
    browser: browser,
    ip: clientIp,
    connectedAt: new Date().toISOString()
  });

  // Send current data
  try {
    socket.emit('system-update', systemData);
    socket.emit('init-activities', activities);
    socket.emit('connections', Array.from(clients.values()));
  } catch (err) {
    console.log('Error sending initial data:', err.message);
  }

  // Presence tracking - user is active
  try {
    updatePresence('overview', true);
  } catch (err) {
    console.log('Error in presence tracking:', err.message);
  }

  // Track tab changes
  socket.on('tab-change', (tab) => {
    try {
      updatePresence(tab, true);
      console.log(`User switched to tab: ${tab}`);
    } catch (err) {
      console.log('Error in tab-change:', err.message);
    }
  });

  // Heartbeat - user is active
  socket.on('heartbeat', () => {
    try {
      updatePresence(userPresence?.lastActiveTab || 'overview', true);
    } catch (err) {
      console.log('Error in heartbeat:', err.message);
    }
  });

  // Handle action buttons from notifications
  socket.on('notification-action', async (data) => {
    try {
      console.log('Notification action:', data);
      // Navigate or execute based on action
      if (data.action?.startsWith('navigate:')) {
        const tab = data.action.split(':')[1];
        socket.emit('navigate-to', tab);
      }
    } catch (err) {
      console.log('Error in notification-action:', err.message);
    }
  });

  // Update user count
  try {
    systemData.activeUsers = clients.size;
    io.emit('system-update', systemData);
    io.emit('connections', Array.from(clients.values()));

    // Send notification to DaNotify
    notifyDaNotify('Dashboard Activity', `🖥️ ${browser} ${isMobile ? 'mobile' : 'desktop'} connected from ${clientIp}`, 'low');
    addActivity('🖥️', `${browser} ${isMobile ? 'mobile' : 'desktop'} connected`);
  } catch (err) {
    console.log('Error sending connection notification:', err.message);
  }

  socket.on('ping', () => {
    try {
      socket.emit('pong');
    } catch (err) {
      console.log('Error in ping handler:', err.message);
    }
  });

  socket.on('disconnect', () => {
    try {
      console.log('Dashboard client disconnected:', socket.id);
      clients.delete(socket.id);
      systemData.activeUsers = clients.size;
      io.emit('system-update', systemData);
      io.emit('connections', Array.from(clients.values()));
    } catch (err) {
      console.log('Error in disconnect handler:', err.message);
    }
  });
});

// DaNotify notification function
async function notifyDaNotify(title, message, priority = 'normal') {
  try {
    await fetch(DANOTIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        message,
        priority,
        source: 'dasage-dashboard',
        type: 'activity'
      })
    });
  } catch (err) {
    console.log('DaNotify error:', err.message);
  }
}

// API routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    clients: clients.size,
    ...systemData
  });
});

app.get('/api/activity', (req, res) => {
  res.json(activities);
});

app.get('/api/history', (req, res) => {
  res.json(historyData);
});

// Terminal API - Phase 1
app.get('/api/terminal', (req, res) => {
  const filter = {
    category: req.query.category,
    status: req.query.status,
    limit: parseInt(req.query.limit) || 50
  };
  res.json({
    commands: getCommandLog(filter),
    total: getCommandLog().length
  });
});

app.post('/api/terminal/clear', (req, res) => {
  clearLog();
  res.json({ success: true });
});

// Predictions API
app.get('/api/predictions', (req, res) => {
  const predictions = getAllPredictions();
  res.json(predictions);
});

// Start data collection loop
setInterval(collectSystemData, 5000); // Every 5 seconds

// Initial collection
collectSystemData();

// Demo activity
setTimeout(() => {
  addActivity('🎨', 'DaSage Dashboard launched');
}, 1000);

httpServer.listen(PORT, () => {
  console.log(`🐙 DaSage Dashboard running on port ${PORT}`);
  console.log(`📱 Mobile optimized for cellular access`);
  console.log(`🌐 Local: http://localhost:${PORT}`);

  // Send startup notification to DaNotify
  const tunnelUrl = process.env.TUNNEL_URL || 'https://distant-professionals-installing-dash.trycloudflare.com';
  notifyDaNotify(
    '🐙 Dashboard Started',
    `Server auto-restarted and is now online\n\n📱 Local: http://localhost:${PORT}\n🌐 Tunnel: ${tunnelUrl}`,
    'normal'
  ).catch(err => console.log('Failed to send startup notification:', err.message));

  // Start all monitoring
  startGatewayMonitoring(io, notifyDaNotify);
  startActivityMonitoring(io);
  startNotificationMonitoring(io, notifyDaNotify);

  // Setup notification routes
  setupNotificationRoutes(app, io);

  // Terminal real-time updates
  const logEmitter = getLogEmitter();
  logEmitter.on('command', (entry) => {
    try {
      io.emit('terminal-command', entry);
    } catch (err) {
      console.log('Error emitting terminal-command:', err.message);
    }
  });
  logEmitter.on('update', (entry) => {
    try {
      io.emit('terminal-update', entry);
    } catch (err) {
      console.log('Error emitting terminal-update:', err.message);
    }
  });

  console.log('🖥️  Terminal logging active');
});

// Setup Gateway API routes
setupGatewayRoutes(app);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  httpServer.close(() => {
    process.exit(0);
  });
});

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  console.error(err.stack);
  // Don't exit - log and continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - log and continue
});

// Socket.io error handling
io.on('error', (err) => {
  console.error('Socket.io error:', err.message);
});

export { addActivity };
