import https from 'https';

const TOKEN = '8691917512:AAFYMpB530z71BGxJkufKWLWTJqTZiJGFlI';
const CHAT_ID = '8666283585';
const MESSAGE = '🐙 DaSage Alert System Test\n\nThis is a test message from your monitoring system.\n\nIf you see this, Telegram alerts are working! ✅';

const data = JSON.stringify({
  chat_id: CHAT_ID,
  text: MESSAGE,
  parse_mode: 'HTML'
});

const options = {
  hostname: 'api.telegram.org',
  port: 443,
  path: `/bot${TOKEN}/sendMessage`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let response = '';
  res.on('data', (chunk) => response += chunk);
  res.on('end', () => {
    const result = JSON.parse(response);
    if (result.ok) {
      console.log('✅ Test message sent successfully!');
      console.log('Message ID:', result.result.message_id);
    } else {
      console.log('❌ Error:', result.description);
      if (result.description.includes('chat not found')) {
        console.log('\n💡 You need to message @Notification_DaSage_Bot first!');
        console.log('   Send it any message, then run this test again.');
      }
    }
  });
});

req.on('error', (e) => {
  console.log('❌ Request failed:', e.message);
});

req.write(data);
req.end();
