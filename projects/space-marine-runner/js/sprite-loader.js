/**
 * Void Bastion Defense - Sprite Loader
 * Handles loading and caching of sprite assets
 * Falls back to placeholder graphics if assets not found
 */

// Asset cache
const assetCache = new Map();

/**
 * Load a single sprite image
 * @param {string} path - Path to image file
 * @returns {Promise<HTMLImageElement>}
 */
function loadSprite(path) {
  return new Promise((resolve, reject) => {
    // Check cache first
    if (assetCache.has(path)) {
      resolve(assetCache.get(path));
      return;
    }

    const img = new Image();
    img.onload = () => {
      assetCache.set(path, img);
      resolve(img);
    };
    img.onerror = () => {
      console.warn(`Failed to load sprite: ${path}`);
      reject(new Error(`Failed to load: ${path}`));
    };
    img.src = path;
  });
}

/**
 * Load a sprite sheet (multiple frames in one image)
 * @param {string} path - Path to sprite sheet
 * @param {number} frameWidth - Width of each frame
 * @param {number} frameHeight - Height of each frame
 * @returns {Promise<SpriteSheet>}
 */
function loadSpriteSheet(path, frameWidth, frameHeight) {
  return new Promise((resolve, reject) => {
    const cacheKey = `${path}@${frameWidth}x${frameHeight}`;
    
    if (assetCache.has(cacheKey)) {
      resolve(assetCache.get(cacheKey));
      return;
    }

    const img = new Image();
    img.onload = () => {
      const sheet = new SpriteSheet(img, frameWidth, frameHeight);
      assetCache.set(cacheKey, sheet);
      resolve(sheet);
    };
    img.onerror = () => {
      console.warn(`Failed to load sprite sheet: ${path}`);
      reject(new Error(`Failed to load: ${path}`));
    };
    img.src = path;
  });
}

/**
 * Sprite Sheet class - manages multiple animation frames
 */
class SpriteSheet {
  constructor(image, frameWidth, frameHeight) {
    this.image = image;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.framesPerRow = Math.floor(image.width / frameWidth);
    this.totalFrames = Math.floor(image.width / frameWidth) * Math.floor(image.height / frameHeight);
  }

  /**
   * Get frame coordinates for a specific frame index
   * @param {number} frameIndex - Frame number
   * @returns {Object} {x, y, width, height}
   */
  getFrame(frameIndex) {
    const row = Math.floor(frameIndex / this.framesPerRow);
    const col = frameIndex % this.framesPerRow;
    return {
      x: col * this.frameWidth,
      y: row * this.frameHeight,
      width: this.frameWidth,
      height: this.frameHeight
    };
  }

  /**
   * Draw a specific frame to canvas
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} frameIndex
   * @param {number} x
   * @param {number} y
   * @param {number} width - Optional target width
   * @param {number} height - Optional target height
   */
  drawFrame(ctx, frameIndex, x, y, width = null, height = null) {
    const frame = this.getFrame(frameIndex);
    const targetWidth = width || this.frameWidth;
    const targetHeight = height || this.frameHeight;
    
    ctx.drawImage(
      this.image,
      frame.x, frame.y, frame.width, frame.height,
      x, y, targetWidth, targetHeight
    );
  }
}

/**
 * Asset manager - central place for all game assets
 */
const AssetManager = {
  // Placeholder flags - set to false when real assets are loaded
  usingPlaceholders: true,

  // Asset collections
  player: {
    sprite: null,
    run: null,
    idle: null,
    shoot: null
  },
  
  enemies: {
    tyranidGrunt: null,
    tyranidWarrior: null,
    orkBoy: null,
    chaosMarine: null
  },
  
  weapons: {
    bolter: null,
    heavyBolter: null,
    plasmaGun: null,
    meltaGun: null
  },
  
  effects: {
    muzzleFlash: null,
    explosion: null,
    bloodSplatter: null,
    bullet: null
  },

  /**
   * Initialize all assets
   * @returns {Promise<void>}
   */
  async init() {
    try {
      // Try to load real assets
      await this.loadRealAssets();
      this.usingPlaceholders = false;
      console.log('✓ Real assets loaded successfully');
    } catch (error) {
      console.log('⚠ Using placeholder sprites - add real assets to assets/ folder');
      this.usingPlaceholders = true;
    }
  },

  /**
   * Attempt to load real asset files
   */
  async loadRealAssets() {
    // Player assets
    this.player.sprite = await loadSprite('assets/sprites/player/marine.png');
    this.player.run = await loadSpriteSheet('assets/sprites/player/run.png', 64, 64);
    this.player.idle = await loadSpriteSheet('assets/sprites/player/idle.png', 64, 64);
    this.player.shoot = await loadSpriteSheet('assets/sprites/player/shoot.png', 64, 64);

    // Enemy assets
    this.enemies.tyranidGrunt = await loadSpriteSheet('assets/sprites/enemies/tyranid-grunt.png', 32, 32);
    this.enemies.tyranidWarrior = await loadSpriteSheet('assets/sprites/enemies/tyranid-warrior.png', 48, 48);
    this.enemies.orkBoy = await loadSpriteSheet('assets/sprites/enemies/ork-boy.png', 40, 40);
    this.enemies.chaosMarine = await loadSpriteSheet('assets/sprites/enemies/chaos-marine.png', 48, 48);

    // Weapon assets
    this.weapons.bolter = await loadSprite('assets/sprites/weapons/bolter.png');
    this.weapons.heavyBolter = await loadSprite('assets/sprites/weapons/heavy-bolter.png');
    this.weapons.plasmaGun = await loadSprite('assets/sprites/weapons/plasma-gun.png');

    // Effect assets
    this.effects.muzzleFlash = await loadSpriteSheet('assets/sprites/effects/muzzle-flash.png', 16, 16);
    this.effects.explosion = await loadSpriteSheet('assets/sprites/effects/explosion.png', 32, 32);
    this.effects.bloodSplatter = await loadSpriteSheet('assets/sprites/effects/blood.png', 24, 24);
  },

  /**
   * Get player sprite (real or placeholder)
   */
  getPlayerSprite() {
    if (!this.usingPlaceholders && this.player.sprite) {
      return this.player.sprite;
    }
    return null; // Will trigger placeholder drawing
  },

  /**
   * Get enemy sprite by type
   * @param {string} type - Enemy type
   */
  getEnemySprite(type) {
    if (!this.usingPlaceholders && this.enemies[type]) {
      return this.enemies[type];
    }
    return null;
  },

  /**
   * Get weapon sprite
   * @param {string} type - Weapon type
   */
  getWeaponSprite(type) {
    if (!this.usingPlaceholders && this.weapons[type]) {
      return this.weapons[type];
    }
    return null;
  }
};

/**
 * Draw a placeholder sprite using canvas
 * Use these until real assets are available
 */
const PlaceholderSprites = {
  /**
   * Draw player placeholder (green triangle/marine shape)
   */
  drawPlayer(ctx, x, y, width, height, angle = 0) {
    ctx.save();
    ctx.translate(x + width/2, y + height/2);
    ctx.rotate(angle);
    
    // Marine body
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.moveTo(0, -height/2);
    ctx.lineTo(width/2, height/2);
    ctx.lineTo(0, height/4);
    ctx.lineTo(-width/2, height/2);
    ctx.closePath();
    ctx.fill();
    
    // Armor details
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Helmet
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.arc(0, -height/4, width/4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  },

  /**
   * Draw enemy placeholder
   * @param {string} type - 'tyranid', 'ork', 'chaos'
   */
  drawEnemy(ctx, x, y, width, height, type = 'tyranid') {
    ctx.save();
    ctx.translate(x + width/2, y + height/2);
    
    switch(type) {
      case 'tyranid':
        // Tyranid - biological horror, red/pink
        ctx.fillStyle = '#e91e63';
        ctx.beginPath();
        ctx.arc(0, 0, width/2, 0, Math.PI * 2);
        ctx.fill();
        // Spikes/details
        ctx.fillStyle = '#c2185b';
        for(let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI/2);
          ctx.beginPath();
          ctx.moveTo(width/3, 0);
          ctx.lineTo(width/2, -height/6);
          ctx.lineTo(width/3, height/6);
          ctx.fill();
        }
        break;
        
      case 'ork':
        // Ork - green brute
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(-width/2, -height/2, width, height);
        // Jaw/teeth
        ctx.fillStyle = '#81c784';
        ctx.fillRect(-width/3, height/4, width*2/3, height/4);
        break;
        
      case 'chaos':
        // Chaos - dark with spikes
        ctx.fillStyle = '#7b1fa2';
        ctx.beginPath();
        ctx.moveTo(0, -height/2);
        ctx.lineTo(width/2, height/4);
        ctx.lineTo(width/4, height/2);
        ctx.lineTo(-width/4, height/2);
        ctx.lineTo(-width/2, height/4);
        ctx.closePath();
        ctx.fill();
        break;
    }
    
    ctx.restore();
  },

  /**
   * Draw bullet/projectile
   */
  drawBullet(ctx, x, y, width, height, type = 'normal') {
    ctx.save();
    
    switch(type) {
      case 'plasma':
        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 10;
        break;
      case 'heavy':
        ctx.fillStyle = '#ff9800';
        break;
      default:
        ctx.fillStyle = '#ffeb3b';
        ctx.shadowColor = '#ffeb3b';
        ctx.shadowBlur = 5;
    }
    
    ctx.beginPath();
    ctx.ellipse(x, y, width/2, height/2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  /**
   * Draw muzzle flash effect
   */
  drawMuzzleFlash(ctx, x, y, size) {
    ctx.save();
    ctx.fillStyle = '#ffeb3b';
    ctx.shadowColor = '#ff9800';
    ctx.shadowBlur = 15;
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    
    // Flash rays
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    for(let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(size, 0);
      ctx.lineTo(size * 2, 0);
      ctx.stroke();
    }
    ctx.restore();
  },

  /**
   * Draw explosion effect
   * @param {number} progress - 0 to 1 animation progress
   */
  drawExplosion(ctx, x, y, maxRadius, progress) {
    ctx.save();
    ctx.translate(x, y);
    
    const radius = maxRadius * progress;
    const alpha = 1 - progress;
    
    // Outer fire
    ctx.fillStyle = `rgba(255, 152, 0, ${alpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner core
    ctx.fillStyle = `rgba(255, 235, 59, ${alpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    // Debris particles
    ctx.fillStyle = `rgba(96, 96, 96, ${alpha})`;
    for(let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      const px = radius * 0.8;
      const py = (Math.random() - 0.5) * radius * 0.3;
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }
    
    ctx.restore();
  },

  /**
   * Draw blood splatter
   */
  drawBlood(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.random() * Math.PI);
    
    ctx.fillStyle = '#b71c1c';
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    
    // Splatters
    for(let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 / 5) * i + Math.random() * 0.5;
      const dist = size * (0.8 + Math.random() * 0.4);
      const splatSize = size * 0.3;
      
      ctx.beginPath();
      ctx.arc(
        Math.cos(angle) * dist,
        Math.sin(angle) * dist,
        splatSize, 0, Math.PI * 2
      );
      ctx.fill();
    }
    
    ctx.restore();
  }
};

// Export for use in game
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loadSprite, loadSpriteSheet, SpriteSheet, AssetManager, PlaceholderSprites };
}
