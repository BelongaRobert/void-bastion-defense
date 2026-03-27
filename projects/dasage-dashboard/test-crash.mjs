// Test script: Simulates a crash after 5 seconds
// Used to verify PM2 auto-restart works

console.log('Test server starting...');
console.log('Will crash in 5 seconds to test PM2 restart');

setTimeout(() => {
  console.log('Simulating crash now!');
  throw new Error('Intentional crash for testing');
}, 5000);

// Keep process alive
setInterval(() => {
  console.log('Still running...');
}, 1000);
