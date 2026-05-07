import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

import { readFile, writeFile, appendFile } from 'fs/promises';
import { existsSync } from 'fs';

const DATA_DIR = join(__dirname, '../data');
const INBOX_FILE = join(DATA_DIR, 'telegram-inbox.jsonl');
const OFFSET_FILE = join(DATA_DIR, 'telegram-offset.txt');
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = '8666283585';

if (!TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN not set');
  process.exit(1);
}

async function getOffset() {
  if (existsSync(OFFSET_FILE)) {
    const val = await readFile(OFFSET_FILE, 'utf8');
    return parseInt(val.trim()) || 0;
  }
  return 0;
}

async function setOffset(offset) {
  await writeFile(OFFSET_FILE, offset.toString());
}

async function fetchUpdates() {
  const offset = await getOffset();
  const url = `https://api.telegram.org/bot${TOKEN}/getUpdates?offset=${offset + 1}&limit=20`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.ok) {
    console.error('Telegram API error:', data.description);
    return [];
  }
  return data.result || [];
}

async function sendMessage(text) {
  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown' })
  });
  const data = await res.json();
  if (!data.ok) console.error('Send error:', data.description);
  return data.ok;
}

async function saveMessages(updates) {
  if (!updates.length) return;
  const lines = [];
  let maxId = 0;
  for (const u of updates) {
    maxId = Math.max(maxId, u.update_id);
    if (u.message) {
      const m = u.message;
      lines.push(JSON.stringify({
        id: m.message_id,
        from: m.from?.id?.toString(),
        username: m.from?.username,
        firstName: m.from?.first_name,
        chatId: m.chat?.id?.toString(),
        text: m.text || '',
        date: m.date,
        _ts: Date.now(),
        read: false
      }));
    }
    if (u.callback_query) {
      const cb = u.callback_query;
      lines.push(JSON.stringify({
        type: 'callback',
        data: cb.data,
        from: cb.from?.id?.toString(),
        username: cb.from?.username,
        _ts: Date.now(),
        read: false
      }));
    }
  }
  if (lines.length) {
    await appendFile(INBOX_FILE, lines.join('\n') + '\n');
  }
  await setOffset(maxId);
}

// Main
const command = process.argv[2];

if (command === 'fetch') {
  const updates = await fetchUpdates();
  await saveMessages(updates);
  const messages = updates.filter(u => u.message).map(u => u.message);
  const callbacks = updates.filter(u => u.callback_query).map(u => u.callback_query);
  if (!messages.length && !callbacks.length) {
    console.log('No new Telegram messages.');
  } else {
    console.log(`\n=== ${messages.length + callbacks.length} new update(s) ===\n`);
    for (const m of messages) {
      console.log(`[${new Date(m.date * 1000).toLocaleString()}] ${m.from?.first_name || m.from?.username}: ${m.text}`);
    }
    for (const cb of callbacks) {
      console.log(`[Callback] ${cb.from?.first_name || cb.from?.username}: ${cb.data}`);
    }
    console.log('\n=== end ===\n');
  }
  process.exit(0);
}

if (command === 'send') {
  const text = process.argv.slice(3).join(' ');
  if (!text) {
    console.error('Usage: node tg.js send <message>');
    process.exit(1);
  }
  const ok = await sendMessage(text);
  if (ok) console.log('Sent.');
  process.exit(0);
}

if (command === 'poll') {
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
    console.log(`\n=== ${unread.length} unread message(s) ===\n`);
    for (const m of unread) {
      const name = m.firstName || m.username || m.from;
      console.log(`[${new Date(m._ts).toLocaleString()}] ${name}: ${m.text || m.data}`);
      m.read = true;
    }
    await writeFile(INBOX_FILE, messages.map(m => JSON.stringify(m)).join('\n') + '\n');
    console.log('\n=== end ===\n');
  } catch (err) {
    console.error('Poll error:', err.message);
  }
  process.exit(0);
}

console.log('Usage: node tg.js fetch|send <msg>|poll');
process.exit(1);
