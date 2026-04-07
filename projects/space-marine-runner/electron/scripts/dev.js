/**
 * Development helper script
 * Launches Electron with dev tools enabled
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🎮 Starting Void Bastion Defense in development mode...\n');

// Set environment
process.env.NODE_ENV = 'development';
process.env.ELECTRON_ENABLE_LOGGING = '1';

// Launch Electron
const electron = spawn('npx', ['electron', '.', '--dev'], {
  stdio: 'inherit',
  shell: true
});

electron.on('close', (code) => {
  console.log(`\n👋 Development session ended (code: ${code})`);
});

electron.on('error', (err) => {
  console.error('Failed to start Electron:', err);
});
