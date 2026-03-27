import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

console.log('Testing DaNotify...');
console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? 'Set' : 'Missing');
console.log('TELEGRAM_CHAT_ID:', process.env.TELEGRAM_CHAT_ID);
console.log('GITHUB_TOKEN:', process.env.GITHUB_TOKEN ? 'Set' : 'Missing');

// Test System Monitor
const { SystemMonitor } = await import('./src/monitors/system.js');
const sys = new SystemMonitor({ notify: (t, m) => console.log(`[${t}] ${m}`) });
console.log('\nSystem Monitor test:');
await sys.check();

// Test GitHub Monitor
if (process.env.GITHUB_TOKEN) {
  const { GitHubMonitor } = await import('./src/monitors/github.js');
  const gh = new GitHubMonitor({ 
    notify: (t, m) => console.log(`[${t}] ${m}`),
    name: 'TestNotifier'
  });
  console.log('\nGitHub Monitor test:');
  await gh.start();
  await gh.check();
  await gh.stop();
}

console.log('\n✅ Tests complete');
