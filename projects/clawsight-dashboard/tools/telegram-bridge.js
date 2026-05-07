import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

import { Bot } from 'grammy';
import { readFile, writeFile, appendFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const DATA_DIR = join(__dirname, '../data');
const INBOX_FILE = join(DATA_DIR, 'telegram-inbox.jsonl');
const OUTBOX_FILE = join(DATA_DIR, 'telegram-outbox.jsonl');
const BRIDGE_LOG = join(DATA_DIR, 'telegram-bridge.log');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN not set in .env');
  process.exit(1);
}

const bot = new Bot(TOKEN);

async function log(line) {
  const ts = new Date().toISOString();
  const entry = `[${ts}] ${line}`;
  console.log(entry);
  try {
    await appendFile(BRIDGE_LOG, entry + '\n');
  } catch {}
}

async function saveMessage(msg) {
  const record = {
    id: msg.message_id,
    from: msg.from?.id?.toString(),
    username: msg.from?.username,
    firstName: msg.from?.first_name,
    chatId: msg.chat?.id?.toString(),
    text: msg.text || '',
    date: msg.date,
    _ts: Date.now()
  };
  await appendFile(INBOX_FILE, JSON.stringify(record) + '\n');
}

// Handle incoming messages
bot.on('message:text', async (ctx) => {
  const msg = ctx.msg;
  await log(`INBOX [${msg.from?.id}]: ${msg.text?.substring(0, 60)}`);
  await saveMessage(msg);
  await ctx.reply('Message received. I will relay this to Claude.');
});

// Handle inline keyboard callbacks
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const from = ctx.callbackQuery.from?.id?.toString();
  await log(`CALLBACK [${from}]: ${data}`);
  await appendFile(INBOX_FILE, JSON.stringify({
    type: 'callback',
    data,
    from,
    username: ctx.callbackQuery.from?.username,
    _ts: Date.now()
  }) + '\n');
  await ctx.answerCallbackText('Recorded.');
});

bot.catch((err) => {
  log(`ERROR: ${err.message}`);
});

// CLI: send mode
if (process.argv[2] === 'send') {
  const chatId = process.argv[3];
  const text = process.argv.slice(4).join(' ');
  if (!chatId || !text) {
    console.error('Usage: node telegram-bridge.js send <chatId> <message>');
    process.exit(1);
  }
  await bot.api.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  console.log('Sent.');
  process.exit(0);
}

// CLI: poll inbox
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
    console.log(`\n=== ${unread.length} new Telegram message(s) ===\n`);
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

// Daemon mode
await log('Telegram bridge starting...');
const me = await bot.api.getMe();
await log(`Bot: @${me.username}`);

// Clear webhook and start polling
await bot.api.deleteWebhook({ drop_pending_updates: true });
await log('Webhook cleared, starting polling...');

bot.start();
