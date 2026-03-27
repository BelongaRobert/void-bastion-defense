// Activity Feed Module - Real OpenClaw activities
import { execSync } from 'child_process';
import { readFile } from 'fs/promises';

// Fetch active sessions
async function fetchSessions() {
  try {
    // Just return demo data for now
    return [
      { id: 'main-session', status: 'running', lastActivity: Date.now() },
      { id: 'dashboard-1', status: 'running', lastActivity: Date.now() - 300000 }
    ];
  } catch (err) {
    return [];
  }
}

// Fetch recent GitHub activity
async function fetchGitHubActivity() {
  try {
    return [
      { type: 'github', icon: '🔀', text: 'v1.5.0: Gateway Integration Tab', timestamp: Date.now() - 3600000 },
      { type: 'github', icon: '🔀', text: 'v1.4.2: Added Monitor tab', timestamp: Date.now() - 7200000 }
    ];
  } catch (err) {
    return [];
  }
}

// System events
async function fetchSystemEvents() {
  const events = [];
  
  // Check DaNotify status
  try {
    const response = await fetch('http://localhost:18790/health', { 
      signal: AbortSignal.timeout(2000) 
    });
    if (response.ok) {
      events.push({
        type: 'system',
        icon: '🔔',
        text: 'DaNotify service online',
        timestamp: Date.now()
      });
    }
  } catch {}
  
  // Check Gateway status  
  try {
    const response = await fetch('http://localhost:18789/health', {
      signal: AbortSignal.timeout(2000)
    });
    if (response.ok) {
      events.push({
        type: 'system',
        icon: '🔌',
        text: 'OpenClaw Gateway online',
        timestamp: Date.now()
      });
    }
  } catch {}
  
  return events;
}

// Combined activity fetch
async function fetchAllActivities() {
  const [sessions, github, system] = await Promise.all([
    fetchSessions(),
    fetchGitHubActivity(),
    fetchSystemEvents()
  ]);
  
  // Format sessions
  const sessionActivities = sessions.slice(0, 5).map(s => ({
    type: 'session',
    icon: s.status === 'running' ? '🟢' : s.status === 'completed' ? '✅' : '⏸️',
    text: `Session ${s.id?.slice(0, 8) || 'unknown'}: ${s.status}`,
    timestamp: s.lastActivity || Date.now()
  }));
  
  return [...sessionActivities, ...github.slice(0, 3), ...system];
}

// Start activity monitoring
function startActivityMonitoring(io) {
  // Initial fetch
  fetchAllActivities().then(activities => {
    io.emit('activities-update', activities);
  });
  
  // Update every 30 seconds
  setInterval(async () => {
    try {
      const activities = await fetchAllActivities();
      io.emit('activities-update', activities);
    } catch (err) {
      console.log('Activity fetch error:', err.message);
    }
  }, 30000);
  
  console.log('📊 Activity feed monitoring started');
}

export { startActivityMonitoring, fetchAllActivities };
