import { SystemMonitor } from './src/monitors/system.js';

const mockNotifier = {
  notify: (title, message, priority) => {
    console.log(`[${priority?.toUpperCase() || 'INFO'}] ${title}: ${message}`);
  }
};

const monitor = new SystemMonitor(mockNotifier);
await monitor.check();
console.log('✓ System check complete');
