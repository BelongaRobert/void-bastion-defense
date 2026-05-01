import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { getCommandLog, getLogEmitter, loggedExecSync } from './logger.js';
import { sendSmartNotification, checkSmartThresholds, setupPresenceTracking, updatePresence, userPresence } from './smart-notify.js';
import { addHistoryPoint, getAllPredictions, startAnalyticsCollection } from './analytics.js';
import { getTasks, getProjects, getActivity, logActivity, updateTask, updateProject } from './state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3472;

// Middleware
app.use(express.static(join(__dirname, '../public')));
app.use(express.json());

// Client tracking
const clients = new Map();

// System data cache
let systemData = {
  memory: 46,
  cpu: 4.7,
  health: 98,
  projects: 4,
  activeUsers: 0,
  diskC: { used: 55, total: 931 },
  diskD: { used: 40, total: 1862 }
};

// History for charts
const historyData = { cpu: [], memory: [], diskC: [], diskD: [], timestamps: [] };

// Activity cache
const activities = [];

function addActivity(icon, text, meta = {}) {
  try {
    const activity = { icon, text, timestamp: Date.now(), ...meta };
    activities.unshift(activity);
    if (activities.length > 100) activities.pop();
    io.emit('activity', activity);
    logActivity({ icon, text, ...meta }).catch(() => {});
  } catch (err) {
    console.log('Error in addActivity:', err.message);
  }
}

// Collect system metrics
async function collectSystemData() {
  try {
    let memory = systemData.memory;
    try {
      const memResult = loggedExecSync(
        'wmic ComputerSystem get TotalPhysicalMemory /value && wmic OS get FreePhysicalMemory /value',
        { shell: 'cmd', encoding: 'utf-8', timeout: 5000 }
      );
      const totalMatch = memResult.match(/TotalPhysicalMemory=(\d+)/);
      const freeMatch = memResult.match(/FreePhysicalMemory=(\d+)/);
      if (totalMatch && freeMatch) {
        const total = parseInt(totalMatch[1]);
        const free = parseInt(freeMatch[1]) * 1024;
        memory = Math.round(((total - free) / total) * 100);
      }
    } catch {}

    let cpu = systemData.cpu;
    try {
      const cpuResult = loggedExecSync('wmic cpu get loadpercentage /value', { shell: 'cmd', encoding: 'utf-8', timeout: 3000 });
      const cpuMatch = cpuResult.match(/LoadPercentage=(\d+)/);
      if (cpuMatch) cpu = parseInt(cpuMatch[1]);
    } catch {}

    // Disk data
    let diskC = systemData.diskC;
    let diskD = systemData.diskD;
    try {
      const diskResult = loggedExecSync('wmic logicaldisk get Size,FreeSpace,Name /value', { shell: 'cmd', encoding: 'utf-8', timeout: 3000 });
      const cMatch = diskResult.match(/Name=C:[\s\S]*?Size=(\d+)[\s\S]*?FreeSpace=(\d+)/);
      const dMatch = diskResult.match(/Name=D:[\s\S]*?Size=(\d+)[\s\S]*?FreeSpace=(\d+)/);
      if (cMatch) {
        const total = parseInt(cMatch[1]);
        const free = parseInt(cMatch[2]);
        diskC = { used: Math.round(((total - free) / total) * 100), total: Math.round(total / 1e9) };
      }
      if (dMatch) {
        const total = parseInt(dMatch[1]);
        const free = parseInt(dMatch[2]);
        diskD = { used: Math.round(((total - free) / total) * 100), total: Math.round(total / 1e9) };
      }
    } catch {}

    systemData = {
      memory, cpu,
      health: calculateHealth(memory, cpu),
      projects: systemData.projects,
      activeUsers: clients.size,
      diskC, diskD
    };

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

    io.emit('system-update', systemData);
    io.emit('history-update', historyData);
    addHistoryPoint('cpu', cpu);
    addHistoryPoint('memory', memory);
    addHistoryPoint('diskC', diskC.used);
    addHistoryPoint('diskD', diskD.used);

    const alerts = await checkSmartThresholds(systemData, io, notifyExternal);
    if (alerts.length > 0) alerts.forEach(a => addActivity('⚠️', a.message));
  } catch (err) {
    console.log('System data error:', err.message);
  }
}

function calculateHealth(memory, cpu) {
  let health = 100;
  if (memory > 80) health -= 15;
  if (memory > 90) health -= 20;
  if (cpu > 70) health -= 10;
  if (cpu > 90) health -= 20;
  return Math.max(0, Math.min(100, health));
}

// Notification function (smart — skips if user is on dashboard)
async function notifyExternal(title, message, priority = 'normal') {
  try {
    if (userPresence.isOnDashboard && priority !== 'urgent') {
      console.log('User active on dashboard — skipping external notification');
      return;
    }
    // Send to Telegram if configured
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (token && chatId) {
      const text = priority === 'urgent' ? `🔴 *${title}*\n\n${message}` : `*${title}*\n\n${message}`;
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
      });
    }
  } catch (err) {
    console.log('External notify error:', err.message);
  }
}

// Socket.io
io.on('connection', (socket) => {
  const userAgent = socket.handshake.headers['user-agent'] || 'Unknown';
  const clientIp = socket.handshake.address || socket.handshake.headers['x-forwarded-for'] || 'Unknown';
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent);
  let browser = 'Unknown';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  clients.set(socket.id, { id: socket.id, device: isMobile ? 'mobile' : 'desktop', browser, ip: clientIp, connectedAt: new Date().toISOString() });
  systemData.activeUsers = clients.size;

  socket.emit('system-update', systemData);
  socket.emit('init-activities', activities.slice(0, 20));
  socket.emit('connections', Array.from(clients.values()));

  updatePresence('overview', true);

  socket.on('tab-change', (tab) => updatePresence(tab, true));
  socket.on('heartbeat', () => updatePresence(userPresence?.lastActiveTab || 'overview', true));
  socket.on('ping', () => socket.emit('pong'));

  socket.on('notification-action', async (data) => {
    if (data.action?.startsWith('navigate:')) {
      socket.emit('navigate-to', data.action.split(':')[1]);
    }
  });

  socket.on('disconnect', () => {
    clients.delete(socket.id);
    systemData.activeUsers = clients.size;
    io.emit('system-update', systemData);
    io.emit('connections', Array.from(clients.values()));
  });
});

setupPresenceTracking(io);

// API Routes
app.get('/api/status', (req, res) => {
  res.json({ status: 'online', uptime: process.uptime(), timestamp: new Date().toISOString(), clients: clients.size, ...systemData });
});

app.get('/api/activity', async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const fileActivity = await getActivity(limit);
  res.json(fileActivity);
});

app.get('/api/history', (req, res) => res.json(historyData));

// Tasks API
app.get('/api/tasks', async (req, res) => {
  try { res.json(await getTasks()); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const task = await updateTask(req.params.id, req.body);
    if (task) {
      io.emit('tasks-update', await getTasks());
      addActivity('✅', `Task updated: ${task.title}`);
      res.json(task);
    } else res.status(404).json({ error: 'Not found' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Projects API
app.get('/api/projects', async (req, res) => {
  try { res.json(await getProjects()); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/projects/:name', async (req, res) => {
  try {
    const project = await updateProject(req.params.name, req.body);
    if (project) {
      io.emit('projects-update', await getProjects());
      addActivity('🚀', `Project updated: ${project.name}`);
      res.json(project);
    } else res.status(404).json({ error: 'Not found' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Predictions
app.get('/api/predictions', (req, res) => res.json(getAllPredictions()));

// Terminal
app.get('/api/terminal', (req, res) => {
  const filter = { category: req.query.category, status: req.query.status, limit: parseInt(req.query.limit) || 50 };
  res.json({ commands: getCommandLog(filter), total: getCommandLog().length });
});

app.post('/api/terminal/clear', async (req, res) => {
  const { clearLog } = await import('./logger.js');
  clearLog();
  res.json({ success: true });
});

// Notifications
app.get('/api/notifications', (req, res) => res.json({ notifications: [], unread: 0 }));

// Gateway health (read-only)
app.get('/api/gateway/status', async (req, res) => {
  try {
    const response = await fetch('http://localhost:18789/health', { method: 'GET', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(3000) });
    const data = response.ok ? await response.json() : { status: 'error' };
    res.json({ status: data.status || 'online', uptime: data.uptime || 0, version: data.version || 'unknown', lastCheck: new Date().toISOString() });
  } catch {
    res.json({ status: 'offline', uptime: 0, version: 'unknown', lastCheck: new Date().toISOString() });
  }
});

// Unified notify endpoint (replaces DaNotify standalone)
app.post('/api/notify', async (req, res) => {
  try {
    const { title, message, priority = 'normal', source = 'api' } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'Title and message required' });
    addActivity('🔔', `[${source}] ${title}: ${message}`, { priority, source });
    await notifyExternal(title, message, priority);
    io.emit('smart-notification', { id: Date.now() + Math.random().toString(36).slice(2, 9), title, message, priority, timestamp: Date.now() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health
app.get('/health', (req, res) => res.json({ status: 'running', uptime: process.uptime(), timestamp: new Date().toISOString() }));

// Data collection
setInterval(collectSystemData, 5000);
collectSystemData();

// Terminal logging real-time
const logEmitter = getLogEmitter();
logEmitter.on('command', (entry) => { try { io.emit('terminal-command', entry); } catch {} });
logEmitter.on('update', (entry) => { try { io.emit('terminal-update', entry); } catch {} });

// Start server
httpServer.listen(PORT, async () => {
  console.log(`Clawsight Dashboard running on port ${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);

  addActivity('🚀', 'Clawsight Dashboard started');
  await notifyExternal('Dashboard Started', `Clawsight Dashboard online\n\nLocal: http://localhost:${PORT}`, 'normal');

  startAnalyticsCollection(io);
});

// Graceful shutdown
process.on('SIGTERM', () => { console.log('Shutting down...'); httpServer.close(() => process.exit(0)); });
process.on('SIGINT', () => { console.log('Shutting down...'); httpServer.close(() => process.exit(0)); });
process.on('uncaughtException', (err) => console.error('Uncaught:', err.message));
process.on('unhandledRejection', (reason) => console.error('Unhandled:', reason));
io.on('error', (err) => console.error('Socket.io error:', err.message));

export { addActivity, notifyExternal };
