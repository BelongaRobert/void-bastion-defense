import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

/**
 * DaNotify - Centralized Notification Hub
 * 
 * Aggregates notifications from multiple sources:
 * - System monitoring (disk, CPU, memory)
 * - GitHub (issues, PRs, mentions)
 * - Email (Gmail IMAP)
 * - Calendar (Google Calendar)
 * 
 * Outputs: Telegram messages
 */

class DaNotify {
  constructor() {
    this.telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.monitors = [];
    this.running = false;
  }

  async init() {
    console.log('🔔 DaNotify Starting...');
    
    // Load monitors based on available config
    if (this.telegramToken && this.chatId) {
      console.log('✅ Telegram configured');
    } else {
      console.warn('⚠️ Telegram not configured, notifications disabled');
    }

    // Import and initialize monitors
    const { SystemMonitor } = await import('./monitors/system.js');
    this.monitors.push(new SystemMonitor(this));

    // Optional monitors (if config exists)
    if (process.env.GITHUB_TOKEN) {
      const { GitHubMonitor } = await import('./monitors/github.js');
      this.monitors.push(new GitHubMonitor(this));
      console.log('✅ GitHub monitor enabled');
    }

    if (process.env.EMAIL_USER) {
      const { EmailMonitor } = await import('./monitors/email.js');
      this.monitors.push(new EmailMonitor(this));
      console.log('✅ Email monitor enabled');
    }

    console.log(`📊 ${this.monitors.length} monitor(s) loaded`);
  }

  async start() {
    await this.init();
    this.running = true;

    // Start all monitors
    for (const monitor of this.monitors) {
      try {
        await monitor.start();
        console.log(`✅ ${monitor.name} started`);
      } catch (err) {
        console.error(`❌ ${monitor.name} failed:`, err.message);
      }
    }

    // Daily digest at 8 AM
    this.scheduleDigest();

    console.log('\n🚀 DaNotify is running');
    console.log('Press Ctrl+C to stop\n');

    // Keep alive
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  async stop() {
    console.log('\n👋 Stopping DaNotify...');
    this.running = false;
    
    for (const monitor of this.monitors) {
      try {
        await monitor.stop();
      } catch (err) {
        // Ignore stop errors
      }
    }
    
    process.exit(0);
  }

  scheduleDigest() {
    // Simple daily check - in production use node-cron
    const now = new Date();
    const next8am = new Date(now);
    next8am.setHours(8, 0, 0, 0);
    if (next8am <= now) next8am.setDate(next8am.getDate() + 1);
    
    const msUntil8am = next8am - now;
    
    setTimeout(() => {
      this.sendDailyDigest();
      // Repeat every 24 hours
      setInterval(() => this.sendDailyDigest(), 24 * 60 * 60 * 1000);
    }, msUntil8am);
    
    console.log(`📅 Daily digest scheduled for ${next8am.toLocaleTimeString()}`);
  }

  async sendDailyDigest() {
    const summary = await this.generateSummary();
    await this.notify('📊 Daily Digest', summary);
  }

  async generateSummary() {
    // Aggregate status from all monitors
    const statuses = [];
    for (const monitor of this.monitors) {
      if (monitor.getStatus) {
        statuses.push(`${monitor.name}: ${await monitor.getStatus()}`);
      }
    }
    return statuses.join('\n') || 'All systems nominal';
  }

  /**
   * Send notification via Telegram
   */
  async notify(title, message, priority = 'normal') {
    if (!this.telegramToken || !this.chatId) {
      console.log(`[${title}] ${message}`);
      return;
    }

    const text = priority === 'urgent' 
      ? `🔴 *${title}*\n\n${message}`
      : `*${title}*\n\n${message}`;

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.telegramToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.chatId,
            text: text,
            parse_mode: 'Markdown'
          })
        }
      );

      if (!response.ok) {
        console.error('Telegram notification failed:', await response.text());
      }
    } catch (err) {
      console.error('Notification error:', err.message);
    }
  }
}

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = new DaNotify();
  app.start().catch(console.error);
}

export { DaNotify };
