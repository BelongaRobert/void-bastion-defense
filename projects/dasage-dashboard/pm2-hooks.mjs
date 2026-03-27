// PM2 Hooks for notifications
// This script runs when PM2 restarts the app

import { execSync } from 'child_process';

const DANOTIFY_URL = 'http://localhost:18790/api/notify';

async function sendNotification(title, message, priority = 'high') {
  try {
    await fetch(DANOTIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        message,
        priority,
        source: 'dasage-dashboard',
        type: 'system'
      })
    });
    console.log('Notification sent:', title);
  } catch (err) {
    console.log('Failed to send notification:', err.message);
  }
}

// Send crash notification
sendNotification(
  '⚠️ Dashboard Crashed',
  'Server crashed and PM2 is restarting it automatically.',
  'high'
);
