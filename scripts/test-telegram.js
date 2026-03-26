import { execSync } from 'child_process';

const token = '8691917512:AAFYMpB530z71BGxJkufKWLWTJqTZiJGFlI';
const chatId = '8666283585';
const message = '🐙 DaSage Alert System is now connected!';

// Escape the message for shell
const escapedMessage = message.replace(/'/g, "'\\''");
const cmd = `curl -s -X POST "https://api.telegram.org/bot${token}/sendMessage" -d "chat_id=${chatId}" -d "text=${escapedMessage}"`;

try {
  const result = execSync(cmd, { encoding: 'utf-8', timeout: 10000 });
  const response = JSON.parse(result);
  if (response.ok) {
    console.log('✅ Test message sent successfully!');
  } else {
    console.log('❌ Error:', response.description);
  }
} catch (e) {
  console.log('❌ Failed:', e.message);
}
