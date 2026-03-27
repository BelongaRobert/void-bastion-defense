// Voice Control Module
// Speech recognition for hands-free dashboard navigation

// Voice commands mapping
const VOICE_COMMANDS = {
  // Navigation commands
  'show overview': 'overview',
  'go to overview': 'overview',
  'open overview': 'overview',
  'show system': 'system',
  'go to system': 'system',
  'open system': 'system',
  'system status': 'system',
  'show activity': 'activity',
  'go to activity': 'activity',
  'open activity': 'activity',
  'show projects': 'projects',
  'go to projects': 'projects',
  'open projects': 'projects',
  'show monitor': 'monitor',
  'go to monitor': 'monitor',
  'open monitor': 'monitor',
  'show gateway': 'gateway',
  'go to gateway': 'gateway',
  'open gateway': 'gateway',
  'show terminal': 'terminal',
  'go to terminal': 'terminal',
  'open terminal': 'terminal',
  'terminal commands': 'terminal',
  
  // Action commands
  'refresh': 'refresh',
  'refresh page': 'refresh',
  'reload': 'refresh',
  'go back': 'back',
  'back': 'back',
  'clear terminal': 'clear-terminal',
  'clear logs': 'clear-terminal',
  
  // Query commands
  'what is my cpu': 'query-cpu',
  'cpu usage': 'query-cpu',
  'how is my memory': 'query-memory',
  'memory usage': 'query-memory',
  'disk space': 'query-disk',
  'show notifications': 'query-notifications',
  'any alerts': 'query-notifications',
  
  // Help
  'help': 'help',
  'what can I say': 'help',
  'voice commands': 'help'
};

// Fuzzy matching for voice commands
function findCommand(transcript) {
  const normalized = transcript.toLowerCase().trim();
  
  // Exact match
  if (VOICE_COMMANDS[normalized]) {
    return VOICE_COMMANDS[normalized];
  }
  
  // Partial match
  for (const [phrase, action] of Object.entries(VOICE_COMMANDS)) {
    if (normalized.includes(phrase)) {
      return action;
    }
  }
  
  return null;
}

// Speak response using speech synthesis
export function speak(text, priority = 'normal') {
  if (!('speechSynthesis' in window)) {
    console.log('Speech synthesis not supported');
    return;
  }
  
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  
  // Try to find a good voice
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) ||
                         voices.find(v => v.lang === 'en-US') ||
                         voices[0];
  
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }
  
  window.speechSynthesis.speak(utterance);
}

// Execute voice command
export function executeVoiceCommand(command, socket) {
  console.log('Executing voice command:', command);
  
  switch (command) {
    case 'overview':
    case 'system':
    case 'activity':
    case 'projects':
    case 'monitor':
    case 'gateway':
    case 'terminal':
      const tabBtn = document.querySelector(`.tab-btn[data-tab="${command}"]`);
      if (tabBtn) {
        tabBtn.click();
        speak(`Switched to ${command} tab`);
      }
      break;
      
    case 'refresh':
      location.reload();
      speak('Refreshing page');
      break;
      
    case 'back':
      history.back();
      speak('Going back');
      break;
      
    case 'clear-terminal':
      const clearBtn = document.getElementById('terminal-clear');
      if (clearBtn) {
        clearBtn.click();
        speak('Terminal cleared');
      }
      break;
      
    case 'query-cpu':
      const cpuMetric = document.getElementById('cpu-metric');
      if (cpuMetric) {
        speak(`CPU usage is ${cpuMetric.textContent}`);
      }
      break;
      
    case 'query-memory':
      const memMetric = document.getElementById('mem-metric') || document.getElementById('memory-metric');
      if (memMetric) {
        speak(`Memory usage is ${memMetric.textContent}`);
      }
      break;
      
    case 'query-disk':
      const diskCMetric = document.getElementById('disk-c-metric');
      const diskDMetric = document.getElementById('disk-d-metric');
      if (diskCMetric && diskDMetric) {
        speak(`Disk C is ${diskCMetric.textContent} full. Disk D is ${diskDMetric.textContent} full.`);
      }
      break;
      
    case 'query-notifications':
      const notifications = document.querySelectorAll('.notification-item');
      if (notifications.length > 0) {
        speak(`You have ${notifications.length} active notifications`);
      } else {
        speak('No active notifications');
      }
      break;
      
    case 'help':
      speak('You can say: show overview, show system, show terminal, refresh, or ask about CPU, memory, or disk space.');
      break;
      
    default:
      speak('Command not recognized. Try saying help for available commands.');
  }
}

// Initialize voice control
export function initVoiceControl(socket) {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.log('Speech recognition not supported');
    return { supported: false };
  }
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 3;
  
  let isListening = false;
  let finalTranscript = '';
  
  recognition.onstart = () => {
    isListening = true;
    finalTranscript = '';
    updateVoiceUI('listening');
    console.log('🎤 Voice recognition started');
  };
  
  recognition.onresult = (event) => {
    let interimTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    
    updateVoiceUI('processing', interimTranscript || finalTranscript);
  };
  
  recognition.onend = () => {
    isListening = false;
    updateVoiceUI('idle');
    
    if (finalTranscript) {
      const command = findCommand(finalTranscript);
      if (command) {
        updateVoiceUI('success', finalTranscript);
        executeVoiceCommand(command, socket);
      } else {
        updateVoiceUI('error', finalTranscript);
        speak('Sorry, I did not understand that command.');
      }
    }
  };
  
  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    isListening = false;
    updateVoiceUI('error');
    
    if (event.error === 'not-allowed') {
      speak('Microphone access denied. Please allow microphone access to use voice control.');
    }
  };
  
  return {
    supported: true,
    start: () => {
      if (!isListening) {
        try {
          recognition.start();
        } catch (e) {
          console.error('Failed to start recognition:', e);
        }
      }
    },
    stop: () => {
      if (isListening) {
        recognition.stop();
      }
    },
    isListening: () => isListening
  };
}

// Update voice UI state
function updateVoiceUI(state, text = '') {
  const micBtn = document.getElementById('voice-mic-btn');
  const statusEl = document.getElementById('voice-status');
  const transcriptEl = document.getElementById('voice-transcript');
  
  if (micBtn) {
    micBtn.className = `voice-mic-btn ${state}`;
  }
  
  if (statusEl) {
    const stateMessages = {
      idle: 'Tap microphone to speak',
      listening: '🎤 Listening...',
      processing: '🤔 Processing...',
      success: '✅ Command executed',
      error: '❌ Command not recognized'
    };
    statusEl.textContent = stateMessages[state] || state;
    statusEl.className = `voice-status ${state}`;
  }
  
  if (transcriptEl && text) {
    transcriptEl.textContent = text;
    transcriptEl.style.opacity = '1';
    setTimeout(() => {
      transcriptEl.style.opacity = '0';
    }, 3000);
  }
}

// Setup voice control button
export function setupVoiceButton(socket) {
  const micBtn = document.getElementById('voice-mic-btn');
  if (!micBtn) return;
  
  const voiceControl = initVoiceControl(socket);
  
  if (!voiceControl.supported) {
    micBtn.style.display = 'none';
    console.log('Voice control not supported on this device');
    return;
  }
  
  micBtn.addEventListener('click', () => {
    if (voiceControl.isListening()) {
      voiceControl.stop();
    } else {
      voiceControl.start();
    }
  });
  
  // Keyboard shortcut (hold Space)
  let spacePressed = false;
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !spacePressed && !e.target.matches('input, textarea')) {
      e.preventDefault();
      spacePressed = true;
      voiceControl.start();
    }
  });
  
  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && spacePressed) {
      spacePressed = false;
      voiceControl.stop();
    }
  });
}

export { findCommand };
