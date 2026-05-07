// Void Bastion Defense - Complete Game Code with Animated Sprites
// The Emperor protects! ⚔️🐙

console.log('GAME.JS LOADING...');

// ============================================
// MOBILE DETECTION & PERFORMANCE
// ============================================

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

const IS_MOBILE = isMobile();

// ============================================
// CONFIGURATION & CONSTANTS
// ============================================

const CONFIG = {
    // Performance
    TARGET_FPS: 60,
    PARTICLE_LIMIT: IS_MOBILE ? 50 : 200,
    ENEMY_LIMIT: IS_MOBILE ? 30 : 100,
    BULLET_LIMIT: 100,
    POOL_SIZE: {
        particles: IS_MOBILE ? 100 : 300,
        enemies: IS_MOBILE ? 50 : 100,
        bullets: IS_MOBILE ? 75 : 150
    },
    // Animation
    ENEMY_FPS: 12,
    EFFECT_FPS: 24,
    ANIMATION_POOL_SIZE: IS_MOBILE ? 40 : 100,
    // Gameplay
    BASE_HEALTH: 1000,
    STARTING_CREDITS: 0,
    MAX_COMBO: 50,
    COMBO_TIMEOUT: 180,
    // Accessibility
    COLORBLIND_COLORS: {
        ork: '#4a7c4e',
        cultist: '#FF6B35',
        chaos: '#9D00FF'
    },
    AIM_ASSIST_RADIUS: 80,
    // Mobile
    TOUCH_DELAY: 50,
    DOUBLE_TAP_DELAY: 300,
    JOYSTICK_MAX_DIST: 35
};

// Weapon definitions
const WEAPONS = [
    { id: 0, name: 'Lasgun', icon: '🔫', damage: 20, fireRate: 200, reloadTime: 1500, magazine: 30, color: '#FF4444', trail: '#FF6B35', cost: 0, description: 'Standard issue laser rifle. Reliable and accurate.' },
    { id: 1, name: 'Bolt Pistol', icon: '🔫', damage: 35, fireRate: 350, reloadTime: 1800, magazine: 15, color: '#FFA500', trail: '#FFD700', cost: 500, description: 'Heavy recoil but devastating damage. Slow fire rate.' },
    { id: 2, name: 'Chaingun', icon: '🔫', damage: 8, fireRate: 50, reloadTime: 2500, magazine: 100, color: '#FF8C00', trail: '#FFA500', cost: 1000, description: 'Rapid-fire suppression weapon. Watch the heat!' },
    { id: 3, name: 'Plasma Gun', icon: '🔫', damage: 60, fireRate: 600, reloadTime: 2000, magazine: 20, color: '#00D4FF', trail: '#87CEEB', cost: 2000, description: 'Energy weapon with splash damage. Pierces armor.' },
    { id: 4, name: 'Heavy Bolter', icon: '🔫', damage: 100, fireRate: 1200, reloadTime: 3000, magazine: 10, color: '#9D00FF', trail: '#DDA0DD', cost: 5000, description: 'Massive damage, slow reload. Devastating power.' }
];

// ============================================
// ANIMATED SPRITE SYSTEM
// ============================================

// Sprite Atlas - Procedural sprite generation
const SpriteAtlas = {
    // Enemy sprite definitions
    enemies: {
        grunt: {
            frames: 6,
            width: 32,
            height: 32,
            animations: ['idle', 'walk', 'attack', 'death']
        },
        runner: {
            frames: 8,
            width: 28,
            height: 24,
            animations: ['idle', 'walk', 'attack', 'death']
        },
        heavy: {
            frames: 6,
            width: 40,
            height: 40,
            animations: ['idle', 'walk', 'attack', 'death']
        },
        cultist: {
            frames: 6,
            width: 28,
            height: 32,
            animations: ['idle', 'walk', 'attack', 'death']
        },
        chaos: {
            frames: 8,
            width: 36,
            height: 36,
            animations: ['idle', 'walk', 'attack', 'death']
        }
    },

    // Weapon effect sprites
    weapons: {
        muzzleFlash: { frames: 4, width: 24, height: 24 },
        railCharge: { frames: 8, width: 40, height: 40 },
        overheatSteam: { frames: 6, width: 20, height: 30 }
    },

    // Effect sprites
    effects: {
        explosion: { frames: 8, width: 48, height: 48 },
        blood: { frames: 5, width: 20, height: 20 },
        smoke: { frames: 10, width: 24, height: 24 }
    }
};

// Animation class for frame-based sprites
class Animation {
    constructor(frames, fps, loop = true) {
        this.frames = frames; // Array of frame data/functions
        this.fps = fps;
        this.loop = loop;
        this.currentFrame = 0;
        this.frameTime = 1000 / fps;
        this.accumulator = 0;
        this.finished = false;
    }

    update(dt) {
        if (this.finished) return false;
        
        this.accumulator += dt;
        
        while (this.accumulator >= this.frameTime) {
            this.accumulator -= this.frameTime;
            this.currentFrame++;
            
            if (this.currentFrame >= this.frames.length) {
                if (this.loop) {
                    this.currentFrame = 0;
                } else {
                    this.currentFrame = this.frames.length - 1;
                    this.finished = true;
                    return false;
                }
            }
        }
        return true;
    }

    reset() {
        this.currentFrame = 0;
        this.accumulator = 0;
        this.finished = false;
    }

    get current() {
        return this.frames[this.currentFrame];
    }
}

// Animation Instance Pool
class AnimationInstance {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.angle = 0;
        this.scale = 1;
        this.alpha = 1;
        this.animation = null;
        this.type = null;
        this.active = false;
        this.flipX = false;
        this.flipY = false;
        this.onComplete = null;
    }

    init(x, y, animation, type, options = {}) {
        this.x = x;
        this.y = y;
        this.animation = animation;
        this.type = type;
        this.active = true;
        this.angle = options.angle || 0;
        this.scale = options.scale || 1;
        this.alpha = options.alpha || 1;
        this.flipX = options.flipX || false;
        this.flipY = options.flipY || false;
        this.onComplete = options.onComplete || null;
        animation.reset();
    }

    update(dt) {
        if (!this.active || !this.animation) return false;
        
        const running = this.animation.update(dt);
        
        if (!running && !this.animation.loop) {
            this.active = false;
            if (this.onComplete) this.onComplete();
            return false;
        }
        return this.active;
    }

    draw(ctx) {
        if (!this.active || !this.animation) return;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.scale(this.flipX ? -this.scale : this.scale, this.flipY ? -this.scale : this.scale);
        
        // Draw current frame
        const frame = this.animation.current;
        if (typeof frame === 'function') {
            frame(ctx);
        } else if (frame) {
            ctx.drawImage(frame, -frame.width / 2, -frame.height / 2);
        }
        
        ctx.restore();
    }
}

// Procedural Sprite Generator
const SpriteGenerator = {
    // Generate enemy idle animation frames
    generateEnemyIdle(type, color) {
        const frames = [];
        const frameCount = type === 'runner' ? 4 : 3;
        
        for (let i = 0; i < frameCount; i++) {
            const bobOffset = Math.sin(i / frameCount * Math.PI * 2) * 2;
            frames.push((ctx) => this.drawEnemy(ctx, type, color, 0, bobOffset, false));
        }
        return frames;
    },

    // Generate enemy walk animation frames
    generateEnemyWalk(type, color) {
        const frames = [];
        const frameCount = type === 'runner' ? 8 : type === 'heavy' ? 4 : 6;
        
        for (let i = 0; i < frameCount; i++) {
            const legPhase = (i / frameCount) * Math.PI * 2;
            frames.push((ctx) => this.drawEnemy(ctx, type, color, legPhase, 0, false));
        }
        return frames;
    },

    // Generate enemy attack frames
    generateEnemyAttack(type, color) {
        const frames = [];
        // Attack windup and strike
        frames.push((ctx) => this.drawEnemy(ctx, type, color, 0, -2, false));
        if (!IS_MOBILE) {
            frames.push((ctx) => this.drawEnemy(ctx, type, color, 0.3, -4, false));
        }
        frames.push((ctx) => this.drawEnemyLunge(ctx, type, color));
        if (!IS_MOBILE) {
            frames.push((ctx) => this.drawEnemy(ctx, type, color, 0, 0, true)); // Recoil
        }
        return frames;
    },

    // Generate death animation frames
    generateDeathAnimation(type, color) {
        const frames = [];
        // Death sequence: flash, expand, fade
        frames.push((ctx) => this.drawEnemyDeath(ctx, type, color, 1.0, 1.0));
        frames.push((ctx) => this.drawEnemyDeath(ctx, type, color, 1.2, 0.9));
        frames.push((ctx) => this.drawEnemyDeath(ctx, type, color, 1.4, 0.7));
        frames.push((ctx) => this.drawEnemyDeath(ctx, type, color, 1.5, 0.5));
        frames.push((ctx) => this.drawEnemyDeath(ctx, type, color, 1.6, 0.3));
        frames.push((ctx) => this.drawEnemyDeath(ctx, type, color, 1.7, 0.1));
        return frames;
    },

    // Generate muzzle flash animation
    generateMuzzleFlash(weaponColor) {
        const frames = [];
        // Flash sequence - simplified on mobile
        if (IS_MOBILE) {
            frames.push((ctx) => this.drawMuzzleFlash(ctx, weaponColor, 1.0));
        } else {
            frames.push((ctx) => this.drawMuzzleFlash(ctx, weaponColor, 0.3));
            frames.push((ctx) => this.drawMuzzleFlash(ctx, weaponColor, 0.8));
            frames.push((ctx) => this.drawMuzzleFlash(ctx, weaponColor, 1.0));
            frames.push((ctx) => this.drawMuzzleFlash(ctx, weaponColor, 0.4));
        }
        return frames;
    },

    // Generate explosion animation
    generateExplosion(color1, color2) {
        const frames = [];
        const frameCount = IS_MOBILE ? 4 : 8; // Reduced frames on mobile
        for (let i = 0; i < frameCount; i++) {
            const progress = i / (frameCount - 1);
            const scale = 0.5 + progress * 1.5;
            const alpha = 1 - progress * 0.8;
            frames.push((ctx) => this.drawExplosion(ctx, color1, color2, scale, alpha, i));
        }
        return frames;
    },

    // Generate blood splatter animation
    generateBloodSplatter() {
        const frames = [];
        const frameCount = IS_MOBILE ? 3 : 5; // Reduced frames on mobile
        for (let i = 0; i < frameCount; i++) {
            const scale = 0.3 + (i / (frameCount - 1)) * 0.7;
            const alpha = 1 - (i / (frameCount - 1)) * 0.3;
            frames.push((ctx) => this.drawBlood(ctx, scale, alpha, i));
        }
        return frames;
    },

    // Generate smoke animation
    generateSmoke() {
        const frames = [];
        for (let i = 0; i < 10; i++) {
            const progress = i / 9;
            const scale = 0.5 + progress * 1.2;
            const alpha = 0.8 - progress * 0.7;
            const riseOffset = -progress * 30;
            frames.push((ctx) => this.drawSmoke(ctx, scale, alpha, riseOffset));
        }
        return frames;
    },

    // Generate rail charge animation
    generateRailCharge() {
        const frames = [];
        for (let i = 0; i < 8; i++) {
            const intensity = (i + 1) / 8;
            frames.push((ctx) => this.drawRailCharge(ctx, intensity));
        }
        return frames;
    },

    // Generate overheat steam animation
    generateOverheatSteam() {
        const frames = [];
        for (let i = 0; i < 6; i++) {
            const progress = i / 5;
            frames.push((ctx) => this.drawSteam(ctx, progress));
        }
        return frames;
    },

    // Drawing methods for each enemy type
    drawEnemy(ctx, type, color, legPhase, bobOffset, attacking) {
        ctx.save();
        ctx.translate(0, bobOffset);

        switch(type) {
            case 'ork':
            case 'grunt':
                this.drawGrunt(ctx, color, legPhase, attacking);
                break;
            case 'runner':
                this.drawRunner(ctx, color, legPhase, attacking);
                break;
            case 'heavy':
                this.drawHeavy(ctx, color, legPhase, attacking);
                break;
            case 'cultist':
                this.drawCultist(ctx, color, legPhase, attacking);
                break;
            case 'chaos':
                this.drawChaosMarine(ctx, color, legPhase, attacking);
                break;
        }
        ctx.restore();
    },

    drawGrunt(ctx, color, legPhase, attacking) {
        // Body
        ctx.fillStyle = color;
        ctx.fillRect(-8, -8, 16, 16);
        
        // Head
        ctx.fillStyle = '#6b9b6f';
        ctx.beginPath();
        ctx.arc(0, -12, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#FF0000';
        const eyeOffset = attacking ? 3 : 0;
        ctx.fillRect(-3 + eyeOffset, -14, 2, 2);
        ctx.fillRect(1 + eyeOffset, -14, 2, 2);
        
        // Legs (walking animation)
        const legOffset = Math.sin(legPhase) * 4;
        ctx.fillStyle = '#3a5c3e';
        ctx.fillRect(-6, 8, 4, 6 + legOffset);
        ctx.fillRect(2, 8, 4, 6 - legOffset);
        
        // Weapon
        if (attacking) {
            ctx.fillStyle = '#666';
            ctx.fillRect(8, -5, 12, 3);
        }
    },

    drawRunner(ctx, color, legPhase, attacking) {
        ctx.save();
        // Fast scurry - lower to ground
        ctx.translate(0, 4);
        
        // Body
        ctx.fillStyle = color;
        ctx.fillRect(-7, -6, 14, 12);
        
        // Head (leaning forward)
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.ellipse(8, -8, 6, 5, 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#00FF00';
        const eyeOffset = attacking ? 2 : 0;
        ctx.fillRect(6 + eyeOffset, -10, 2, 2);
        
        // Fast legs
        const legSpeed = legPhase * 2;
        ctx.fillStyle = '#5c3a1e';
        const leg1 = Math.sin(legSpeed) * 5;
        const leg2 = Math.sin(legSpeed + Math.PI) * 5;
        ctx.fillRect(-5, 6, 3, 8 + leg1);
        ctx.fillRect(2, 6, 3, 8 + leg2);
        
        // Tail
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.lineTo(-15, Math.sin(legPhase * 2) * 3);
        ctx.stroke();
        
        ctx.restore();
    },

    drawHeavy(ctx, color, legPhase, attacking) {
        ctx.save();
        // Slow stomping
        const stomp = Math.sin(legPhase) * 2;
        ctx.translate(0, stomp);
        
        // Large body
        ctx.fillStyle = color;
        ctx.fillRect(-12, -12, 24, 24);
        
        // Armored head
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath();
        ctx.arc(0, -16, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Helmet details
        ctx.fillStyle = '#C9A227';
        ctx.fillRect(-2, -20, 4, 8);
        
        // Glowing eyes
        ctx.fillStyle = '#00FF00';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#00FF00';
        ctx.fillRect(-5, -16, 3, 3);
        ctx.fillRect(2, -16, 3, 3);
        ctx.shadowBlur = 0;
        
        // Heavy legs
        ctx.fillStyle = '#1a1a1a';
        const legMove = Math.sin(legPhase) * 3;
        ctx.fillRect(-9, 12, 6, 10 + legMove);
        ctx.fillRect(3, 12, 6, 10 - legMove);
        
        // Heavy weapon
        ctx.fillStyle = '#444';
        ctx.fillRect(12, -8, 16, 8);
        
        ctx.restore();
    },

    drawCultist(ctx, color, legPhase, attacking) {
        // Triangle body
        ctx.fillStyle = '#2c1810';
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(-8, 10);
        ctx.lineTo(8, 10);
        ctx.fill();
        
        // Hood
        ctx.fillStyle = '#1a0f0a';
        ctx.beginPath();
        ctx.arc(0, -4, 8, Math.PI, 0);
        ctx.fill();
        
        // Glowing eyes
        ctx.fillStyle = color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = color;
        const eyeOffset = attacking ? 2 : 0;
        ctx.fillRect(-3 + eyeOffset, -6, 2, 2);
        ctx.fillRect(1 + eyeOffset, -6, 2, 2);
        ctx.shadowBlur = 0;
        
        // Robe movement
        const sway = Math.sin(legPhase) * 2;
        ctx.fillStyle = '#3c2820';
        ctx.fillRect(-8 + sway, 10, 16, 8);
        
        // Staff/Ritual weapon
        if (attacking) {
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(10, 5);
            ctx.lineTo(18, -10);
            ctx.stroke();
        }
    },

    drawChaosMarine(ctx, color, legPhase, attacking) {
        ctx.save();
        
        // Body
        ctx.fillStyle = '#4a0000';
        ctx.fillRect(-10, -10, 20, 22);
        
        // Spikes on back
        ctx.fillStyle = '#666';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(-8, -5 + i * 7);
            ctx.lineTo(-15 - i * 2, -8 + i * 7);
            ctx.lineTo(-8, -2 + i * 7);
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(8, -5 + i * 7);
            ctx.lineTo(15 + i * 2, -8 + i * 7);
            ctx.lineTo(8, -2 + i * 7);
            ctx.fill();
        }
        
        // Helmet
        ctx.fillStyle = '#3a0000';
        ctx.fillRect(-7, -18, 14, 8);
        
        // Chaotic eye glow
        ctx.fillStyle = color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        const eyePulse = attacking ? 1.5 : 1;
        ctx.fillRect(-4 * eyePulse, -16, 8 * eyePulse, 3);
        ctx.shadowBlur = 0;
        
        // Armored legs
        ctx.fillStyle = '#2a0000';
        const legMove = Math.sin(legPhase) * 4;
        ctx.fillRect(-7, 12, 5, 8 + legMove);
        ctx.fillRect(2, 12, 5, 8 - legMove);
        
        // Chaos blade
        ctx.fillStyle = '#666';
        ctx.fillRect(10, -5, 4, 20);
        
        ctx.restore();
    },

    drawEnemyLunge(ctx, type, color) {
        ctx.save();
        ctx.translate(5, 0); // Lunge forward
        
        // Draw base enemy with attack pose
        this.drawEnemy(ctx, type, color, 0, -3, true);
        
        // Add motion lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(-20 - i * 5, -10 + i * 8);
            ctx.lineTo(-10 - i * 5, -8 + i * 8);
            ctx.stroke();
        }
        
        ctx.restore();
    },

    drawEnemyDeath(ctx, type, color, scale, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.scale(scale, scale);
        
        // Flash white
        ctx.fillStyle = `rgba(255, 255, 255, ${1 - alpha})`;
        ctx.fillRect(-20, -20, 40, 40);
        
        // Dissolving enemy
        ctx.fillStyle = color;
        const particles = 8;
        for (let i = 0; i < particles; i++) {
            const angle = (i / particles) * Math.PI * 2;
            const dist = (1 - alpha) * 15;
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;
            const size = 4 * alpha;
            ctx.fillRect(px - size/2, py - size/2, size, size);
        }
        
        ctx.restore();
    },

    drawMuzzleFlash(ctx, color, intensity) {
        ctx.save();
        
        // Core flash
        ctx.fillStyle = '#FFFFFF';
        const coreSize = 8 * intensity;
        ctx.beginPath();
        ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Outer glow
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.8 * intensity;
        const glowSize = 15 * intensity;
        ctx.beginPath();
        ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Starburst rays
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 * intensity;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const length = 10 + Math.random() * 10 * intensity;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
            ctx.stroke();
        }
        
        ctx.restore();
    },

    drawExplosion(ctx, color1, color2, scale, alpha, frame) {
        ctx.save();
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;
        
        // Expanding rings
        ctx.strokeStyle = color1;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 10 + frame * 3, 0, Math.PI * 2);
        ctx.stroke();
        
        // Core
        ctx.fillStyle = color2;
        ctx.beginPath();
        ctx.arc(0, 0, 8 - frame, 0, Math.PI * 2);
        ctx.fill();
        
        // Debris particles
        ctx.fillStyle = color1;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + frame * 0.5;
            const dist = 15 + frame * 2;
            const size = 3 - frame * 0.3;
            ctx.fillRect(
                Math.cos(angle) * dist - size/2,
                Math.sin(angle) * dist - size/2,
                size, size
            );
        }
        
        ctx.restore();
    },

    drawBlood(ctx, scale, alpha, frame) {
        ctx.save();
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;
        
        // Blood splatter shape
        ctx.fillStyle = '#8B0000';
        const splatters = 5 + frame;
        
        for (let i = 0; i < splatters; i++) {
            const angle = (i / splatters) * Math.PI * 2 + frame * 0.3;
            const dist = 5 + (i % 3) * 4;
            const size = 3 + Math.random() * 3;
            
            ctx.beginPath();
            ctx.arc(
                Math.cos(angle) * dist,
                Math.sin(angle) * dist,
                size * (1 - frame * 0.15),
                0, Math.PI * 2
            );
            ctx.fill();
        }
        
        // Drips
        ctx.fillStyle = '#5c0000';
        for (let i = 0; i < 3; i++) {
            const x = (i - 1) * 8;
            const length = 5 + frame * 3;
            ctx.fillRect(x - 1, 5, 2, length);
        }
        
        ctx.restore();
    },

    drawSmoke(ctx, scale, alpha, riseOffset) {
        ctx.save();
        ctx.translate(0, riseOffset);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;
        
        // Rising smoke puffs
        ctx.fillStyle = '#555';
        const puffs = 3;
        for (let i = 0; i < puffs; i++) {
            const offset = i * 8;
            const wobble = Math.sin(Date.now() * 0.002 + i) * 3;
            const size = 8 - i * 2;
            
            ctx.beginPath();
            ctx.arc(wobble, offset, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    },

    drawRailCharge(ctx, intensity) {
        ctx.save();
        
        // Charging energy core
        ctx.fillStyle = `rgba(157, 0, 255, ${0.3 + intensity * 0.7})`;
        ctx.shadowBlur = 20 * intensity;
        ctx.shadowColor = '#9D00FF';
        
        const size = 10 + intensity * 20;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Energy rings
        ctx.strokeStyle = '#E0B0FF';
        ctx.lineWidth = 2;
        const rings = 3;
        for (let i = 0; i < rings; i++) {
            const ringSize = size + i * 10 + Math.sin(Date.now() * 0.01 + i) * 5;
            ctx.globalAlpha = intensity * (1 - i * 0.3);
            ctx.beginPath();
            ctx.arc(0, 0, ringSize, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Sparks
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = intensity;
        for (let i = 0; i < 8; i++) {
            const angle = (Date.now() * 0.005 + i * 0.8) % (Math.PI * 2);
            const dist = size + 5 + Math.random() * 10;
            ctx.fillRect(
                Math.cos(angle) * dist - 1,
                Math.sin(angle) * dist - 1,
                2, 2
            );
        }
        
        ctx.shadowBlur = 0;
        ctx.restore();
    },

    drawSteam(ctx, progress) {
        ctx.save();
        ctx.globalAlpha = 0.6 - progress * 0.5;
        
        // Rising steam
        ctx.fillStyle = '#aaa';
        const wobble = Math.sin(progress * Math.PI * 3) * 5;
        const y = -progress * 25;
        const width = 8 + progress * 6;
        const height = 15 + progress * 10;
        
        ctx.beginPath();
        ctx.ellipse(wobble, y, width, height, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
};

// Animation Library - Pre-generated animations
const AnimationLibrary = {
    // Enemy animations
    enemies: {},
    
    // Weapon animations
    weapons: {},
    
    // Effect animations
    effects: {},
    
    init() {
        // Generate enemy animations - use lower FPS on mobile
        const fps = IS_MOBILE ? 8 : CONFIG.ENEMY_FPS;
        const effectFps = IS_MOBILE ? 12 : CONFIG.EFFECT_FPS;
        
        const enemyTypes = ['grunt', 'runner', 'heavy', 'cultist', 'chaos'];
        const enemyColors = {
            grunt: CONFIG.COLORBLIND_COLORS.ork,
            runner: '#8B4513',
            heavy: '#B87333',
            cultist: CONFIG.COLORBLIND_COLORS.cultist,
            chaos: CONFIG.COLORBLIND_COLORS.chaos
        };
        
        enemyTypes.forEach(type => {
            this.enemies[type] = {
                idle: new Animation(SpriteGenerator.generateEnemyIdle(type, enemyColors[type]), fps, true),
                walk: new Animation(SpriteGenerator.generateEnemyWalk(type, enemyColors[type]), fps, true),
                attack: new Animation(SpriteGenerator.generateEnemyAttack(type, enemyColors[type]), fps, false),
                death: new Animation(SpriteGenerator.generateDeathAnimation(type, enemyColors[type]), effectFps, false)
            };
        });
        
        // Generate weapon animations
        const weaponFps = IS_MOBILE ? 12 : CONFIG.EFFECT_FPS;
        this.weapons.muzzleFlash = {};
        WEAPONS.forEach(w => {
            this.weapons.muzzleFlash[w.id] = new Animation(
                SpriteGenerator.generateMuzzleFlash(w.trail),
                weaponFps,
                false
            );
        });
        
        this.weapons.railCharge = new Animation(
            SpriteGenerator.generateRailCharge(),
            weaponFps,
            false
        );
        
        this.weapons.overheatSteam = new Animation(
            SpriteGenerator.generateOverheatSteam(),
            IS_MOBILE ? 10 : CONFIG.EFFECT_FPS,
            true
        );
        
        // Generate effect animations
        const effectFps2 = IS_MOBILE ? 10 : CONFIG.EFFECT_FPS;
        this.effects.explosion = new Animation(
            SpriteGenerator.generateExplosion('#FF6B35', '#FFD700'),
            effectFps2,
            false
        );
        
        this.effects.blood = new Animation(
            SpriteGenerator.generateBloodSplatter(),
            effectFps2,
            false
        );
        
        this.effects.smoke = new Animation(
            SpriteGenerator.generateSmoke(),
            IS_MOBILE ? 8 : 10, // Lower smoke FPS on mobile
            true
        );
    },
    
    getEnemyAnimation(type, action) {
        const enemyType = type === 'ork' ? 'grunt' : type;
        if (this.enemies[enemyType] && this.enemies[enemyType][action]) {
            // Return a fresh copy of the animation
            const anim = this.enemies[enemyType][action];
            return new Animation(anim.frames, anim.fps, anim.loop);
        }
        return null;
    },
    
    getMuzzleFlash(weaponId) {
        if (this.weapons.muzzleFlash[weaponId]) {
            const anim = this.weapons.muzzleFlash[weaponId];
            return new Animation(anim.frames, anim.fps, anim.loop);
        }
        return null;
    }
};

// Animation Manager
class AnimationManager {
    constructor() {
        this.instances = [];
        this.pool = [];
        
        // Initialize pool
        for (let i = 0; i < CONFIG.ANIMATION_POOL_SIZE; i++) {
            this.pool.push(new AnimationInstance());
        }
    }
    
    spawn(x, y, animation, type, options = {}) {
        let instance = this.pool.find(i => !i.active);
        if (!instance) {
            instance = new AnimationInstance();
            this.pool.push(instance);
        }
        
        instance.init(x, y, animation, type, options);
        this.instances.push(instance);
        return instance;
    }
    
    spawnMuzzleFlash(x, y, weaponId, angle) {
        const anim = AnimationLibrary.getMuzzleFlash(weaponId);
        if (anim) {
            return this.spawn(x, y, anim, 'muzzleFlash', {
                angle: angle,
                scale: 0.8 + Math.random() * 0.4
            });
        }
        return null;
    }
    
    spawnExplosion(x, y, scale = 1) {
        const anim = AnimationLibrary.effects.explosion;
        return this.spawn(x, y, new Animation(anim.frames, anim.fps, anim.loop), 'explosion', {
            scale: scale
        });
    }
    
    spawnBloodSplatter(x, y) {
        const anim = AnimationLibrary.effects.blood;
        return this.spawn(x, y, new Animation(anim.frames, anim.fps, anim.loop), 'blood', {
            scale: 0.8 + Math.random() * 0.4,
            angle: Math.random() * Math.PI * 2
        });
    }
    
    spawnSmoke(x, y) {
        const anim = AnimationLibrary.effects.smoke;
        return this.spawn(x, y, new Animation(anim.frames, anim.fps, anim.loop), 'smoke', {
            scale: 0.6 + Math.random() * 0.4
        });
    }
    
    spawnDeathAnimation(x, y, enemyType) {
        const anim = AnimationLibrary.getEnemyAnimation(enemyType, 'death');
        if (anim) {
            return this.spawn(x, y, anim, 'death', {
                onComplete: () => {
                    // Spawn explosion at end
                    this.spawnExplosion(x, y, 0.5);
                }
            });
        }
        return null;
    }
    
    spawnRailCharge(x, y) {
        const anim = AnimationLibrary.weapons.railCharge;
        return this.spawn(x, y, new Animation(anim.frames, anim.fps, anim.loop), 'railCharge', {
            scale: 1.5
        });
    }
    
    spawnOverheatSteam(x, y) {
        const anim = AnimationLibrary.weapons.overheatSteam;
        return this.spawn(x, y, new Animation(anim.frames, anim.fps, anim.loop), 'steam', {
            scale: 0.8 + Math.random() * 0.4
        });
    }
    
    update(dt) {
        this.instances = this.instances.filter(instance => {
            const active = instance.update(dt);
            if (!active) {
                instance.reset();
            }
            return active;
        });
    }
    
    draw(ctx) {
        this.instances.forEach(instance => instance.draw(ctx));
    }
    
    clear() {
        this.instances.forEach(i => i.reset());
        this.instances = [];
    }
}

// Global animation manager
let animManager;

// ============================================
// GAME STATE
// ============================================

let canvas, ctx;
let gameRunning = false;
let gamePaused = false;
let endlessMode = false;
let lastTime = 0;
let accumulator = 0;
const TIME_STEP = 1000 / 60;

// Player state
let player = {
    x: 0,
    y: 0,
    angle: 0,
    weaponIndex: 0
};

// Game state
let score = 0;
let credits = 0;
let wave = 1;
let baseHealth = 1000;
let maxBaseHealth = 1000;
let combo = 1;
let comboTimer = 0;
let equippedWeapon = 0;
let ammo = [];
let reloadTimer = 0;
let shootCooldown = 0;
let isReloading = false;
let isFiring = false; // For chaingun continuous fire
let gameStats = {
    shotsFired: 0,
    shotsHit: 0,
    totalKills: 0
};

let highScore = 0;

// Enemy spawning
let enemiesToSpawn = 0;
let spawnTimer = 0;
let waveInProgress = false;
let enemiesKilledThisWave = 0;
let enemiesTotalInWave = 0;

// Settings
let gameSettings = {
    particles: !IS_MOBILE,  // Disable on mobile
    shake: !IS_MOBILE,      // Disable on mobile
    fps: false,
    autofire: false,
    aimassist: true,
    mobile: IS_MOBILE
};

let wasPausedWhenOpeningSettings = false;
let wasPausedWhenOpeningArsenal = false;

// ============================================
// SAVE / LOAD SYSTEM
// ============================================

const SAVE_KEY = 'vbd_save';

function loadGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data.weaponOwnership) weaponOwnership = data.weaponOwnership;
        if (data.weaponUpgrades) weaponUpgrades = data.weaponUpgrades;
        if (data.credits !== undefined) credits = data.credits;
        if (data.highScore !== undefined) highScore = data.highScore;
        if (data.gameSettings) {
            Object.assign(gameSettings, data.gameSettings);
        }
        if (data.fortressUpgrades) {
            fortressUpgrades = data.fortressUpgrades;
            // Migrate old saves that don't have armor upgrade
            if (!fortressUpgrades.armor) {
                fortressUpgrades.armor = { level: 0, maxLevel: 5, baseCost: 400, costMultiplier: 1.6 };
            }
        }
        console.log('Game loaded from save');
    } catch (e) {
        console.warn('Failed to load save:', e.message);
    }
}

function saveGame() {
    try {
        const data = {
            weaponOwnership,
            weaponUpgrades,
            credits,
            highScore,
            gameSettings,
            fortressUpgrades,
            savedAt: Date.now()
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save game:', e.message);
    }
}

// ============================================
// OBJECT POOLS
// ============================================

let pools = {
    particles: [],
    enemies: [],
    bullets: [],
    enemyProjectiles: []
};

class Particle {
    constructor() { this.reset(); }
    reset() {
        this.x = this.y = this.vx = this.vy = this.life = this.size = 0;
        this.color = this.type = null;
        this.active = false;
    }
    init(x, y, color, speed = 5, size = 4, type = 'normal') {
        this.x = x; this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const vel = Math.random() * speed;
        this.vx = Math.cos(angle) * vel;
        this.vy = Math.sin(angle) * vel;
        this.life = 30;
        this.maxLife = 30;
        this.color = color;
        this.size = size;
        this.type = type;
        this.active = true;
    }
    update() {
        if (!this.active) return false;
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1;
        this.life--;
        this.size *= 0.96;
        if (this.life <= 0 || this.size < 0.5) {
            this.active = false;
            return false;
        }
        return true;
    }
    draw(ctx) {
        if (!this.active) return;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

// Fortress attack constants
const FORTRESS_STOP_DISTANCE = 120; // Distance from center to stop
const FORTRESS_ATTACK_RANGE = 130; // Can attack from this range
const RANGED_STOP_DISTANCE = 220; // Ranged enemies stop further out
const RANGED_ATTACK_RANGE = 240;

class Enemy {
    constructor() { this.reset(); }
    reset() {
        this.x = this.y = this.vx = this.vy = this.angle = this.speed = 0;
        this.type = this.color = null;
        this.radius = this.health = this.maxHealth = this.value = 0;
        this.active = false;
        this.dead = false;
        this.outline = false;
        this.currentAnimation = null;
        this.animState = 'idle';
        this.animFlipX = false;
        this.attackCooldown = 0;
        this.attackTimer = 0;
        this.attackRate = 60; // Frames between attacks (60 = 1 second at 60fps)
        this.damage = 10; // Damage per attack
        this.state = 'moving'; // 'moving' or 'attacking'
    }
    init(type, speed) {
        this.type = type;
        this.speed = speed;
        this.dead = false;
        this.active = true;
        this.outline = false;
        this.state = 'moving';
        this.attackTimer = 0;
        
        // Set animation
        this.animState = 'walk';
        this.attackCooldown = 0;
        this.currentAnimation = AnimationLibrary.getEnemyAnimation(type, 'walk');
        
        const spawnAngle = Math.random() * Math.PI * 2;
        const distance = Math.max(canvas.width, canvas.height) / 2 + 50;
        this.x = canvas.width / 2 + Math.cos(spawnAngle) * distance;
        this.y = canvas.height / 2 + Math.sin(spawnAngle) * distance;
        
        const dx = canvas.width / 2 - this.x;
        const dy = canvas.height / 2 - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.vx = (dx / dist) * this.speed;
        this.vy = (dy / dist) * this.speed;
        this.angle = Math.atan2(dy, dx);
        
        if (type === 'ork') {
            this.radius = 12;
            this.health = this.maxHealth = 1;
            this.value = 10;
            this.color = CONFIG.COLORBLIND_COLORS.ork;
            this.attackRate = 60; // 1 second between attacks
            this.damage = 10;
        } else if (type === 'cultist') {
            this.radius = 11;
            this.health = this.maxHealth = 1;
            this.value = 15;
            this.color = CONFIG.COLORBLIND_COLORS.cultist;
            this.attackRate = 45; // Faster attacks
            this.damage = 8;
        } else if (type === 'chaos') {
            this.radius = 15;
            this.health = this.maxHealth = 3;
            this.value = 40;
            this.color = CONFIG.COLORBLIND_COLORS.chaos;
            this.vx *= 0.8;
            this.vy *= 0.8;
            this.attackRate = 90; // Slower but heavier attacks
            this.damage = 25;
        } else if (type === 'ranged') {
            this.radius = 10;
            this.health = this.maxHealth = 2;
            this.value = 25;
            this.color = '#00D4FF'; // Cyan glow
            this.attackRate = 80; // Moderate fire rate
            this.damage = 15;
        }
    }
    
    setAnimation(state) {
        if (this.animState === state) return;
        this.animState = state;
        this.currentAnimation = AnimationLibrary.getEnemyAnimation(this.type, state);
    }
    
    update() {
        if (!this.active || this.dead) return false;
        
        if (this.currentAnimation) {
            this.currentAnimation.update(16.67);
        }
        
        // Calculate distance to fortress center
        const dx = canvas.width / 2 - this.x;
        const dy = canvas.height / 2 - this.y;
        const distToCenter = Math.sqrt(dx * dx + dy * dy);
        
        // Determine stop distance based on enemy type
        const stopDist = this.type === 'ranged' ? RANGED_STOP_DISTANCE : FORTRESS_STOP_DISTANCE;

        if (distToCenter <= stopDist) {
            this.state = 'attacking';
            this.vx = 0;
            this.vy = 0;

            // Face the fortress
            this.angle = Math.atan2(dy, dx);

            // Attack fortress periodically
            this.attackTimer++;
            if (this.attackTimer >= this.attackRate) {
                if (this.type === 'ranged') {
                    this.fireRangedAttack();
                } else {
                    this.attackFortress();
                }
                this.attackTimer = 0;
            }

            // Visual feedback - attacking animation
            if (this.animState !== 'attack') {
                this.setAnimation('attack');
            }

            // Spawn impact effect on fortress periodically (melee only)
            if (this.type !== 'ranged' && this.attackTimer % 10 === 0 && animManager) {
                animManager.spawnBloodSplatter(
                    canvas.width / 2 + (Math.random() - 0.5) * 40,
                    canvas.height / 2 + (Math.random() - 0.5) * 40
                );
            }
        } else {
            // Move toward center
            this.state = 'moving';
            this.angle = Math.atan2(dy, dx);
            this.vx = Math.cos(this.angle) * this.speed;
            this.vy = Math.sin(this.angle) * this.speed;
            this.x += this.vx;
            this.y += this.vy;
            this.animFlipX = this.vx < 0;

            if (this.animState !== 'walk') {
                this.setAnimation('walk');
            }
        }

        return true;
    }

    fireRangedAttack() {
        const proj = getEnemyProjectile();
        if (!proj) return;
        const angle = Math.atan2(
            canvas.height / 2 - this.y,
            canvas.width / 2 - this.x
        );
        proj.init(this.x, this.y, angle, this.damage);
    }
    
    attackFortress() {
        // Damage the base
        applyFortressDamage(this.damage);
        
        // Play sound
        if (typeof playFortressDamage === 'function') {
            playFortressDamage();
        }
        
        // Visual shake effect
        if (gameSettings.shake && !IS_MOBILE) {
            const container = document.getElementById('gameContainer');
            if (container) {
                container.style.transform = `translate(${(Math.random()-0.5)*5}px, ${(Math.random()-0.5)*5}px)`;
                setTimeout(() => container.style.transform = '', 100);
            }
        }
        
        // Update UI
        updateBaseHealth();
        
        // Spawn particles at fortress
        createParticles(
            canvas.width / 2 + (Math.random() - 0.5) * 30,
            canvas.height / 2 + (Math.random() - 0.5) * 30,
            8, '#8B0000', 5
        );
        
        // Spawn impact effect
        if (animManager) {
            animManager.spawnExplosion(
                canvas.width / 2 + (Math.random() - 0.5) * 40,
                canvas.height / 2 + (Math.random() - 0.5) * 40,
                0.3
            );
        }
        
        // Check game over
        if (baseHealth <= 0) {
            gameOver();
        }
    }
    
    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        if (this.outline) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 2, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        if (this.type === 'ranged') {
            // Ranged enemy - floating orb with glow
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Inner core
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
            ctx.fill();

            // Floating ring
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 4 + Math.sin(Date.now() * 0.005) * 2, 0, Math.PI * 2);
            ctx.stroke();
        } else if (this.currentAnimation && this.animState !== 'death') {
            ctx.save();
            ctx.scale(this.animFlipX ? -1 : 1, 1);
            const frame = this.currentAnimation.current;
            if (typeof frame === 'function') {
                frame(ctx);
            }
            ctx.restore();
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
    
    startDeath() {
        this.dead = true;
        this.active = false;
        if (animManager) {
            animManager.spawnDeathAnimation(this.x, this.y, this.type);
            animManager.spawnBloodSplatter(this.x, this.y);
        }
    }
}

class Bullet {
    constructor() { this.reset(); }
    reset() {
        this.x = this.y = this.vx = this.vy = 0;
        this.damage = 0;
        this.speed = 0;
        this.type = null;
        this.active = false;
        this.pierced = [];
        this.pierce = 0;
        this.pierceCount = 0;
    }
    init(x, y, angle, speed, damage, type, pierce = 0) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.damage = damage;
        this.speed = speed;
        this.type = type;
        this.pierced = [];
        this.pierce = pierce;
        this.pierceCount = pierce;
        this.active = true;
    }
    update() {
        if (!this.active) return false;
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.active = false;
            return false;
        }
        return true;
    }
    draw(ctx) {
        if (!this.active) return;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

class EnemyProjectile {
    constructor() { this.reset(); }
    reset() {
        this.x = this.y = this.vx = this.vy = 0;
        this.damage = 0;
        this.speed = 0;
        this.active = false;
    }
    init(x, y, angle, damage) {
        this.x = x;
        this.y = y;
        this.speed = 4;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.damage = damage;
        this.active = true;
    }
    update() {
        if (!this.active) return false;
        this.x += this.vx;
        this.y += this.vy;

        // Despawn if off-screen
        if (this.x < -50 || this.x > canvas.width + 50 ||
            this.y < -50 || this.y > canvas.height + 50) {
            this.active = false;
            return false;
        }

        // Hit fortress
        const dx = this.x - canvas.width / 2;
        const dy = this.y - canvas.height / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 45) {
            applyFortressDamage(this.damage);
            if (typeof playFortressDamage === 'function') playFortressDamage();
            if (gameSettings.shake && !IS_MOBILE) {
                const container = document.getElementById('gameContainer');
                if (container) {
                    container.style.transform = `translate(${(Math.random()-0.5)*4}px, ${(Math.random()-0.5)*4}px)`;
                    setTimeout(() => container.style.transform = '', 80);
                }
            }
            updateBaseHealth();
            this.active = false;
            if (animManager) animManager.spawnExplosion(this.x, this.y, 0.3);
            if (baseHealth <= 0) gameOver();
            return false;
        }

        return true;
    }
    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.fillStyle = '#FF4444';
        ctx.shadowColor = '#FF4444';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ============================================
// CORE FUNCTIONS
// ============================================

function initPools() {
    for (let i = 0; i < CONFIG.POOL_SIZE.particles; i++) pools.particles.push(new Particle());
    for (let i = 0; i < CONFIG.POOL_SIZE.enemies; i++) pools.enemies.push(new Enemy());
    for (let i = 0; i < CONFIG.POOL_SIZE.bullets; i++) pools.bullets.push(new Bullet());
    for (let i = 0; i < 50; i++) pools.enemyProjectiles.push(new EnemyProjectile());
}

function getParticle() {
    return pools.particles.find(p => !p.active) || new Particle();
}
function getEnemy() {
    return pools.enemies.find(e => !e.active) || new Enemy();
}
function getBullet() {
    return pools.bullets.find(b => !b.active) || new Bullet();
}
function getEnemyProjectile() {
    return pools.enemyProjectiles.find(p => !p.active) || new EnemyProjectile();
}

function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d', { alpha: false });

    initPools();
    loadGame();
    resizeCanvas();
    
    // Initialize animation system
    AnimationLibrary.init();
    animManager = new AnimationManager();
    
    // Initialize ammo
    WEAPONS.forEach(w => {
        ammo[w.id] = w.magazine;
    });
    
    window.addEventListener('resize', resizeCanvas);
    setupInputs();
    
    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function setupInputs() {
    canvas.addEventListener('mousemove', (e) => {
        if (!gameRunning || gamePaused) return;
        const rect = canvas.getBoundingClientRect();
        player.x = e.clientX - rect.left;
        player.y = e.clientY - rect.top;
        player.angle = Math.atan2(player.y - canvas.height / 2, player.x - canvas.width / 2);
    });

    // Touch state tracking for swipe-to-aim, tap-to-fire
    let touchStartPos = { x: 0, y: 0 };
    let touchStartTime = 0;
    let hasMoved = false;
    const TAP_THRESHOLD = 10; // pixels
    const TAP_TIME_THRESHOLD = 200; // ms

    function updateAimFromTouch(touch) {
        const rect = canvas.getBoundingClientRect();
        player.x = touch.clientX - rect.left;
        player.y = touch.clientY - rect.top;
        player.angle = Math.atan2(player.y - canvas.height / 2, player.x - canvas.width / 2);
    }

    // Touch aiming (mobile) - THROTTLED for performance
    let lastTouch = 0;
    canvas.addEventListener('touchmove', (e) => {
        if (!gameRunning || gamePaused) return;
        e.preventDefault();
        if (IS_MOBILE && Date.now() - lastTouch < 16) return; // 60fps max
        lastTouch = Date.now();
        const touch = e.touches[0];
        const dist = Math.hypot(touch.clientX - touchStartPos.x, touch.clientY - touchStartPos.y);
        if (dist > TAP_THRESHOLD) {
            hasMoved = true;
        }
        updateAimFromTouch(touch);
    }, { passive: false });
    
    // Mouse controls (desktop)
    canvas.addEventListener('mousedown', (e) => {
        if (!gameRunning || gamePaused) return;
        if (e.button === 0) {
            isFiring = true;
            fireWeapon();
        }
    });

    canvas.addEventListener('mouseup', () => {
        isFiring = false;
    });

    canvas.addEventListener('mouseleave', () => {
        isFiring = false;
    });

    // Touch controls (mobile) - swipe to aim, tap to fire
    canvas.addEventListener('touchstart', (e) => {
        if (!gameRunning || gamePaused) return;
        e.preventDefault(); // Prevent scrolling
        const touch = e.touches[0];
        touchStartPos = { x: touch.clientX, y: touch.clientY };
        touchStartTime = Date.now();
        hasMoved = false;
        isFiring = true;
        // Update aim immediately
        updateAimFromTouch(touch);
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        if (!gameRunning || gamePaused) return;
        isFiring = false;
        const touchDuration = Date.now() - touchStartTime;
        // Fire if it was a tap (no movement, quick release)
        if (!hasMoved && touchDuration < TAP_TIME_THRESHOLD) {
            fireWeapon();
        }
    });
    
    window.addEventListener('keydown', (e) => {
        if (!gameRunning) return;
        
        switch(e.key) {
            case 'p':
            case 'P':
                togglePause();
                break;
            case 'r':
            case 'R':
                if (!isReloading) reloadWeapon();
                break;
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
                switchWeapon(parseInt(e.key) - 1);
                break;
        }
    });
}

function createParticles(x, y, count, color, speed) {
    if (!gameSettings.particles) return;
    for (let i = 0; i < count; i++) {
        const p = getParticle();
        p.init(x, y, color, speed, 3 + Math.random() * 3);
    }
}

function fireWeapon() {
    if (isReloading || shootCooldown > 0) return;
    
    const weapon = WEAPONS[equippedWeapon];
    
    if (ammo[equippedWeapon] <= 0) {
        reloadWeapon();
        return;
    }
    
    const angle = player.angle + (Math.random() - 0.5) * 0.05;
    
    // Spawn muzzle flash animation
    if (animManager) {
        const muzzleX = canvas.width / 2 + Math.cos(angle) * 45;
        const muzzleY = canvas.height / 2 + Math.sin(angle) * 45;
        animManager.spawnMuzzleFlash(muzzleX, muzzleY, weapon.id, angle);
    }
    
    const bullet = getBullet();
    bullet.init(
        canvas.width / 2 + Math.cos(angle) * 40,
        canvas.height / 2 + Math.sin(angle) * 40,
        angle,
        weapon.id === 3 ? 12 : weapon.id === 4 ? 6 : 15,
        weapon.damage,
        'normal',
        weapon.id === 3 ? 3 : 0
    );
    
    ammo[equippedWeapon]--;
    shootCooldown = weapon.fireRate / 1000 * 60; // Convert to frames
    gameStats.shotsFired++;
    
    // Play weapon fire sound
    const weaponNames = ['rifle', 'shotgun', 'chaingun', 'plasma', 'flamethrower'];
    if (typeof playWeaponSound === 'function') {
        playWeaponSound(weaponNames[weapon.id] || 'rifle');
    }
    
    // Recoil effect - disabled on mobile
    if (gameSettings.shake && !IS_MOBILE) {
        const container = document.getElementById('gameContainer');
        container.style.transform = `translate(${(Math.random()-0.5)*3}px, ${(Math.random()-0.5)*3}px)`;
        setTimeout(() => container.style.transform = '', 50);
    }
    
    updateWeaponUI();
}

function reloadWeapon() {
    if (isReloading || ammo[equippedWeapon] >= WEAPONS[equippedWeapon].magazine) return;
    isReloading = true;
    const weapon = WEAPONS[equippedWeapon];
    reloadTimer = weapon.reloadTime / 1000 * 60;
}

function switchWeapon(index) {
    if (index < 0 || index >= WEAPONS.length) return;
    if (index > 0 && !weaponOwnership[index]) return;
    equippedWeapon = index;
    updateWeaponUI();
}

function updateWeaponUI() {
    const weapon = WEAPONS[equippedWeapon];
    document.getElementById('weaponName').textContent = weapon.name;
    document.getElementById('weaponIcon').textContent = weapon.icon;
    document.getElementById('ammoText').textContent = `${ammo[equippedWeapon]} / ${weapon.magazine}`;
    document.getElementById('ammoFill').style.width = `${(ammo[equippedWeapon] / weapon.magazine) * 100}%`;
}

function updateBaseHealth() {
    const healthPercent = Math.max(0, (baseHealth / maxBaseHealth) * 100);
    document.getElementById('healthFill').style.width = `${healthPercent}%`;
    document.getElementById('healthText').textContent = `${Math.floor(healthPercent)}%`;
}

function updateCombo() {
    if (combo > 1) {
        document.getElementById('comboCounter').classList.add('active');
        document.getElementById('comboValue').textContent = `x${combo.toFixed(1)}`;
    } else {
        document.getElementById('comboCounter').classList.remove('active');
    }
}

function killEnemy(enemy) {
    if (enemy.startDeath) {
        enemy.startDeath();
    } else {
        enemy.dead = true;
        enemy.active = false;
    }
    
    // Play enemy death sound
    if (typeof enemyDeath === 'function') enemyDeath();
    
    createParticles(enemy.x, enemy.y, 10, enemy.color, 6);
    
    score += enemy.value * combo;
    credits += Math.floor(enemy.value / 5);
    
    enemiesKilledThisWave++;
    gameStats.totalKills++;
    
    combo = Math.min(combo + 0.1, CONFIG.MAX_COMBO);
    comboTimer = CONFIG.COMBO_TIMEOUT;
    
    document.getElementById('scoreValue').textContent = Math.floor(score);
    document.getElementById('creditsValue').textContent = credits;
    document.getElementById('killsValue').textContent = gameStats.totalKills;
    document.getElementById('enemiesValue').textContent = pools.enemies.filter(e => e.active && !e.dead).length;
    
    updateCombo();
}

function checkCollisions() {
    const activeBullets = pools.bullets.filter(b => b.active);
    const activeEnemies = pools.enemies.filter(e => e.active && !e.dead);
    
    for (const bullet of activeBullets) {
        for (const enemy of activeEnemies) {
            if (bullet.pierced.includes(enemy)) continue;
            
            const dx = bullet.x - enemy.x;
            const dy = bullet.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < enemy.radius + 5) {
                enemy.health -= bullet.damage;
                gameStats.shotsHit++;
                
                if (bullet.pierce > 0) {
                    bullet.pierced.push(enemy);
                    bullet.damage *= 0.7;
                    if (bullet.pierced.length >= bullet.pierceCount) bullet.active = false;
                } else {
                    bullet.active = false;
                }
                
                if (enemy.health <= 0) {
                    killEnemy(enemy);
                } else {
                    createParticles(bullet.x, bullet.y, 3, '#fff', 4);
                    // Play enemy hit sound
                    if (typeof enemyHit === 'function') enemyHit();
                }
                
                break;
            }
        }
    }
}

function checkEnemyProjectileCollisions() {
    const activeBullets = pools.bullets.filter(b => b.active);
    const activeProjectiles = pools.enemyProjectiles.filter(p => p.active);

    for (const bullet of activeBullets) {
        for (const proj of activeProjectiles) {
            const dx = bullet.x - proj.x;
            const dy = bullet.y - proj.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 12) {
                proj.active = false;
                bullet.active = false;
                createParticles(proj.x, proj.y, 5, '#FF4444', 4);
                if (typeof playExplosion === 'function') playExplosion();
                break;
            }
        }
    }
}

function startWave() {
    enemiesTotalInWave = 10 + (wave - 1) * 5;
    enemiesToSpawn = enemiesTotalInWave;
    enemiesKilledThisWave = 0;
    waveInProgress = true;

    // Announce wave
    document.getElementById('waveNumberDisplay').textContent = wave;
    document.getElementById('waveAnnouncement').classList.add('active');
    setTimeout(() => {
        document.getElementById('waveAnnouncement').classList.remove('active');
    }, 3000);
}

function spawnEnemy() {
    if (enemiesToSpawn <= 0) return;

    // Spawn in bursts of 2-5, faster on higher waves
    const burstSize = Math.min(
        enemiesToSpawn,
        2 + Math.floor(Math.random() * 3) + Math.floor(wave / 5)
    );
    const baseSpeed = 1 + (wave * 0.1);

    for (let i = 0; i < burstSize; i++) {
        if (enemiesToSpawn <= 0) break;

        // 65% ork, 20% cultist, 10% chaos, 5% ranged (waves 3+)
        let roll = Math.random();
        let enemyType;
        if (roll < 0.65) {
            enemyType = 'ork';
        } else if (roll < 0.85) {
            enemyType = 'cultist';
        } else if (roll < 0.95 || wave < 3) {
            enemyType = 'chaos';
        } else {
            enemyType = 'ranged';
        }

        const enemy = getEnemy();
        enemy.init(enemyType, baseSpeed * (enemyType === 'ork' ? 1.2 : enemyType === 'chaos' ? 0.6 : 1));

        // Stagger burst spawns slightly so they don't overlap perfectly
        enemy.x += (Math.random() - 0.5) * 30;
        enemy.y += (Math.random() - 0.5) * 30;
        enemy.angle = Math.atan2(
            canvas.height / 2 - enemy.y,
            canvas.width / 2 - enemy.x
        );
        enemy.vx = Math.cos(enemy.angle) * enemy.speed;
        enemy.vy = Math.sin(enemy.angle) * enemy.speed;

        enemiesToSpawn--;
    }
}

// ============================================
// GAME LOOP
// ============================================

function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    if (gameRunning && !gamePaused) {
        accumulator += deltaTime;
        
        while (accumulator >= TIME_STEP) {
            update(TIME_STEP);
            accumulator -= TIME_STEP;
        }
    }
    
    draw();
    requestAnimationFrame(gameLoop);
}

function update(dt) {
    // Update animation system
    if (animManager) animManager.update(dt);
    
    // Update player
    if (shootCooldown > 0) shootCooldown--;

    // Chaingun continuous fire while holding mouse/touch
    if (isFiring && equippedWeapon === 2 && !gamePaused) {
        fireWeapon();
    }

    if (isReloading) {
        reloadTimer--;
        if (reloadTimer <= 0) {
            ammo[equippedWeapon] = WEAPONS[equippedWeapon].magazine;
            isReloading = false;
            updateWeaponUI();
        }
    }
    
    // Update combo
    if (comboTimer > 0) {
        comboTimer--;
        if (comboTimer <= 0) {
            combo = 1;
            updateCombo();
        }
    }
    
    // Spawn enemies
    if (waveInProgress && enemiesToSpawn > 0) {
        spawnTimer--;
        if (spawnTimer <= 0) {
            spawnEnemy();
            spawnTimer = Math.max(20, 50 - wave * 2); // Faster bursts on higher waves
        }
    }
    
    // Update bullets
    pools.bullets.forEach(b => b.update());

    // Update enemies
    pools.enemies.forEach(e => e.update());

    // Update enemy projectiles
    pools.enemyProjectiles.forEach(p => p.update());

    // Update particles
    pools.particles.forEach(p => p.update());

    // Check collisions
    checkCollisions();
    checkEnemyProjectileCollisions();

    // Auto-turret logic
    if (fortressUpgrades.autoTurret.level > 0) {
        turretCooldown--;
        if (turretCooldown <= 0) {
            const activeEnemiesList = pools.enemies.filter(e => e.active && !e.dead);
            if (activeEnemiesList.length > 0) {
                // Target nearest enemy
                let nearest = activeEnemiesList[0];
                let nearestDist = Infinity;
                for (const e of activeEnemiesList) {
                    const dx = e.x - canvas.width / 2;
                    const dy = e.y - canvas.height / 2;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < nearestDist) {
                        nearestDist = d;
                        nearest = e;
                    }
                }
                const angle = Math.atan2(nearest.y - canvas.height / 2, nearest.x - canvas.width / 2);
                const bullet = getBullet();
                const turretDamage = 15 * fortressUpgrades.autoTurret.level;
                bullet.init(
                    canvas.width / 2 + Math.cos(angle) * 45,
                    canvas.height / 2 + Math.sin(angle) * 45,
                    angle,
                    12,
                    turretDamage,
                    'turret'
                );
                if (typeof playTurretFire === 'function') playTurretFire();
            }
            // Cooldown scales with level: faster at higher levels
            turretCooldown = Math.max(30, 90 - fortressUpgrades.autoTurret.level * 15);
        }
    }

    // Update enemy count
    const activeEnemies = pools.enemies.filter(e => e.active && !e.dead).length;
    document.getElementById('enemiesValue').textContent = activeEnemies;

    // Check wave completion - only when ALL enemies are dead (not just off-screen)
    if (waveInProgress && enemiesToSpawn === 0 && activeEnemies === 0 && enemiesKilledThisWave >= enemiesTotalInWave) {
        waveInProgress = false;
        wave++;
        document.getElementById('waveValue').textContent = wave;

        // Wave heal upgrade
        const healAmount = 100 + (fortressUpgrades.waveHeal.level * 50);
        baseHealth = Math.min(baseHealth + healAmount, maxBaseHealth);
        updateBaseHealth();
        // Play wave complete sound
        if (typeof playWaveComplete === 'function') playWaveComplete();
        setTimeout(startWave, 2000);
    }
    
    if (!waveInProgress && activeEnemies === 0 && wave === 1) {
        setTimeout(startWave, 1000);
    }
}

function drawFortress(ctx) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const healthPct = baseHealth / maxBaseHealth;

    // Outer shield glow when health is high
    if (healthPct > 0.6) {
        const glowIntensity = (healthPct - 0.6) / 0.4;
        ctx.save();
        ctx.globalAlpha = glowIntensity * 0.3;
        ctx.fillStyle = '#C9A227';
        ctx.beginPath();
        ctx.arc(cx, cy, 55 + Math.sin(Date.now() * 0.003) * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Health ring
    ctx.save();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, 48, 0, Math.PI * 2);
    ctx.stroke();

    // Health fill ring
    ctx.strokeStyle = healthPct > 0.5 ? '#2ecc71' : healthPct > 0.25 ? '#FFA500' : '#FF4444';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, 48, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * healthPct));
    ctx.stroke();
    ctx.restore();

    // Main fortress body - octagonal shape
    ctx.save();
    ctx.translate(cx, cy);

    // Structural layers from Reinforced Walls upgrade
    const healthLayers = fortressUpgrades.maxHealth.level;
    for (let i = healthLayers; i >= 0; i--) {
        const r = 42 + i * 4;
        ctx.fillStyle = i === 0 ? '#2a2a2a' : '#3a3a3a';
        ctx.strokeStyle = '#C9A227';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let j = 0; j < 8; j++) {
            const angle = (j / 8) * Math.PI * 2 - Math.PI / 8;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (j === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        if (i === 0) ctx.stroke();
    }

    // Ablative armor plating overlay
    const armorLevel = fortressUpgrades.armor.level;
    if (armorLevel > 0) {
        ctx.strokeStyle = '#00D4FF';
        ctx.lineWidth = 2 + armorLevel;
        ctx.globalAlpha = 0.3 + armorLevel * 0.1;
        const r = 44;
        ctx.beginPath();
        for (let j = 0; j < 8; j++) {
            const angle = (j / 8) * Math.PI * 2 - Math.PI / 8;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (j === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // Inner core
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.fill();

    // Core glow pulse
    ctx.fillStyle = healthPct > 0.3 ? '#C9A227' : '#FF4444';
    ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.005) * 0.2;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Damage cracks when health is low
    if (healthPct < 0.4) {
        ctx.strokeStyle = '#FF4444';
        ctx.lineWidth = 2;
        const crackCount = Math.floor((1 - healthPct / 0.4) * 5);
        for (let i = 0; i < crackCount; i++) {
            const angle = (i / 5) * Math.PI * 2 + 0.3;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * 15, Math.sin(angle) * 15);
            ctx.lineTo(Math.cos(angle + 0.2) * 35, Math.sin(angle + 0.2) * 35);
            ctx.stroke();
        }
    }

    ctx.restore();

    // Auto-turrets
    const turretCount = fortressUpgrades.autoTurret.level;
    if (turretCount > 0) {
        const turretAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2].slice(0, turretCount);
        for (const ta of turretAngles) {
            const tx = cx + Math.cos(ta) * 50;
            const ty = cy + Math.sin(ta) * 50;

            // Turret base
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.arc(tx, ty, 8, 0, Math.PI * 2);
            ctx.fill();

            // Turret barrel - points toward nearest enemy, or rotates slowly
            let barrelAngle = ta;
            const activeEnemies = pools.enemies.filter(e => e.active && !e.dead);
            if (activeEnemies.length > 0) {
                let nearest = activeEnemies[0];
                let nearestDist = Infinity;
                for (const e of activeEnemies) {
                    const dx = e.x - tx;
                    const dy = e.y - ty;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < nearestDist) {
                        nearestDist = d;
                        nearest = e;
                    }
                }
                barrelAngle = Math.atan2(nearest.y - ty, nearest.x - tx);
            }

            ctx.save();
            ctx.translate(tx, ty);
            ctx.rotate(barrelAngle);
            ctx.fillStyle = '#C9A227';
            ctx.fillRect(0, -2, 14, 4);
            ctx.restore();
        }
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#0D0D0D';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw fortress
    drawFortress(ctx);
    
    // Draw aim line
    ctx.strokeStyle = 'rgba(201, 162, 39, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, canvas.height / 2);
    ctx.lineTo(
        canvas.width / 2 + Math.cos(player.angle) * 200,
        canvas.height / 2 + Math.sin(player.angle) * 200
    );
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw bullets
    pools.bullets.forEach(b => b.draw(ctx));

    // Draw enemy projectiles
    pools.enemyProjectiles.forEach(p => p.draw(ctx));

    // Draw enemies
    pools.enemies.forEach(e => e.draw(ctx));

    // Draw particles
    pools.particles.forEach(p => p.draw(ctx));

    // Draw animations on top
    if (animManager) animManager.draw(ctx);
}

// ============================================
// UI FUNCTIONS
// ============================================

function startGame() {
    // Hide ALL menu screens first
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('pauseMenu').classList.add('hidden');
    document.getElementById('settingsMenu').classList.add('hidden');
    document.getElementById('helpMenu').classList.add('hidden');
    document.getElementById('leaderboardScreen').classList.add('hidden');
    document.getElementById('arsenalScreen').classList.add('hidden');
    document.getElementById('bastionScreen').classList.add('hidden');
    document.getElementById('endlessScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.remove('active');
    
    // Show game UI
    document.getElementById('gameUI').classList.add('active');
    
    // Reset game state
    score = 0;
    wave = 1;
    combo = 1;
    comboTimer = 0;
    equippedWeapon = 0;
    gameStats = { shotsFired: 0, shotsHit: 0, totalKills: 0 };
    enemiesKilledThisWave = 0;
    enemiesTotalInWave = 0;

    // Apply fortress upgrades
    maxBaseHealth = 1000 + (fortressUpgrades.maxHealth.level * 200);
    baseHealth = maxBaseHealth;
    combo = 1;
    comboTimer = 0;
    equippedWeapon = 0;
    gameStats = { shotsFired: 0, shotsHit: 0, totalKills: 0 };
    enemiesKilledThisWave = 0;
    enemiesTotalInWave = 0;
    
    // Reset ammo
    WEAPONS.forEach(w => {
        ammo[w.id] = w.magazine;
    });
    
    // Clear pools
    pools.enemies.forEach(e => e.reset());
    pools.bullets.forEach(b => b.reset());
    pools.particles.forEach(p => p.reset());
    
    // Clear animations
    if (animManager) animManager.clear();
    
    gameRunning = true;
    gamePaused = false;
    
    updateBaseHealth();
    updateWeaponUI();
    
    setTimeout(startWave, 1000);
}

function restartGame() {
    document.getElementById('gameOverScreen').classList.remove('active');
    document.getElementById('gameUI').classList.remove('active');
    startGame();
}

function gameOver() {
    gameRunning = false;
    isFiring = false;
    document.getElementById('gameUI').classList.remove('active');
    document.getElementById('gameOverScreen').classList.add('active');

    // Update high score
    if (score > highScore) {
        highScore = Math.floor(score);
    }

    // Update final stats
    document.getElementById('finalScore').textContent = Math.floor(score);
    document.getElementById('finalWave').textContent = wave - 1;
    document.getElementById('finalKills').textContent = gameStats.totalKills;
    document.getElementById('finalCredits').textContent = credits;

    // Persist progression
    saveGame();
}

function togglePause() {
    gamePaused = !gamePaused;
    if (gamePaused) {
        isFiring = false;
        document.getElementById('pauseMenu').classList.remove('hidden');
    } else {
        document.getElementById('pauseMenu').classList.add('hidden');
    }
}

function resumeGame() {
    gamePaused = false;
    document.getElementById('pauseMenu').classList.add('hidden');
}

function showMainMenu(e) {
    if (e) e.stopPropagation();
    gameRunning = false;
    gamePaused = false;
    document.getElementById('gameUI').classList.remove('active');
    document.getElementById('gameOverScreen').classList.remove('active');
    document.getElementById('pauseMenu').classList.add('hidden');
    document.getElementById('settingsMenu').classList.add('hidden');
    document.getElementById('helpMenu').classList.add('hidden');
    document.getElementById('leaderboardScreen').classList.add('hidden');
    document.getElementById('arsenalScreen').classList.add('hidden');
    document.getElementById('bastionScreen').classList.add('hidden');
    document.getElementById('endlessScreen').classList.add('hidden');
    document.getElementById('mainMenu').classList.remove('hidden');
    wasPausedWhenOpeningSettings = false;
    wasPausedWhenOpeningArsenal = false;
}

function showSettings(e) {
    if (e) e.stopPropagation();

    // Check if pause menu is currently visible
    const pauseMenu = document.getElementById('pauseMenu');
    wasPausedWhenOpeningSettings = !pauseMenu.classList.contains('hidden');

    // Hide all other menus but keep pause visible underneath (option B)
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('arsenalScreen').classList.add('hidden');
    document.getElementById('bastionScreen').classList.add('hidden');
    document.getElementById('endlessScreen').classList.add('hidden');
    document.getElementById('helpMenu').classList.add('hidden');
    document.getElementById('leaderboardScreen').classList.add('hidden');

    // Show settings (appears OVER pause menu due to z-index: 200)
    document.getElementById('settingsMenu').classList.remove('hidden');
}

function settingsBack(e) {
    if (e) e.stopPropagation();

    document.getElementById('settingsMenu').classList.add('hidden');

    // If we were paused, just return (pause menu is still visible underneath)
    // If we came from main menu, go back there
    if (!wasPausedWhenOpeningSettings) {
        document.getElementById('mainMenu').classList.remove('hidden');
    }

    // Reset the flag
    wasPausedWhenOpeningSettings = false;
}

function showHelp(e) {
    if (e) e.stopPropagation();
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('helpMenu').classList.remove('hidden');
}

function showLeaderboard(e) {
    if (e) e.stopPropagation();
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('leaderboardScreen').classList.remove('hidden');
    const list = document.getElementById('leaderboardList');
    list.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">Leaderboard coming soon!</div>';
}

function toggleSetting(setting) {
    gameSettings[setting] = !gameSettings[setting];
    const toggle = document.getElementById(setting + 'Toggle');
    if (toggle) {
        toggle.classList.toggle('active', gameSettings[setting]);
    }
    if (typeof playClick === 'function') playClick();
}

function updateVolume(type, value) {
    const vol = parseInt(value) / 100;
    if (type === 'master') {
        sounds.setVolume(vol);
    } else if (type === 'sfx') {
        sounds.setSFXVolume(vol);
    }
    if (typeof saveSoundSettings === 'function') saveSoundSettings();
}

// ============================================
// MOBILE PAUSE BUTTON SETUP
// ============================================

function setupPauseButton() {
    const pauseBtn = document.getElementById('pauseButton');
    if (!pauseBtn) return;

    // Prevent touch events from propagating to game canvas
    pauseBtn.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        e.preventDefault();
        pauseBtn.style.transform = 'scale(0.95)';
    }, { passive: false });

    pauseBtn.addEventListener('touchend', (e) => {
        e.stopPropagation();
        e.preventDefault();
        pauseBtn.style.transform = '';
        togglePause();
    }, { passive: false });

    // Also handle click for desktop
    pauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePause();
    });
}

// Prevent iOS double-tap zoom
document.addEventListener('dblclick', function(event) {
    event.preventDefault();
}, { passive: false });

// Global error handler
window.onerror = function(msg, url, line) {
    console.error('JS Error:', msg, 'at line', line);
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    init();
    setupPauseButton();

    // Add click sounds to all menu buttons
    const menuButtons = document.querySelectorAll('.menu-btn');
    menuButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            if (typeof playClick === 'function') playClick();
        });
    });

    // Enter key for cheat code input
    const cheatInput = document.getElementById('cheatCodeInput');
    if (cheatInput) {
        cheatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                submitCheatCode();
            }
        });
    }

    console.log('DOM ready');
});

// ============================================
// ARSENAL SYSTEM
// ============================================

let selectedWeaponId = 0;
let arsenalPreviousScreen = 'mainMenu';

// Weapon ownership and loadout
let weaponOwnership = [true, false, false, false, false]; // Start with only Lasgun
let currentLoadout = [0]; // Currently equipped weapons

// Weapon upgrades (future feature)
let weaponUpgrades = [
    { damageLevel: 1, fireRateLevel: 1, magazineLevel: 1 },
    { damageLevel: 1, fireRateLevel: 1, magazineLevel: 1 },
    { damageLevel: 1, fireRateLevel: 1, magazineLevel: 1 },
    { damageLevel: 1, fireRateLevel: 1, magazineLevel: 1 },
    { damageLevel: 1, fireRateLevel: 1, magazineLevel: 1 }
];

// Fortress upgrades
let fortressUpgrades = {
    maxHealth: { level: 0, maxLevel: 5, baseCost: 300, costMultiplier: 1.5 },
    autoTurret: { level: 0, maxLevel: 3, baseCost: 500, costMultiplier: 2.0 },
    waveHeal: { level: 0, maxLevel: 5, baseCost: 200, costMultiplier: 1.4 },
    armor: { level: 0, maxLevel: 5, baseCost: 400, costMultiplier: 1.6 }
};

let turretCooldown = 0;

function applyFortressDamage(rawDamage) {
    const armorLevel = fortressUpgrades.armor.level;
    const reduction = armorLevel * 0.08; // 8% per level, max 40%
    const actualDamage = Math.max(1, Math.floor(rawDamage * (1 - reduction)));
    baseHealth -= actualDamage;
    return actualDamage;
}

function showArsenal() {
    arsenalPreviousScreen = 'mainMenu';
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('arsenalScreen').classList.remove('hidden');
    showArsenalTab('weapons');
    updateArsenalUI();
}

function showArsenalFromPause() {
    arsenalPreviousScreen = 'pauseMenu';
    document.getElementById('pauseMenu').classList.add('hidden');
    document.getElementById('arsenalScreen').classList.remove('hidden');
    showArsenalTab('weapons');
    updateArsenalUI();
}

function showArsenalFromGame() {
    arsenalPreviousScreen = 'game';
    document.getElementById('gameUI').classList.remove('active');
    document.getElementById('arsenalScreen').classList.remove('hidden');
    showArsenalTab('weapons');
    updateArsenalUI();
}

function arsenalBack() {
    document.getElementById('arsenalScreen').classList.add('hidden');
    
    if (arsenalPreviousScreen === 'pauseMenu') {
        document.getElementById('pauseMenu').classList.remove('hidden');
    } else if (arsenalPreviousScreen === 'game') {
        document.getElementById('gameUI').classList.add('active');
    } else {
        document.getElementById('mainMenu').classList.remove('hidden');
    }
}

function showArsenalTab(tabName) {
    const weaponsPanel = document.getElementById('weaponsPanel');
    const cheatsPanel = document.getElementById('cheatsPanel');
    const weaponsTabBtn = document.getElementById('weaponsTabBtn');
    const cheatsTabBtn = document.getElementById('cheatsTabBtn');
    const cheatMessage = document.getElementById('cheatMessage');

    if (tabName === 'weapons') {
        weaponsPanel.classList.remove('hidden');
        cheatsPanel.classList.add('hidden');
        weaponsTabBtn.classList.add('active');
        cheatsTabBtn.classList.remove('active');
    } else {
        weaponsPanel.classList.add('hidden');
        cheatsPanel.classList.remove('hidden');
        weaponsTabBtn.classList.remove('active');
        cheatsTabBtn.classList.add('active');
    }

    if (cheatMessage) {
        cheatMessage.textContent = '';
        cheatMessage.className = 'cheat-message';
    }
}

function submitCheatCode() {
    const input = document.getElementById('cheatCodeInput');
    const message = document.getElementById('cheatMessage');
    const code = input.value.trim();

    if (!code) {
        message.textContent = 'Please enter a code.';
        message.className = 'cheat-message error';
        return;
    }

    if (code === 'HailTheEmperor') {
        credits += 50000;
        message.textContent = 'Code accepted! +50,000 Credits granted.';
        message.className = 'cheat-message success';
        input.value = '';
        saveGame();
        updateArsenalUI();
        updateBastionUI();
        playPurchase();
    } else {
        message.textContent = 'Invalid code. Try again.';
        message.className = 'cheat-message error';
    }
}

function updateArsenalUI() {
    // Update credits display
    document.getElementById('arsenalCredits').textContent = credits;
    
    // Generate weapon grid
    const grid = document.getElementById('arsenalGrid');
    grid.innerHTML = '';
    
    WEAPONS.forEach(weapon => {
        const isOwned = weaponOwnership[weapon.id];
        const isSelected = selectedWeaponId === weapon.id;
        const canAfford = credits >= weapon.cost;
        
        const card = document.createElement('div');
        card.className = `arsenal-weapon-card ${isSelected ? 'selected' : ''} ${isOwned ? 'owned' : ''} ${!isOwned && !canAfford ? 'locked' : ''}`;
        card.onclick = () => selectWeapon(weapon.id);
        
        card.innerHTML = `
            <div class="arsenal-weapon-icon">${weapon.icon}</div>
            <div class="arsenal-weapon-name">${weapon.name}</div>
            <div class="arsenal-weapon-cost ${isOwned ? 'owned' : ''}">
                ${isOwned ? '✓ OWNED' : weapon.cost + ' CR'}
            </div>
        `;
        
        grid.appendChild(card);
    });
    
    // Update details panel
    updateArsenalDetails();
}

function selectWeapon(weaponId) {
    selectedWeaponId = weaponId;
    updateArsenalUI();
}

function updateArsenalDetails() {
    const weapon = WEAPONS[selectedWeaponId];
    const isOwned = weaponOwnership[selectedWeaponId];
    const canAfford = credits >= weapon.cost;
    const isEquipped = equippedWeapon === selectedWeaponId;
    
    document.getElementById('weaponPreview').textContent = weapon.icon;
    document.getElementById('weaponDetailName').textContent = weapon.name;
    document.getElementById('weaponDetailDesc').textContent = weapon.description;
    
    // Update stats display
    const statsHtml = `
        <div class="weapon-stat">
            <div class="weapon-stat-label">Damage</div>
            <div class="weapon-stat-value">${weapon.damage}</div>
        </div>
        <div class="weapon-stat">
            <div class="weapon-stat-label">Fire Rate</div>
            <div class="weapon-stat-value">${(1000 / weapon.fireRate).toFixed(1)}/s</div>
        </div>
        <div class="weapon-stat">
            <div class="weapon-stat-label">Magazine</div>
            <div class="weapon-stat-value">${weapon.magazine}</div>
        </div>
        <div class="weapon-stat">
            <div class="weapon-stat-label">Reload Time</div>
            <div class="weapon-stat-value">${(weapon.reloadTime / 1000).toFixed(1)}s</div>
        </div>
    `;
    document.getElementById('weaponStats').innerHTML = statsHtml;
    
    // Update buttons
    const buyBtn = document.getElementById('buyWeaponBtn');
    const equipBtn = document.getElementById('equipWeaponBtn');
    
    if (isOwned) {
        buyBtn.disabled = true;
        buyBtn.textContent = 'OWNED';
        buyBtn.classList.remove('primary');
        
        equipBtn.disabled = false;
        equipBtn.textContent = isEquipped ? 'EQUIPPED' : 'EQUIP';
        if (isEquipped) {
            equipBtn.classList.add('primary');
        } else {
            equipBtn.classList.remove('primary');
        }
    } else {
        buyBtn.disabled = !canAfford;
        buyBtn.textContent = canAfford ? `BUY (${weapon.cost} CR)` : 'CANNOT AFFORD';
        if (canAfford) {
            buyBtn.classList.add('primary');
        } else {
            buyBtn.classList.remove('primary');
        }
        
        equipBtn.disabled = true;
        equipBtn.textContent = 'EQUIP';
        equipBtn.classList.remove('primary');
    }
}

function buySelectedWeapon() {
    const weapon = WEAPONS[selectedWeaponId];
    
    if (weaponOwnership[selectedWeaponId]) return;
    if (credits < weapon.cost) return;
    
    // Deduct credits
    credits -= weapon.cost;
    weaponOwnership[selectedWeaponId] = true;
    
    // Play purchase sound
    if (typeof playPurchase === 'function') playPurchase();
    
    // Update UI
    document.getElementById('creditsValue').textContent = credits;
    updateArsenalUI();
    saveGame();
}

function equipSelectedWeapon() {
    if (!weaponOwnership[selectedWeaponId]) return;
    
    equippedWeapon = selectedWeaponId;
    
    // Update weapon UI in game
    updateWeaponUI();
    
    // Update arsenal UI
    updateArsenalUI();
    saveGame();
}

// ============================================
// ADDITIONAL MENU FUNCTIONS
// ============================================

function showBastion(e) {
    if (e) e.stopPropagation();
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('bastionScreen').classList.remove('hidden');
    updateBastionUI();
}

function updateBastionUI() {
    document.getElementById('bastionCredits').textContent = credits;
    const grid = document.getElementById('bastionGrid');
    grid.innerHTML = '';

    const upgrades = [
        {
            key: 'maxHealth',
            name: 'Reinforced Walls',
            icon: '🛡️',
            desc: 'Increase maximum fortress health.',
            effect: lvl => `+${lvl * 200} Max HP`
        },
        {
            key: 'armor',
            name: 'Ablative Plating',
            icon: '🔲',
            desc: 'Reduce all incoming damage to the fortress.',
            effect: lvl => lvl > 0 ? `-${(lvl * 8)}% Damage Taken` : 'No protection'
        },
        {
            key: 'autoTurret',
            name: 'Auto-Turret',
            icon: '🔫',
            desc: 'Automated turret that fires at nearby enemies.',
            effect: lvl => lvl > 0 ? `Level ${lvl} — ${(90 - lvl * 15) / 60}s cooldown` : 'Not installed'
        },
        {
            key: 'waveHeal',
            name: 'Repair Drones',
            icon: '🔧',
            desc: 'Restore health after each surviving wave.',
            effect: lvl => `+${100 + lvl * 50} HP per wave`
        }
    ];

    for (const up of upgrades) {
        const data = fortressUpgrades[up.key];
        const cost = Math.floor(data.baseCost * Math.pow(data.costMultiplier, data.level));
        const maxed = data.level >= data.maxLevel;
        const canAfford = credits >= cost;

        const card = document.createElement('div');
        card.className = 'settings-card';
        card.style.textAlign = 'center';
        card.innerHTML = `
            <div style="font-size: 36px; margin-bottom: 8px;">${up.icon}</div>
            <div style="font-size: 16px; color: var(--accent-gold); font-weight: bold; margin-bottom: 4px;">${up.name}</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">${up.desc}</div>
            <div style="font-size: 13px; color: var(--accent-gold-light); margin-bottom: 8px;">${up.effect(data.level)}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">Level ${data.level} / ${data.maxLevel}</div>
            <button class="menu-btn ${maxed ? '' : (canAfford ? 'primary' : '')}" style="padding: 8px 16px; font-size: 13px;" onclick="buyFortressUpgrade('${up.key}')" ${maxed || !canAfford ? 'disabled' : ''}>
                ${maxed ? 'MAXED' : (canAfford ? `UPGRADE (${cost} CR)` : `NEED ${cost} CR`)}
            </button>
        `;
        grid.appendChild(card);
    }
}

function buyFortressUpgrade(type) {
    const data = fortressUpgrades[type];
    if (!data || data.level >= data.maxLevel) return;

    const cost = Math.floor(data.baseCost * Math.pow(data.costMultiplier, data.level));
    if (credits < cost) return;

    credits -= cost;
    data.level++;

    // Apply immediate effects
    if (type === 'maxHealth') {
        maxBaseHealth += 200;
        baseHealth += 200;
        updateBaseHealth();
    }

    document.getElementById('creditsValue').textContent = credits;
    if (typeof playPurchase === 'function') playPurchase();
    updateBastionUI();
    saveGame();
}

function showEndless() {
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('endlessScreen').classList.remove('hidden');
}

function startEndlessGame() {
    // Hide ALL menu screens first
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('pauseMenu').classList.add('hidden');
    document.getElementById('settingsMenu').classList.add('hidden');
    document.getElementById('helpMenu').classList.add('hidden');
    document.getElementById('leaderboardScreen').classList.add('hidden');
    document.getElementById('arsenalScreen').classList.add('hidden');
    document.getElementById('bastionScreen').classList.add('hidden');
    document.getElementById('endlessScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.remove('active');
    
    // Show game UI
    document.getElementById('gameUI').classList.add('active');
    
    // Reset game state for endless mode
    score = 0;
    wave = 1;
    combo = 1;
    comboTimer = 0;
    gameStats = { shotsFired: 0, shotsHit: 0, totalKills: 0 };
    enemiesKilledThisWave = 0;
    enemiesTotalInWave = 0;

    // Apply fortress upgrades
    maxBaseHealth = 1000 + (fortressUpgrades.maxHealth.level * 200);
    baseHealth = maxBaseHealth;
    
    // Reset ammo
    WEAPONS.forEach(w => {
        ammo[w.id] = w.magazine;
    });
    
    // Clear pools
    pools.enemies.forEach(e => e.reset());
    pools.bullets.forEach(b => b.reset());
    pools.particles.forEach(p => p.reset());
    
    if (animManager) animManager.clear();
    
    gameRunning = true;
    gamePaused = false;
    endlessMode = true;
    
    updateBaseHealth();
    updateWeaponUI();
    
    setTimeout(startWave, 1000);
}

function startEndless() {
    showEndless();
}

console.log('GAME.JS LOADED');
