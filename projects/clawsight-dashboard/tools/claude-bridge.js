import { io } from 'socket.io-client';
import { readFile, writeFile, appendFile } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../data');
const INBOX_FILE = join(DATA_DIR, 'claude-inbox.jsonl');
const BRIDGE_LOG = join(DATA_DIR, 'bridge.log');

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3472';

async function log(line) {
  const ts = new Date().toISOString();
  const entry = `[${ts}] ${line}`;
  console.log(entry);
  try {
    await appendFile(BRIDGE_LOG, entry + '\n');
  } catch {}
}

async function appendInbox(record) {
  const line = JSON.stringify({ ...record, _ts: Date.now() }) + '\n';
  await appendFile(INBOX_FILE, line);
}

async function sendMessage(text) {
  try {
    const res = await fetch(`${DASHBOARD_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'claude', text, type: 'chat' })
    });
    const data = await res.json();
    await log(`SENT: ${text.substring(0, 60)}${text.length > 60 ? '...' : ''} (id: ${data.id})`);
    return data;
  } catch (err) {
    await log(`SEND ERROR: ${err.message}`);
    throw err;
  }
}

async function checkPendingRequests() {
  try {
    const res = await fetch(`${DASHBOARD_URL}/api/requests?status=pending`);
    const requests = await res.json();
    return requests;
  } catch (err) {
    await log(`REQUEST CHECK ERROR: ${err.message}`);
    return [];
  }
}

// CLI: send mode
if (process.argv[2] === 'send') {
  const text = process.argv.slice(3).join(' ');
  if (!text) {
    console.error('Usage: node claude-bridge.js send <message>');
    process.exit(1);
  }
  await sendMessage(text);
  process.exit(0);
}

// CLI: poll mode (one-shot check)
if (process.argv[2] === 'poll') {
  try {
    if (!existsSync(INBOX_FILE)) {
      console.log('No messages yet.');
      process.exit(0);
    }
    const lines = (await readFile(INBOX_FILE, 'utf8')).split('\n').filter(Boolean);
    const messages = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    const unread = messages.filter(m => !m.read);
    if (!unread.length) {
      console.log('No new messages.');
      process.exit(0);
    }
    console.log(`\n=== ${unread.length} new message(s) ===\n`);
    for (const m of unread) {
      console.log(`[${new Date(m.timestamp).toLocaleString()}] Robert: ${m.text}`);
      m.read = true;
    }
    // Rewrite file with read flags updated
    await writeFile(INBOX_FILE, messages.map(m => JSON.stringify(m)).join('\n') + '\n');
    console.log('\n=== end ===\n');
  } catch (err) {
    console.error('Poll error:', err.message);
  }
  process.exit(0);
}

// Daemon mode (default)
await log('Bridge starting...');
await log(`Connecting to ${DASHBOARD_URL}`);

const socket = io(DASHBOARD_URL, { transports: ['websocket', 'polling'] });

socket.on('connect', async () => {
  await log('Connected to dashboard');
});

socket.on('disconnect', async (reason) => {
  await log(`Disconnected: ${reason}`);
});

socket.on('new-message', async (msg) => {
  if (msg.from === 'user') {
    await log(`INBOX: ${msg.text.substring(0, 80)}${msg.text.length > 80 ? '...' : ''}`);
    await appendInbox(msg);
  }
});

socket.on('new-request', async (req) => {
  await log(`NEW REQUEST: ${req.title}`);
  await appendInbox({ type: 'request', ...req });
});

socket.on('request-resolved', async (req) => {
  await log(`REQUEST RESOLVED: ${req.title} -> ${req.status}`);
});

// Heartbeat
setInterval(() => {
  if (socket.connected) socket.emit('heartbeat');
}, 30000);

await log('Bridge daemon running. Press Ctrl+C to stop.');

// Keep alive
setInterval(() => {}, 60000);
