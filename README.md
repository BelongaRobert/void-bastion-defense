# DaNotify — Centralized Notification Hub

**Version:** 1.0.0  
**Purpose:** Aggregate all notifications → Telegram

---

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your tokens

# Start monitoring
npm start
```

---

## Monitors

| Monitor | Status | Description |
|---------|--------|-------------|
| System | ✅ Active | Disk space, memory usage |
| GitHub | 🔧 Config | Issues, PRs, mentions |
| Email | 🔧 Config | Gmail IMAP notifications |

---

## Configuration

**Required:**
- `TELEGRAM_BOT_TOKEN` - Bot token for notifications
- `TELEGRAM_CHAT_ID` - Your Telegram user ID

**Optional:**
- `GITHUB_TOKEN` - GitHub personal access token
- `GITHUB_USERNAME` - Your GitHub username
- `EMAIL_USER` / `EMAIL_PASS` - Gmail credentials

---

## Features

- ✅ System monitoring (disk, memory)
- 🔧 GitHub integration (issues, PRs)
- 🔧 Email alerts (important messages)
- 📅 Daily digest at 8 AM
- 🚨 Rate-limited urgent alerts
- 🔕 Duplicate prevention

---

## Notifications

All alerts sent to `@Notification_DaSage_Bot` (or your configured bot).

**Priority levels:**
- 🔴 Urgent: System failures, disk full
- 📊 Normal: New issues, daily digest

---

## Development Status

Phase 1: Core framework ✅  
Phase 2: Testing (pending credentials)
