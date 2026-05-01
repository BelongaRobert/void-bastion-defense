// Smart Notifications Module
// Context-aware alerts with priority levels

import { execSync } from 'child_process';

// Track user presence
const userPresence = {
  lastActiveTab: 'overview',
  isOnDashboard: false,
  lastHeartbeat: Date.now(),
  sessionStart: Date.now()
};

// Notification priorities
const PRIORITIES = {
  URGENT: { color: '🔴', level: 3, sound: true, vibration: true },
  HIGH:   { color: '🟡', level: 2, sound: true, vibration: false },
  NORMAL: { color: '🔵', level: 1, sound: false, vibration: false },
  LOW:    { color: '⚪', level: 0, sound: false, vibration: false }
};

// Update user presence
export function updatePresence(tab, isActive) {
  userPresence.lastActiveTab = tab;
  userPresence.isOnDashboard = isActive;
  userPresence.lastHeartbeat = Date.now();
}

// Check if user should be notified
function shouldNotify(priority) {
  // Always notify for urgent
  if (priority === 'urgent') return true;
  
  // Don't notify if user is actively on dashboard
  if (userPresence.isOnDashboard) {
    const timeSinceHeartbeat = Date.now() - userPresence.lastHeartbeat;
    // User is active if heartbeat within last 30 seconds
    if (timeSinceHeartbeat < 30000) {
      console.log('User active on dashboard - skipping notification');
      return false;
    }
  }
  
  return true;
}

// Smart notification function
export async function sendSmartNotification(io, notifyFn, title, message, priority = 'normal', actions = []) {
  const priorityConfig = PRIORITIES[priority.toUpperCase()] || PRIORITIES.NORMAL;
  
  // Check if we should notify
  if (!shouldNotify(priority)) {
    console.log(`Notification skipped (user active): ${title}`);
    return;
  }
  
  const notification = {
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    title: `${priorityConfig.color} ${title}`,
    message,
    priority,
    level: priorityConfig.level,
    actions,
    timestamp: Date.now(),
    context: {
      userTab: userPresence.lastActiveTab,
      userActive: userPresence.isOnDashboard
    }
  };
  
  // Emit to dashboard
  io.emit('smart-notification', notification);
  
  // Send to Telegram via DaNotify
  try {
    await notifyFn(title, message, priority);
  } catch (err) {
    console.log('DaNotify error:', err.message);
  }
  
  return notification;
}

// Enhanced threshold checking with smart notifications
export async function checkSmartThresholds(systemData, io, notifyFn) {
  const alerts = [];
  
  // CPU Critical
  if (systemData.cpu >= 95) {
    alerts.push({
      title: 'CPU Critical',
      message: `CPU at ${systemData.cpu}% - System may become unresponsive`,
      priority: 'urgent',
      actions: [
        { label: 'View System', action: 'navigate:system' },
        { label: 'Dismiss', action: 'dismiss' }
      ]
    });
  } else if (systemData.cpu >= 85) {
    alerts.push({
      title: 'CPU High',
      message: `CPU at ${systemData.cpu}% - Consider closing applications`,
      priority: 'high',
      actions: [
        { label: 'View System', action: 'navigate:system' }
      ]
    });
  }
  
  // Memory Critical
  if (systemData.memory >= 95) {
    alerts.push({
      title: 'Memory Critical',
      message: `Memory at ${systemData.memory}% - System may crash`,
      priority: 'urgent',
      actions: [
        { label: 'View System', action: 'navigate:system' },
        { label: 'Restart Services', action: 'restart:light' }
      ]
    });
  } else if (systemData.memory >= 80) {
    alerts.push({
      title: 'Memory Warning',
      message: `Memory at ${systemData.memory}% - Performance degrading`,
      priority: 'high',
      actions: [
        { label: 'View System', action: 'navigate:system' }
      ]
    });
  }
  
  // Disk Critical
  if (systemData.diskC?.used >= 95) {
    alerts.push({
      title: 'Disk C Critical',
      message: `Disk C at ${systemData.diskC.used}% - Free space urgently needed`,
      priority: 'urgent',
      actions: [
        { label: 'View Files', action: 'navigate:files' },
        { label: 'Clear Temp', action: 'exec:clear-temp' }
      ]
    });
  }
  
  // Gateway Offline
  if (systemData.gatewayStatus === 'offline') {
    alerts.push({
      title: 'Gateway Offline',
      message: 'OpenClaw Gateway is not responding',
      priority: 'urgent',
      actions: [
        { label: 'View Gateway', action: 'navigate:gateway' },
        { label: 'Restart', action: 'exec:restart-gateway' }
      ]
    });
  }
  
  // Send all alerts
  for (const alert of alerts) {
    await sendSmartNotification(io, notifyFn, alert.title, alert.message, alert.priority, alert.actions);
  }
  
  return alerts;
}

// Setup presence tracking
export function setupPresenceTracking(io) {
  io.on('connection', (socket) => {
    // User connected
    updatePresence('overview', true);
    
    socket.on('tab-change', (tab) => {
      updatePresence(tab, true);
    });
    
    socket.on('heartbeat', () => {
      userPresence.lastHeartbeat = Date.now();
    });
    
    socket.on('disconnect', () => {
      userPresence.isOnDashboard = false;
    });
  });
  
  // Periodic presence check
  setInterval(() => {
    const inactive = Date.now() - userPresence.lastHeartbeat > 60000; // 1 minute
    if (inactive) {
      userPresence.isOnDashboard = false;
    }
  }, 30000);
}

export { userPresence };
