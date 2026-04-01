#!/usr/bin/env node
/**
 * Simple Notification Sender
 * Reads queue and sends to Telegram
 * No background process needed!
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUEUE_FILE = join(__dirname, '..', 'notifications', 'queue.json');

class SimpleNotifier {
  constructor() {
    this.loadQueue();
  }

  loadQueue() {
    if (!existsSync(QUEUE_FILE)) {
      this.data = {
        notifications: [],
        config: {
          telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
          chatId: process.env.TELEGRAM_CHAT_ID || '',
          quietHoursStart: 23,
          quietHoursEnd: 7,
          rateLimitMs: 60000
        }
      };
      this.saveQueue();
    } else {
      try {
        this.data = JSON.parse(readFileSync(QUEUE_FILE, 'utf-8'));
      } catch (e) {
        console.error('❌ Corrupted queue file, resetting...');
        this.data = { notifications: [], config: {} };
      }
    }
  }

  saveQueue() {
    writeFileSync(QUEUE_FILE, JSON.stringify(this.data, null, 2));
  }

  isQuietHours() {
    const hour = new Date().getHours();
    return hour >= this.data.config.quietHoursStart || hour < this.data.config.quietHoursEnd;
  }

  async sendToTelegram(title, message, priority = 'normal') {
    const token = this.data.config.telegramToken;
    const chatId = this.data.config.chatId;

    if (!token || !chatId) {
      console.log('⚠️ Telegram not configured');
      return false;
    }

    const icon = priority === 'urgent' ? '🔴' : '🔔';
    const text = `${icon} *${title}*\n\n${message}`;

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
          })
        }
      );

      if (!response.ok) {
        console.error('❌ Telegram failed:', await response.text());
        return false;
      }

      console.log('✅ Sent to Telegram');
      return true;
    } catch (err) {
      console.error('❌ Network error:', err.message);
      return false;
    }
  }

  async processQueue() {
    const pending = this.data.notifications.filter(n => !n.sent);
    
    if (pending.length === 0) {
      console.log('📭 No pending notifications');
      return;
    }

    console.log(`📬 Processing ${pending.length} notification(s)...`);

    for (const notification of pending) {
      // Skip quiet hours unless urgent
      if (this.isQuietHours() && notification.priority !== 'urgent') {
        console.log(`🌙 Deferred (quiet hours): ${notification.title}`);
        notification.deferred = true;
        continue;
      }

      const success = await this.sendToTelegram(
        notification.title,
        notification.message,
        notification.priority
      );

      if (success) {
        notification.sent = true;
        notification.sentAt = new Date().toISOString();
        console.log(`✅ Sent: ${notification.title}`);
      } else {
        console.log(`❌ Failed: ${notification.title}`);
        notification.retries = (notification.retries || 0) + 1;
      }
    }

    // Clean up old sent notifications (keep last 100)
    this.data.notifications = this.data.notifications
      .filter(n => !n.sent || n.retries < 3)
      .slice(-100);

    this.saveQueue();
  }

  async sendNow(title, message, priority = 'normal') {
    // Add to queue and immediately process
    const notification = {
      id: Date.now().toString(),
      title,
      message,
      priority,
      createdAt: new Date().toISOString(),
      sent: false
    };

    this.data.notifications.push(notification);
    this.saveQueue();

    await this.processQueue();
  }
}

// CLI usage
const args = process.argv.slice(2);
const notifier = new SimpleNotifier();

if (args.length >= 2) {
  // Direct send: node send-notifications.mjs "Title" "Message" [priority]
  const [title, message, priority = 'normal'] = args;
  await notifier.sendNow(title, message, priority);
} else {
  // Process queue
  await notifier.processQueue();
}
