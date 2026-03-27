#!/usr/bin/env node
/**
 * DaNotify Test Runner
 * Runs with full error logging
 */

import { DaNotify } from './src/index.js';

console.log('=== DaNotify Test Runner ===');
console.log('Starting at:', new Date().toISOString());
console.log('');

const app = new DaNotify();

// Catch all errors
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

// Start the service
app.start()
  .then(() => {
    console.log('✅ Start() completed successfully');
    // Keep process alive
    setInterval(() => {
      console.log('[' + new Date().toLocaleTimeString() + '] Heartbeat');
    }, 30000);
  })
  .catch((err) => {
    console.error('💥 Start failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });

// Prevent immediate exit
console.log('Setup complete, waiting for events...');
