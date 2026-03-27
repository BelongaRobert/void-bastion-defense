import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

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
const DANOTIFY_URL = process.env.DANOTIFY_URL || 'http://localhost:18790/api/notify';

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
  const activity = { icon, text, timestamp: Date.now() };
  activities.unshift(activity);
  if (activities.length > 20) activities.pop();
  
  // Broadcast to all clients
  io.emit('activity', activity);
}

// Collect system data
async function collectSystemData() {
  try {
    // Get memory info
    const memResult = execSync(
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
      const cpuResult = execSync(
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
  socket.emit('system-update', systemData);
  socket.emit('init-activities', activities);
  socket.emit('connections', Array.from(clients.values()));
  
  // Update user count
  systemData.activeUsers = clients.size;
  io.emit('system-update', systemData);
  io.emit('connections', Array.from(clients.values()));
  
  // Send notification to DaNotify
  notifyDaNotify('Dashboard Activity', `🖥️ ${browser} ${isMobile ? 'mobile' : 'desktop'} connected from ${clientIp}`, 'low');
  addActivity('🖥️', `${browser} ${isMobile ? 'mobile' : 'desktop'} connected`);
  
  socket.on('ping', () => {
    socket.emit('pong');
  });
  
  socket.on('disconnect', () => {
    console.log('Dashboard client disconnected:', socket.id);
    clients.delete(socket.id);
    systemData.activeUsers = clients.size;
    io.emit('system-update', systemData);
    io.emit('connections', Array.from(clients.values()));
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
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  httpServer.close(() => {
    process.exit(0);
  });
});

export { addActivity };
