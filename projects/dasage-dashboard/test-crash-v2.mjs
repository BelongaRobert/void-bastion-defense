// Test script: Simulates a crash after 3 seconds
// Used to verify PM2 auto-restart after computer reboot

const PORT = process.env.PORT || 3473;

import { createServer } from 'http';

const server = createServer((req, res) => {
  res.writeHead(200);
  res.end('Test server running');
});

server.listen(PORT, () => {
  console.log(`Test server on port ${PORT}, will crash in 3 seconds...`);
});

setTimeout(() => {
  console.log('💥 CRASH!');
  throw new Error('Intentional test crash');
}, 3000);
