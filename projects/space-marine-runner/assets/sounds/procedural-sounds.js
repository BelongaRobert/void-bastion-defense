// Procedural Sound Generator - Now using actual Kenney MP3 files!
// Much more realistic and satisfying sounds

const ProceduralSounds = {
    audioContext: null,
    
    // Cache for audio elements
    audioCache: {},
    
    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        // Preload commonly used sounds
        this.preloadSound('enemy_death', 'assets/sounds/impacts/enemy_death.ogg');
        this.preloadSound('enemy_hit', 'assets/sounds/impacts/enemy_hit.ogg');
        this.preloadSound('player_hit', 'assets/sounds/impacts/player_hit.ogg');
        this.preloadSound('metal_tear', 'assets/sounds/fortress/damage.ogg');
        this.preloadSound('wave_start', 'assets/sounds/ui/wave_start.ogg');
    },
    
    // Preload a sound into cache
    preloadSound(name, path) {
        const audio = new Audio(path);
        audio.preload = 'auto';
        
        // Add error handling to see what's wrong
        audio.addEventListener('error', (e) => {
            console.error(`[ProceduralSounds] Failed to load "${name}" from "${path}":`, e);
            console.error(`Audio error code: ${audio.error ? audio.error.code : 'unknown'}`);
            console.error(`Audio error message: ${audio.error ? audio.error.message : 'unknown'}`);
        });
        
        audio.addEventListener('canplaythrough', () => {
            console.log(`[ProceduralSounds] Successfully loaded: ${name} from ${path}`);
        });
        
        audio.addEventListener('loadedmetadata', () => {
            console.log(`[ProceduralSounds] Metadata loaded for: ${name}`);
        });
        
        this.audioCache[name] = audio;
    },
    
    // Play a cached sound with optional volume
    playSound(name, volume = 1.0) {
        const audio = this.audioCache[name];
        if (audio) {
            // Clone to allow overlapping playback
            const clone = audio.cloneNode();
            clone.volume = volume;
            clone.play().catch(e => {
                // Ignore audio context not allowed errors
                console.log('Audio play failed:', e);
            });
        }
    },
    
    // ORGANIC creature death - guttural growl with breath layer
    playAlienDeath() {
        if (!this.audioContext) this.init();
        const t = this.audioContext.currentTime;
        
        // Main growl - low frequency with modulation
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        // Sawtooth for roughness
        osc.type = 'sawtooth';
        
        // Low pitch that drops (death groan)
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.5);
        
        // Filter to make it guttural/throaty
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, t);
        filter.frequency.exponentialRampToValueAtTime(100, t + 0.5);
        filter.Q.value = 5;
        
        // Volume envelope (attack, sustain, decay)
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.6, t + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.start(t);
        osc.stop(t + 0.6);
        
        // Secondary layer - breath/gasp
        const osc2 = this.audioContext.createOscillator();
        const gain2 = this.audioContext.createGain();
        const filter2 = this.audioContext.createBiquadFilter();
        
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(200, t + 0.1);
        osc2.frequency.exponentialRampToValueAtTime(60, t + 0.4);
        
        filter2.type = 'lowpass';
        filter2.frequency.setValueAtTime(400, t + 0.1);
        filter2.frequency.exponentialRampToValueAtTime(150, t + 0.4);
        
        gain2.gain.setValueAtTime(0, t + 0.1);
        gain2.gain.linearRampToValueAtTime(0.3, t + 0.2);
        gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
        
        osc2.connect(filter2);
        filter2.connect(gain2);
        gain2.connect(this.audioContext.destination);
        
        osc2.start(t + 0.1);
        osc2.stop(t + 0.5);
    },
    
    // Real metal tearing sound from Kenney Impact Sounds
    playMetalTear() {
        this.playSound('metal_tear', 0.8);
    },
    
    // Real trumpet/fanfare for wave start - LOWERED VOLUME (was 0.3)
    playWaveStart() {
        this.playSound('wave_start', 0.15);
    },
    
    // Real enemy hit sound
    playEnemyHit() {
        this.playSound('enemy_hit', 0.6);
    },
    
    // ORGANIC creature hit - sharp pain with breath
    playCreatureHit() {
        if (!this.audioContext) this.init();
        const t = this.audioContext.currentTime;
        
        // Sharp pain sound
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.15);
        
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.start(t);
        osc.stop(t + 0.15);
        
        // Add breath hit
        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        
        // Create short noise buffer
        const bufferSize = this.audioContext.sampleRate * 0.1;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }
        
        noise.buffer = buffer;
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 800;
        noiseFilter.Q.value = 2;
        
        noiseGain.gain.setValueAtTime(0.2, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.audioContext.destination);
        
        noise.start(t);
    },
    
    // Real player hit sound
    playPlayerHit() {
        this.playSound('player_hit', 0.8);
    }
};

// Export for use in game
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProceduralSounds;
}

// Debug helper - can be called from console
window.testSound = function(soundName, path) {
    if (soundName && path) {
        // Test a specific sound
        const testAudio = new Audio(path);
        testAudio.addEventListener('error', (e) => {
            console.error(`[TEST] Failed to load ${path}:`, e);
            console.error(`[TEST] Error code:`, testAudio.error?.code, 'Message:', testAudio.error?.message);
        });
        testAudio.addEventListener('canplaythrough', () => {
            console.log(`[TEST] Loaded ${path} successfully!`);
        });
        testAudio.volume = 0.5;
        const playPromise = testAudio.play();
        if (playPromise) {
            playPromise.catch(err => console.error('[TEST] Play failed:', err));
        }
        return 'Testing sound... check console';
    } else {
        // Test all cached sounds
        console.log('[TEST] Testing all cached sounds...');
        Object.keys(ProceduralSounds.audioCache).forEach(name => {
            const audio = ProceduralSounds.audioCache[name];
            console.log(`[TEST] ${name}: readyState=${audio.readyState}, paused=${audio.paused}, src=${audio.src}`);
        });
        return 'Check console for sound status';
    }
};

// Quick test paths
window.testEnemyDeath = function() {
    return window.testSound('enemy_death', 'assets/sounds/impacts/enemy_death.ogg');
};
window.testWaveStart = function() {
    return window.testSound('wave_start', 'assets/sounds/ui/wave_start.ogg');
};
window.testFortressDamage = function() {
    return window.testSound('metal_tear', 'assets/sounds/fortress/damage.ogg');
};
