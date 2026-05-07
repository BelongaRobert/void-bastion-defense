// Telegram Bot Integration for Clawsight Dashboard
// Receives commands from Robert, sends approval requests and alerts

import { existsSync } from 'fs';
import { readFile, writeFile, appendFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../data');
const CHAT_ID_FILE = join(DATA_DIR, 'telegram-chat-id.txt');

const API_BASE = 'https://api.telegram.org/bot';

let botToken = process.env.TELEGRAM_BOT_TOKEN;
let chatId = null;

// Load cached chat ID
async function loadChatId() {
  if (existsSync(CHAT_ID_FILE)) {
    chatId = (await readFile(CHAT_ID_FILE, 'utf8')).trim();
  }
}

async function saveChatId(id) {
  chatId = id;
  await writeFile(CHAT_ID_FILE, id);
}

// Generic Telegram API call
async function tgApi(method, body) {
  const res = await fetch(`${API_BASE}${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.description || `Telegram API error: ${method}`);
  return data.result;
}

// Send a plain text message
export async function sendTelegramMessage(text, options = {}) {
  if (!botToken) { console.log('Telegram: no token configured'); return; }
  if (!chatId) { console.log('Telegram: no chat ID yet. Ask Robert to message the bot first.'); return; }
  try {
    return await tgApi('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      ...options
    });
  } catch (err) {
    console.log('Telegram send error:', err.message);
  }
}

// Send approval request with inline keyboard
export async function sendApprovalRequest(title, description, requestId) {
  if (!chatId) return;
  const text = `*Approval Request*\n\n*${title}*\n${description || ''}`;
  try {
    return await tgApi('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Approve', callback_data: `approve:${requestId}` },
          { text: '❌ Deny', callback_data: `deny:${requestId}` }
        ]]
      }
    });
  } catch (err) {
    console.log('Telegram request error:', err.message);
  }
}

// Poll for updates
let lastUpdateId = 0;

async function pollUpdates() {
  if (!botToken) return;
  try {
    const updates = await tgApi('getUpdates', { offset: lastUpdateId + 1, limit: 10 });
    for (const update of updates) {
      lastUpdateId = update.update_id;
      await handleUpdate(update);
    }
  } catch (err) {
    console.log('Telegram poll error:', err.message);
  }
}

async function handleUpdate(update) {
  // Message from user
  if (update.message) {
    const msg = update.message;
    const fromId = msg.chat.id;
    const text = msg.text || '';

    // Auto-save chat ID on first contact
    if (!chatId) await saveChatId(fromId);

    if (text.startsWith('/')) {
      await handleCommand(text.trim(), fromId);
    } else {
      // Regular message — treat as dashboard chat message
      await handleDashboardChat(msg);
    }
  }

  // Callback query (inline button press)
  if (update.callback_query) {
    const cb = update.callback_query;
    const data = cb.data || '';
    const fromId = cb.from.id;

    if (!chatId) await saveChatId(fromId);

    if (data.startsWith('approve:')) {
      const reqId = data.split(':')[1];
      await resolveRequestCallback(reqId, 'approved', cb.id);
    } else if (data.startsWith('deny:')) {
      const reqId = data.split(':')[1];
      await resolveRequestCallback(reqId, 'denied', cb.id);
    }
  }
}

async function handleCommand(text, fromId) {
  const [cmd, ...args] = text.split(' ');
  switch (cmd.toLowerCase()) {
    case '/start':
      await sendTelegramMessage(
        'Welcome to Clawsight Bot.\n\n' +
        'You can send me commands here and I will relay them to the dashboard.\n' +
        'I will also ping you when I need approval for something.\n\n' +
        'Commands:\n' +
        '/status — Dashboard status\n' +
        '/requests — Pending approvals\n' +
        '/messages — Recent dashboard chat'
      );
      break;
    case '/status':
      await sendTelegramMessage('Dashboard is online. Use the web UI for detailed metrics.');
      break;
    case '/requests':
      // Will be wired by server.js injection
      await sendTelegramMessage('Pending requests feature coming soon.');
      break;
    case '/messages':
      await sendTelegramMessage('Recent dashboard messages feature coming soon.');
      break;
    default:
      await sendTelegramMessage('Unknown command. Try /start for help.');
  }
}

async function handleDashboardChat(msg) {
  // Forward to dashboard as a user message via the API
  try {
    await fetch('http://localhost:3472/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'user', text: msg.text, type: 'chat' })
    });
  } catch (err) {
    console.log('Failed to forward Telegram message to dashboard:', err.message);
  }
}

// Callback resolution handler — set by server.js
let resolveRequestFn = null;

export function setResolveRequestHandler(fn) {
  resolveRequestFn = fn;
}

async function resolveRequestCallback(reqId, status, callbackQueryId) {
  try {
    // Answer callback to stop loading spinner
    await fetch(`${API_BASE}${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text: `${status.charAt(0).toUpperCase() + status.slice(1)}!` })
    });

    if (resolveRequestFn) {
      await resolveRequestFn(reqId, { status, note: 'Resolved via Telegram' });
    }
  } catch (err) {
    console.log('Callback resolution error:', err.message);
  }
}

// Start polling loop
export async function startTelegramBot() {
  if (!botToken) {
    console.log('Telegram bot not configured. Set TELEGRAM_BOT_TOKEN in .env');
    return;
  }
  await loadChatId();
  console.log('Telegram bot polling started');
  await pollUpdates();
  setInterval(pollUpdates, 5000);
}

export { chatId };
