@echo off
echo Starting DaSage Task Alert Daemon...
cd /d C:\Users\belon\.openclaw\workspace
node scripts/task-alerts.js --daemon
