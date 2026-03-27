// Notification Center Module - In-dashboard alerts
import { execSync } from 'child_process';

// Notification store
const notifications = [];
const NOTIFICATION_HISTORY_LIMIT = 50;

// Thresholds for alerts
const THRESHOLDS = {
  cpu: { warning: 80, critical: 90 },
  memory: { warning: 85, critical: 90 },
  disk: { warning: 80, critical: 90 }
};

// Alert states to prevent spam
const alertStates = {
  cpu: { warningSent: false, criticalSent: false },
  memory: { warningSent: false, criticalSent: false },
  diskC: { warningSent: false, criticalSent: false },
  diskD: { warningSent: false, criticalSent: false }
};

// Add notification
function addNotification(type, title, message, priority = 'normal') {
  const notification = {
    id: Date.now() + Math.random(),
    type,
    title,
    message,
    priority,
    timestamp: Date.now(),
    read: false
  };
  
  notifications.unshift(notification);
  
  // Keep only last 50
  if (notifications.length > NOTIFICATION_HISTORY_LIMIT) {
    notifications.pop();
  }
  
  return notification;
}

// Check system thresholds
function checkThresholds(systemData, notifyFn) {
  const alerts = [];
  
  // CPU check
  if (systemData.cpu >= THRESHOLDS.cpu.critical && !alertStates.cpu.criticalSent) {
    alertStates.cpu.criticalSent = true;
    alerts.push(addNotification('alert', '🔴 CPU Critical', `CPU usage at ${systemData.cpu}%`, 'urgent'));
  } else if (systemData.cpu >= THRESHOLDS.cpu.warning && !alertStates.cpu.warningSent) {
    alertStates.cpu.warningSent = true;
    alerts.push(addNotification('alert', '🟡 CPU Warning', `CPU usage at ${systemData.cpu}%`, 'high'));
  } else if (systemData.cpu < THRESHOLDS.cpu.warning - 10) {
    alertStates.cpu.warningSent = false;
    alertStates.cpu.criticalSent = false;
  }
  
  // Memory check
  if (systemData.memory >= THRESHOLDS.memory.critical && !alertStates.memory.criticalSent) {
    alertStates.memory.criticalSent = true;
    alerts.push(addNotification('alert', '🔴 Memory Critical', `Memory usage at ${systemData.memory}%`, 'urgent'));
  } else if (systemData.memory >= THRESHOLDS.memory.warning && !alertStates.memory.warningSent) {
    alertStates.memory.warningSent = true;
    alerts.push(addNotification('alert', '🟡 Memory Warning', `Memory usage at ${systemData.memory}%`, 'high'));
  } else if (systemData.memory < THRESHOLDS.memory.warning - 10) {
    alertStates.memory.warningSent = false;
    alertStates.memory.criticalSent = false;
  }
  
  // Disk C check
  if (systemData.diskC?.used >= THRESHOLDS.disk.critical && !alertStates.diskC.criticalSent) {
    alertStates.diskC.criticalSent = true;
    alerts.push(addNotification('alert', '🔴 Disk C Critical', `Disk C at ${systemData.diskC.used}%`, 'urgent'));
  } else if (systemData.diskC?.used >= THRESHOLDS.disk.warning && !alertStates.diskC.warningSent) {
    alertStates.diskC.warningSent = true;
    alerts.push(addNotification('alert', '🟡 Disk C Warning', `Disk C at ${systemData.diskC.used}%`, 'high'));
  } else if (systemData.diskC?.used < THRESHOLDS.disk.warning - 10) {
    alertStates.diskC.warningSent = false;
    alertStates.diskC.criticalSent = false;
  }
  
  return alerts;
}

// Start notification monitoring
function startNotificationMonitoring(io, notifyDaNotify) {
  // Check thresholds every 10 seconds
  setInterval(() => {
    // Get latest system data (would need to import from server.js)
    // For now, emit current notifications
    io.emit('notifications-update', {
      notifications: notifications.slice(0, 20),
      unread: notifications.filter(n => !n.read).length
    });
  }, 10000);
  
  console.log('🔔 Notification center started');
}

// API routes setup
function setupNotificationRoutes(app, io) {
  // Get notifications
  app.get('/api/notifications', (req, res) => {
    res.json({
      notifications: notifications.slice(0, 20),
      unread: notifications.filter(n => !n.read).length
    });
  });
  
  // Mark as read
  app.post('/api/notifications/:id/read', (req, res) => {
    const notification = notifications.find(n => n.id == req.params.id);
    if (notification) {
      notification.read = true;
      io.emit('notifications-update', {
        notifications: notifications.slice(0, 20),
        unread: notifications.filter(n => !n.read).length
      });
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Notification not found' });
    }
  });
  
  // Mark all as read
  app.post('/api/notifications/read-all', (req, res) => {
    notifications.forEach(n => n.read = true);
    io.emit('notifications-update', {
      notifications: notifications.slice(0, 20),
      unread: 0
    });
    res.json({ success: true });
  });
}

export { 
  startNotificationMonitoring, 
  setupNotificationRoutes, 
  addNotification,
  checkThresholds,
  notifications 
};
