#!/usr/bin/env node
/**
 * DaSage TUI Notification Command
 * Usage from TUI: notify "Title" "Message" [priority]
 */

import { notify, notifyNow } from './notify.mjs';

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === 'help') {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║        DASAGE NOTIFICATION SYSTEM v1.0            ║');
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log('║  notify "Title" "Message" [urgent|normal]         ║');
  console.log('║  notify queue                                     ║');
  console.log('║  notify send                                      ║');
  console.log('║  notify status                                    ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log();
  console.log('Examples:');
  console.log('  notify "Build Complete" "Dashboard deployed"');
  console.log('  notify "ERROR" "Server down" urgent');
  console.log('  notify queue   # Show pending notifications');
  console.log('  notify send    # Send all pending notifications');
  process.exit(0);
}

const command = args[0];

switch (command) {
  case 'queue': {
    import('fs').then(({ readFileSync }) => {
      const data = JSON.parse(readFileSync('./notifications/queue.json', 'utf-8'));
      const pending = data.notifications.filter(n => !n.sent);
      console.log(`📬 Pending notifications: ${pending.length}`);
      pending.forEach(n => {
        console.log(`  • ${n.title} (${n.priority}) - ${new Date(n.createdAt).toLocaleTimeString()}`);
      });
    });
    break;
  }

  case 'send': {
    import('./send-notifications.mjs');
    break;
  }

  case 'status': {
    import('fs').then(({ readFileSync }) => {
      const data = JSON.parse(readFileSync('./notifications/queue.json', 'utf-8'));
      const total = data.notifications.length;
      const pending = data.notifications.filter(n => !n.sent).length;
      const sent = data.notifications.filter(n => n.sent).length;
      
      console.log('╔═══════════════════════════════════════════════════╗');
      console.log('║           NOTIFICATION STATUS                      ║');
      console.log('╠═══════════════════════════════════════════════════╣');
      console.log(`║  Total:    ${total.toString().padEnd(36)} ║`);
      console.log(`║  Pending:  ${pending.toString().padEnd(36)} ║`);
      console.log(`║  Sent:     ${sent.toString().padEnd(36)} ║`);
      console.log('╚═══════════════════════════════════════════════════╝');
    });
    break;
  }

  default: {
    // Send notification: notify "Title" "Message" [priority]
    const [title, message, priority = 'normal'] = args;
    if (title && message) {
      notify(title, message, priority);
      console.log('✅ Notification queued. Use "notify send" to dispatch.');
    } else {
      console.log('❌ Usage: notify "Title" "Message" [priority]');
    }
  }
}
