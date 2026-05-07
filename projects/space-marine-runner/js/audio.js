// Void Bastion Defense - Audio System
// Extracted from index.html for maintainability

console.log('AUDIO.JS LOADING...');

// Sound Manager with robust initialization and procedural fallback
class SoundManager {
    constructor() {
        this.sounds = {};
        this.masterVolume = 1.0;
        this.sfxVolume = 1.0;
        this.muted = false;
        this.context = null;
        this.initialized = false;
        this.loadedSounds = new Set();
        this.loadErrors = new Set();
    }

    init() {
        if (this.initialized) return;
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.initialized = true;
        console.log('Sound system initialized');
    }

    load(name, url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.src = url;
            audio.preload = 'auto';
            this.sounds[name] = audio;

            console.log(`[SoundManager] Loading sound: ${name} from ${url}`);

            // Set a timeout in case loading takes too long
            const timeout = setTimeout(() => {
                console.warn(`[SoundManager] Sound load timeout: ${name}`);
                this.loadErrors.add(name);
                resolve(name); // Resolve anyway so game can continue
            }, 5000);

            audio.addEventListener('canplaythrough', () => {
                clearTimeout(timeout);
                this.loadedSounds.add(name);
                console.log(`[SoundManager] Successfully loaded: ${name}`);
                resolve(name);
            });

            audio.addEventListener('error', (e) => {
                clearTimeout(timeout);
                const errorCode = audio.error ? audio.error.code : 'unknown';
                const errorMsg = audio.error ? audio.error.message : 'no error object';
                console.error(`[SoundManager] FAILED to load sound: ${name} from ${url}`);
                console.error(`[SoundManager] Error code: ${errorCode}, Message: ${errorMsg}`);
                this.loadErrors.add(name);
                resolve(name); // Resolve anyway so game can continue
            });

            audio.addEventListener('loadedmetadata', () => {
                console.log(`[SoundManager] Metadata loaded for: ${name}`);
            });

            // Start loading
            audio.load();
        });
    }

    play(name, volume = 1.0) {
        if (this.muted) return;

        // Check if sound is loaded and playable
        const sound = this.sounds[name];
        if (!sound) {
            console.log(`Sound not loaded: ${name}`);
            return;
        }

        // Clone the audio element for overlapping sounds
        const clone = sound.cloneNode();
        clone.volume = volume * this.masterVolume * this.sfxVolume;

        // Try to play, handle autoplay policy
        const playPromise = clone.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                // Autoplay was prevented - this is normal before user interaction
                if (e.name !== 'NotAllowedError') {
                    console.warn(`Sound play error (${name}):`, e.message);
                }
            });
        }
    }

    // Check if a sound is ready to play
    isReady(name) {
        return this.sounds[name] && this.loadedSounds.has(name);
    }

    setVolume(vol) {
        this.masterVolume = Math.max(0, Math.min(1, vol));
    }

    setSFXVolume(vol) {
        this.sfxVolume = Math.max(0, Math.min(1, vol));
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    isLoaded(name) {
        return this.loadedSounds.has(name);
    }
}

const sounds = new SoundManager();

// Weapon fire sounds - with fallback to procedural if not loaded
function playWeaponSound(weaponType) {
    if (sounds.muted) return;

    console.log('fireWeapon called:', weaponType, 'Sound ready:', sounds.isReady(weaponType));

    const volumeMap = {
        'rifle': 0.5,
        'shotgun': 0.7,
        'plasma': 0.6,
        'chaingun': 0.5,
        'flamethrower': 0.6,
        'railcannon': 1.0
    };

    if (sounds.isReady(weaponType)) {
        sounds.play(weaponType, volumeMap[weaponType] || 0.5);
    } else {
        // Procedural fallback for weapon sounds
        if (typeof ProceduralSounds !== 'undefined') {
            ProceduralSounds.init();
            // Simple procedural weapon sounds could be added here
        }
    }
}

// Impact sounds with organic procedural fallback
function enemyHit() {
    if (sounds.muted) return;
    // Use organic creature hit sound - always sounds good!
    if (typeof ProceduralSounds !== 'undefined') {
        ProceduralSounds.playCreatureHit();
    }
    // Also try to play the loaded sound if available
    if (sounds.isReady('enemy_hit')) {
        sounds.play('enemy_hit', 0.4);
    }
}

function enemyDeath() {
    if (sounds.muted) return;
    console.log('enemyDeath called. Loaded:', sounds.isReady('enemy_death'));

    // Use procedural alien death sound - always sounds good!
    if (typeof ProceduralSounds !== 'undefined') {
        ProceduralSounds.playAlienDeath();
    }
    // Also try to play the loaded sound if available
    if (sounds.isReady('enemy_death')) {
        sounds.play('enemy_death', 0.6);
    }
}

function playerHit() {
    if (sounds.muted) return;
    if (sounds.isReady('player_hit')) {
        sounds.play('player_hit', 0.7);
    } else if (typeof ProceduralSounds !== 'undefined') {
        ProceduralSounds.playPlayerHit();
    }
}

function playExplosion() {
    if (sounds.muted) return;
    if (sounds.isReady('explosion')) {
        sounds.play('explosion', 0.8);
    }
}

// UI sounds
function playClick() {
    if (sounds.muted) return;
    if (sounds.isReady('click')) {
        sounds.play('click', 0.3);
    }
}

function playPurchase() {
    if (sounds.muted) return;
    if (sounds.isReady('purchase')) {
        sounds.play('purchase', 0.5);
    }
}

function playUpgrade() {
    if (sounds.muted) return;
    if (sounds.isReady('upgrade')) {
        sounds.play('upgrade', 0.6);
    }
}

function playWaveStart() {
    // Wave start sound removed per user request
    return;

    /* DISABLED - Trumpet sound removed
    if (sounds.muted) return;
    console.log('playWaveStart called. Loaded:', sounds.isReady('wave_start'));

    // Always play procedural trumpet - it's better than the tone!
    if (typeof ProceduralSounds !== 'undefined') {
        ProceduralSounds.playWaveStart();
    }
    // Also play loaded sound if available
    if (sounds.isReady('wave_start')) {
        sounds.play('wave_start', 0.8);
    }
    */
}

function playWaveComplete() {
    if (sounds.muted) return;
    if (sounds.isReady('wave_complete')) {
        sounds.play('wave_complete', 0.7);
    }
}

// Fortress sounds with procedural fallback
function playFortressDamage() {
    if (sounds.muted) return;
    console.log('playFortressDamage called. Loaded:', sounds.isReady('fortress_damage'));

    // Use procedural metal tear sound
    if (typeof ProceduralSounds !== 'undefined') {
        ProceduralSounds.playMetalTear();
    }
    // Also play loaded sound if available
    if (sounds.isReady('fortress_damage')) {
        sounds.play('fortress_damage', 0.7);
    }
}

function playTurretFire() {
    if (sounds.muted) return;
    if (sounds.isReady('turret_fire')) {
        sounds.play('turret_fire', 0.5);
    }
}

// Settings integration
function initSoundSettings() {
    const savedVol = localStorage.getItem('soundVolume');
    const savedSFXVol = localStorage.getItem('sfxVolume');
    const savedMute = localStorage.getItem('soundMuted');

    if (savedVol !== null) {
        sounds.setVolume(parseFloat(savedVol));
        const masterSlider = document.getElementById('masterVolume');
        if (masterSlider) masterSlider.value = parseFloat(savedVol) * 100;
    }
    if (savedSFXVol !== null) {
        sounds.setSFXVolume(parseFloat(savedSFXVol));
        const sfxSlider = document.getElementById('sfxVolume');
        if (sfxSlider) sfxSlider.value = parseFloat(savedSFXVol) * 100;
    }
    if (savedMute !== null) {
        sounds.muted = savedMute === 'true';
    }
}

function saveSoundSettings() {
    localStorage.setItem('soundVolume', sounds.masterVolume);
    localStorage.setItem('sfxVolume', sounds.sfxVolume);
    localStorage.setItem('soundMuted', sounds.muted);
}

// Initialize sounds when user first interacts
let audioInitialized = false;
let audioInitPromise = null;

function initAudio() {
    if (audioInitialized) return Promise.resolve();
    if (audioInitPromise) return audioInitPromise;

    audioInitPromise = new Promise((resolve) => {
        console.log('Initializing audio system...');
        audioInitialized = true;

        // Initialize both sound systems
        sounds.init();
        if (typeof ProceduralSounds !== 'undefined') {
            ProceduralSounds.init();
        }

        // Load all sounds
        const soundFiles = [
            ['rifle', 'assets/sounds/weapons/rifle.ogg'],
            ['shotgun', 'assets/sounds/weapons/shotgun.ogg'],
            ['plasma', 'assets/sounds/weapons/plasma.ogg'],
            ['chaingun', 'assets/sounds/weapons/chaingun.ogg'],
            ['flamethrower', 'assets/sounds/weapons/flamethrower.ogg'],
            ['railcannon', 'assets/sounds/weapons/railcannon.ogg'],
            ['enemy_hit', 'assets/sounds/impacts/enemy_hit.ogg'],
            ['enemy_death', 'assets/sounds/impacts/enemy_death.ogg'],
            ['player_hit', 'assets/sounds/impacts/player_hit.ogg'],
            ['explosion', 'assets/sounds/impacts/explosion.ogg'],
            ['click', 'assets/sounds/ui/click.ogg'],
            ['purchase', 'assets/sounds/ui/purchase.ogg'],
            ['upgrade', 'assets/sounds/ui/upgrade.ogg'],
            ['wave_start', 'assets/sounds/ui/wave_start.ogg'],
            ['wave_complete', 'assets/sounds/ui/wave_complete.ogg'],
            ['fortress_damage', 'assets/sounds/fortress/damage.ogg'],
            ['turret_fire', 'assets/sounds/fortress/turret_fire.ogg']
        ];

        // Load sounds with progress tracking
        let loadedCount = 0;
        const totalSounds = soundFiles.length;

        Promise.all(soundFiles.map(([name, url]) => {
            return sounds.load(name, url).then(() => {
                loadedCount++;
                console.log(`Loaded sound ${loadedCount}/${totalSounds}: ${name}`);
            });
        }))
            .then(() => {
                console.log('All sound loading attempts complete');
                console.log('Loaded:', sounds.loadedSounds.size, 'Errors:', sounds.loadErrors.size);
            })
            .catch(err => {
                console.error('Unexpected error during sound loading:', err);
            })
            .finally(() => {
                initSoundSettings();
                resolve();
            });
    });

    return audioInitPromise;
}

// Multiple triggers for audio init - aggressive approach
function tryInitAudio() {
    if (!audioInitialized) {
        initAudio().then(() => {
            console.log('Audio system ready!');
        });
    }
}

document.addEventListener('click', tryInitAudio);
document.addEventListener('touchstart', tryInitAudio);
document.addEventListener('keydown', tryInitAudio);
document.addEventListener('mousemove', tryInitAudio, { once: true });

// Also try to initialize when game starts
window.addEventListener('load', () => {
    setTimeout(tryInitAudio, 100);
});

console.log('AUDIO.JS LOADED');
