#!/usr/bin/env node
/**
 * Notification Helper
 * Queue notifications from any script
 * Usage: import { notify } from './scripts/notify.mjs'
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUEUE_FILE = join(__dirname, '..', 'notifications', 'queue.json');

/**
 * Queue a notification
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} priority - 'normal' or 'urgent'
 * @param {string} source - Source system (optional)
 */
export function notify(title, message, priority = 'normal', source = 'system') {
  let data = { notifications: [], config: {} };

  if (existsSync(QUEUE_FILE)) {
    try {
      data = JSON.parse(readFileSync(QUEUE_FILE, 'utf-8'));
    } catch (e) {
      console.error('Notification queue corrupted, resetting');
    }
  }

  const notification = {
    id: Date.now().toString(),
    title,
    message,
    priority,
    source,
    createdAt: new Date().toISOString(),
    sent: false
  };

  data.notifications.push(notification);
  writeFileSync(QUEUE_FILE, JSON.stringify(data, null, 2));

  console.log(`🔔 Queued: ${title}`);
  return notification.id;
}

/**
 * Send notification immediately (bypass queue)
 * Requires send-notifications.mjs to process
 */
export async function notifyNow(title, message, priority = 'normal') {
  // Import and use sender
  const { spawn } = await import('child_process');
  const sender = spawn('node', [
    join(__dirname, 'send-notifications.mjs'),
    title,
    message,
    priority
  ], {
    stdio: 'inherit'
  });

  return new Promise((resolve) => {
    sender.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

// CLI usage for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  if (args.length >= 2) {
    const [title, message, priority = 'normal'] = args;
    notify(title, message, priority);
    console.log('✅ Notification queued. Run send-notifications.mjs to send.');
  } else {
    console.log('Usage: node notify.mjs "Title" "Message" [priority]');
  }
}
