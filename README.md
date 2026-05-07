# Clawsight Command Center

**Version:** 2.0.0
**Purpose:** Visual command center for Claude Code — see everything I'm working on.

## Quick Start

```bash
# Install dashboard dependencies
cd projects/clawsight-dashboard
npm install

# Start the dashboard
npm start
# Or from root:
npm run dashboard
```

Open http://localhost:3472

## What's Inside

- **Dashboard** (`projects/clawsight-dashboard/`) — Real-time system metrics, active tasks, project overview, activity feed, terminal logger, gateway health
- **Void Bastion Defense** (`projects/space-marine-runner/`) — HTML5 Canvas game, v2.0.2
- **Elvis SMS App** (`projects/elvis-sms-app/`) — Django + React SMS platform
- **cacao-farm** (`projects/cacao-farm/`) — Robert's private project
- **Tools** (`tools/`) — Alert system, auto-commit, security audit, backup utilities

## Dashboard Panels

| Panel | What It Shows |
|-------|---------------|
| Overview | Metric cards, recent activity, predictions |
| Tasks | Active tasks I'm working on, with status controls |
| Projects | All project cards with status, notes, links |
| System | Real-time CPU, memory, disk charts |
| Activity | Full event log (notifications, task changes, system events) |
| Monitor | Active connections, system health grid |
| Gateway | OpenClaw Gateway health (read-only — ask Robert before touching) |
| Terminal | Logged command history with filtering |

## Configuration

Copy `projects/clawsight-dashboard/.env.example` to `.env` and fill in:
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` — for external alerts
- `GITHUB_TOKEN` / `GITHUB_USERNAME` — for GitHub monitoring
- `EMAIL_USER` / `EMAIL_PASS` — for Gmail IMAP alerts

## PM2 (Production)

```bash
cd projects/clawsight-dashboard
pm2 start ecosystem.config.cjs
pm2 save
```

## Claude Code Context

See `CLAUDE.md` for operational rules, ports, and constraints.
