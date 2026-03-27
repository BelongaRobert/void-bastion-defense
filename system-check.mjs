import { SystemMonitor } from './src/monitors/system.js';
const s = new SystemMonitor({notify: (title, msg) => console.log(`[${title}] ${msg}`)});
await s.check();
console.log('✅ System check completed');