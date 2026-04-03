// Telegram Voice Response Handler
// Called by DaSage when voice response is triggered

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Config
const CONFIG = {
    elevenLabsKey: process.env.ELEVENLABS_API_KEY || 'sk_076c3835d63a3060febfc0b6e0e68bbf2b5e692655568504',
    telegramToken: '8789992079:AAFsCvDBTz53VAizLypOKwp6wLmSwIgL4Nw',
    defaultVoice: 'pNInz6obpgDQGcFmaJgB', // Adam (free tier)
    model: 'eleven_turbo_v2_5',
    ffmpegPath: 'C:\\tools\\ffmpeg\\bin\\ffmpeg.exe'
};

// Voice ID mapping
const VOICES = {
    'Adam': 'pNInz6obpgDQGcFmaJgB',
    'Bella': 'EXAVITQu4vr4xnSDxMaL',
    'Antoni': 'ErXwobaYiN019PkySvjV',
    'Elli': 'MF3mGyEYCl7XYWbV9V6O'
};

/**
 * Generate voice and send to Telegram
 */
async function sendVoiceResponse(text, chatId, options = {}) {
    const tempDir = os.tmpdir();
    const id = Date.now().toString(36);
    const mp3File = path.join(tempDir, `dasage-${id}.mp3`);
    const oggFile = path.join(tempDir, `dasage-${id}.ogg`);
    
    try {
        // Get voice ID
        const voiceId = VOICES[options.voice] || CONFIG.defaultVoice;
        
        console.log(`Generating voice for: "${text.substring(0, 50)}..."`);
        
        // Call ElevenLabs API
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'xi-api-key': CONFIG.elevenLabsKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                model_id: CONFIG.model,
                voice_settings: {
                    stability: options.stability || 0.5,
                    similarity_boost: options.clarity || 0.75
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`ElevenLabs API error: ${response.status}`);
        }
        
        // Save MP3
        const audioBuffer = await response.arrayBuffer();
        fs.writeFileSync(mp3File, Buffer.from(audioBuffer));
        
        // Convert to OGG (Telegram voice format)
        execSync(`"${CONFIG.ffmpegPath}" -y -i "${mp3File}" -c:a libopus -b:a 24k -vn "${oggFile}"`, {
            stdio: 'ignore'
        });
        
        // Send to Telegram
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('voice', new Blob([fs.readFileSync(oggFile)], { type: 'audio/ogg' }), 'voice.ogg');
        if (options.caption) {
            formData.append('caption', options.caption);
        }
        
        const tgResponse = await fetch(`https://api.telegram.org/bot${CONFIG.telegramToken}/sendVoice`, {
            method: 'POST',
            body: formData
        });
        
        const result = await tgResponse.json();
        
        if (!result.ok) {
            throw new Error(`Telegram API error: ${result.description}`);
        }
        
        console.log('Voice message sent successfully!');
        return { success: true, messageId: result.result.message_id };
        
    } catch (error) {
        console.error('Voice send failed:', error.message);
        return { success: false, error: error.message };
    } finally {
        // Cleanup
        try {
            if (fs.existsSync(mp3File)) fs.unlinkSync(mp3File);
            if (fs.existsSync(oggFile)) fs.unlinkSync(oggFile);
        } catch (e) {}
    }
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    const chatId = args[0] || '8666283585';
    const text = args.slice(1).join(' ') || 'The Emperor protects!';
    
    sendVoiceResponse(text, chatId)
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = { sendVoiceResponse, VOICES };
