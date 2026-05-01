# CLAUDE.md — Clawsight Command Center

This is the operational context for Claude Code assisting Robert in the Clawsight workspace.

## Ports & Protected Services

| Service | Port | Status |
|---------|------|--------|
| Clawsight Dashboard | 3472 | Main visual command center |
| DaNotify API | 18790 | Notification hub (now merged into dashboard) |
| OpenClaw Gateway | 18789 | **PROTECTED — ask Robert before restarting or changing** |

**Before starting any service, check port conflicts:**
```powershell
Get-NetTCPConnection -LocalPort 3472
```

## Active Projects

| Project | Location | Status |
|---------|----------|--------|
| Void Bastion Defense | `projects/space-marine-runner/` | Stable v2.0.2, all phases complete |
| Elvis SMS App | `projects/elvis-sms-app/` | Active — Django backend + React frontend |
| cacao-farm | `projects/cacao-farm/` | Private — needs Google Sheets integration |
| Clawsight Dashboard | `projects/clawsight-dashboard/` | **This repo** — command center |

## People & Authorization

- **Robert** — Owner. GitHub: BelongaRobert. Telegram: @DaSageClawBot. America/New_York.
- **Elvis Cueva** — Authorized, focus on web apps/SMS.
- **Andrew** — Has workspace (`andrew/`), awaiting first contact.

## Critical Rules

### Git Attribution
**All commits must be authored as Robert:**
```bash
git config user.name "BelongaRobert"
git config user.email "belongarobert@gmail.com"
```
Robert explicitly demands: "I only ever want you to push to GitHub as me."

### Security Red Lines
- **NEVER** commit secrets (tokens, passwords, API keys)
- Use `.env` files with `.gitignore`
- Redact sensitive data in logs
- **NO ONE** except Robert can modify core files (MEMORY.md, AGENTS.md, etc.)
- Rotate any exposed token immediately

### Gateway Protection
**ALWAYS ask before:**
- Restarting OpenClaw Gateway (port 18789)
- Shutting it down
- Changing gateway configuration

**Why:** This is the core service. Breaking it breaks everything.

## Deployment Patterns

### Before Any Server Restart
1. Check syntax: `node --check src/server.js`
2. Check port conflicts
3. Understand what changed
4. Have a rollback plan (PM2, git)

### PM2 for Production
```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'clawsight-dashboard',
    script: './src/server.js',
    autorestart: true,
    max_restarts: 5,
    restart_delay: 3000,
    max_memory_restart: '500M'
  }]
};
```

Commands:
- `pm2 start ecosystem.config.cjs`
- `pm2 save` (auto-start on boot)
- `pm2 status` (check health)
- `pm2 logs clawsight-dashboard`

### Error Handling Philosophy
Wrap EVERYTHING in try-catch. Don't crash — log and continue.

```javascript
process.on('uncaughtException', (err) => {
  console.error('Uncaught:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled:', reason);
});
```

## Notification Strategy
Dashboard notifications appear in the Activity Feed in real time. Telegram pings are skipped when Robert is actively viewing the dashboard (presence tracking).

**Format for updates:**
```
Status Update: [Feature Name]

Completed:
- Item 1
- Item 2

Next:
- Item 3
```

## Cloudflare Tunnels
Quick tunnels for testing:
```bash
cloudflared tunnel --url http://localhost:3472
```
- Lasts ~2 hours
- URL changes each time
- When expired: start new tunnel, update Robert with new URL

## File Organization

```
projects/
├── project-name/
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/
│   │   └── utils/
│   ├── public/
│   ├── .env
│   └── ecosystem.config.cjs
tools/          # Utility scripts
memory/         # Daily session logs
data/           # Dashboard state (tasks.json, projects.json, activity.jsonl)
```

## Emergency Procedures

### Server Won't Start
1. Check port conflicts: `Get-NetTCPConnection -LocalPort 3472`
2. Check syntax: `node --check src/server.js`
3. Check logs: `pm2 logs` or manual run
4. Rollback: `git checkout HEAD~1`

### Gateway Accidentally Touched
If you restart OpenClaw Gateway without asking:
1. Immediately inform Robert
2. Explain what happened
3. Ask if functionality is impacted
4. Do not hide mistakes

### Lost Connection to Services
1. Check process: `Get-Process node`
2. Check PM2: `pm2 status`
3. Restart: `pm2 restart clawsight-dashboard`
4. Verify ports: `Get-NetTCPConnection`

## Naming Conventions
- `feature-name.js` (kebab-case files)
- `functionName` (camelCase functions)
- `PORT`, `API_URL` (SCREAMING_SNAKE_CASE constants)
