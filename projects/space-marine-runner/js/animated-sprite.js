/**
 * Void Bastion Defense - Animated Sprite System
 * Handles frame-based animations with sprite sheets
 */

/**
 * AnimatedSprite class - manages animation playback
 */
class AnimatedSprite {
  /**
   * @param {SpriteSheet|HTMLImageElement} image - Sprite sheet or single image
   * @param {number} frameWidth - Width of each frame
   * @param {number} frameHeight - Height of each frame
   * @param {number} frameCount - Total frames in animation
   * @param {number} frameDuration - Seconds per frame (default: 0.1)
   */
  constructor(image, frameWidth, frameHeight, frameCount, frameDuration = 0.1) {
    this.image = image;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.frameCount = frameCount;
    this.frameDuration = frameDuration;
    
    // Animation state
    this.currentFrame = 0;
    this.elapsedTime = 0;
    this.isPlaying = true;
    this.isLooping = true;
    this.isFinished = false;
    
    // If using a sprite sheet, extract frames
    this.isSpriteSheet = image instanceof SpriteSheet;
    if (!this.isSpriteSheet && frameCount > 1) {
      // Create a sprite sheet from the image
      this.spriteSheet = new SpriteSheet(image, frameWidth, frameHeight);
    } else {
      this.spriteSheet = image;
    }
    
    // Optional: Animation callbacks
    this.onComplete = null;
    this.onFrameChange = null;
  }
  
  /**
   * Create from a loaded asset
   * @param {string} assetType - 'player', 'enemy', 'effect'
   * @param {string} assetName - Specific asset identifier
   * @param {Object} config - Animation configuration
   */
  static fromAsset(assetType, assetName, config = {}) {
    let asset = null;
    
    switch(assetType) {
      case 'player':
        asset = AssetManager.player[assetName];
        break;
      case 'enemy':
        asset = AssetManager.enemies[assetName];
        break;
      case 'weapon':
        asset = AssetManager.weapons[assetName];
        break;
      case 'effect':
        asset = AssetManager.effects[assetName];
        break;
    }
    
    if (!asset) {
      console.warn(`Asset not found: ${assetType}.${assetName}`);
      return null;
    }
    
    return new AnimatedSprite(
      asset,
      config.frameWidth || 32,
      config.frameHeight || 32,
      config.frameCount || 1,
      config.frameDuration || 0.1
    );
  }
  
  /**
   * Update animation frame
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    if (!this.isPlaying || this.isFinished) return;
    
    this.elapsedTime += deltaTime;
    
    if (this.elapsedTime >= this.frameDuration) {
      this.elapsedTime = 0;
      const previousFrame = this.currentFrame;
      this.currentFrame++;
      
      if (this.currentFrame >= this.frameCount) {
        if (this.isLooping) {
          this.currentFrame = 0;
        } else {
          this.currentFrame = this.frameCount - 1;
          this.isFinished = true;
          if (this.onComplete) {
            this.onComplete();
          }
        }
      }
      
      if (this.onFrameChange && previousFrame !== this.currentFrame) {
        this.onFrameChange(this.currentFrame);
      }
    }
  }
  
  /**
   * Draw current frame
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {Object} options - Drawing options
   */
  draw(ctx, x, y, options = {}) {
    const {
      width = this.frameWidth,
      height = this.frameHeight,
      flipX = false,
      flipY = false,
      rotation = 0,
      alpha = 1.0,
      scale = 1.0
    } = options;
    
    ctx.save();
    
    // Apply transformations
    ctx.globalAlpha = alpha;
    
    if (flipX || flipY || rotation !== 0 || scale !== 1) {
      ctx.translate(x + width/2, y + height/2);
      ctx.rotate(rotation);
      ctx.scale(
        flipX ? -scale : scale,
        flipY ? -scale : scale
      );
      ctx.translate(-width/2, -height/2);
    }
    
    if (this.isSpriteSheet && this.spriteSheet) {
      this.spriteSheet.drawFrame(ctx, this.currentFrame, 
        flipX || flipY || rotation !== 0 ? 0 : x,
        flipX || flipY || rotation !== 0 ? 0 : y,
        width, height
      );
    } else {
      // Single image
      ctx.drawImage(this.image, 
        flipX || flipY || rotation !== 0 ? 0 : x,
        flipX || flipY || rotation !== 0 ? 0 : y,
        width, height
      );
    }
    
    ctx.restore();
  }
  
  /**
   * Draw using placeholder if no sprite loaded
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {string} placeholderType - Type of placeholder to draw
   */
  drawPlaceholder(ctx, x, y, placeholderType, options = {}) {
    const { width = this.frameWidth, height = this.frameHeight } = options;
    
    switch(placeholderType) {
      case 'player':
        PlaceholderSprites.drawPlayer(ctx, x, y, width, height, options.rotation || 0);
        break;
      case 'tyranid':
      case 'ork':
      case 'chaos':
        PlaceholderSprites.drawEnemy(ctx, x, y, width, height, placeholderType);
        break;
      case 'bullet':
        PlaceholderSprites.drawBullet(ctx, x + width/2, y + height/2, width, height, options.bulletType);
        break;
      case 'muzzleFlash':
        PlaceholderSprites.drawMuzzleFlash(ctx, x + width/2, y + height/2, width/2);
        break;
      case 'explosion':
        PlaceholderSprites.drawExplosion(ctx, x + width/2, y + height/2, width, this.currentFrame / this.frameCount);
        break;
      case 'blood':
        PlaceholderSprites.drawBlood(ctx, x + width/2, y + height/2, width/2);
        break;
      default:
        // Generic rectangle
        ctx.fillStyle = '#666';
        ctx.fillRect(x, y, width, height);
    }
  }
  
  /**
   * Play the animation
   */
  play() {
    this.isPlaying = true;
    this.isFinished = false;
  }
  
  /**
   * Pause the animation
   */
  pause() {
    this.isPlaying = false;
  }
  
  /**
   * Stop and reset to first frame
   */
  stop() {
    this.isPlaying = false;
    this.currentFrame = 0;
    this.elapsedTime = 0;
  }
  
  /**
   * Reset to beginning
   */
  reset() {
    this.currentFrame = 0;
    this.elapsedTime = 0;
    this.isFinished = false;
  }
  
  /**
   * Set specific frame
   * @param {number} frame
   */
  setFrame(frame) {
    this.currentFrame = Math.max(0, Math.min(frame, this.frameCount - 1));
  }
  
  /**
   * Configure looping
   * @param {boolean} loop
   */
  setLoop(loop) {
    this.isLooping = loop;
  }
  
  /**
   * Set animation speed
   * @param {number} fps - Frames per second
   */
  setFPS(fps) {
    this.frameDuration = 1 / fps;
  }
}

/**
 * Animation Manager - manages multiple animated sprites
 */
class AnimationManager {
  constructor() {
    this.animations = new Map();
    this.activeEffects = [];
  }
  
  /**
   * Register an animation
   * @param {string} name - Animation identifier
   * @param {AnimatedSprite} animation
   */
  register(name, animation) {
    this.animations.set(name, animation);
  }
  
  /**
   * Get an animation
   * @param {string} name
   * @returns {AnimatedSprite}
   */
  get(name) {
    return this.animations.get(name);
  }
  
  /**
   * Update all registered animations
   * @param {number} deltaTime
   */
  update(deltaTime) {
    for (const animation of this.animations.values()) {
      animation.update(deltaTime);
    }
    
    // Update active effects
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const effect = this.activeEffects[i];
      effect.update(deltaTime);
      
      if (effect.isFinished) {
        this.activeEffects.splice(i, 1);
      }
    }
  }
  
  /**
   * Play a one-shot effect
   * @param {string} effectType
   * @param {number} x
   * @param {number} y
   * @param {Object} options
   * @returns {AnimatedSprite}
   */
  playEffect(effectType, x, y, options = {}) {
    let animation;
    
    switch(effectType) {
      case 'muzzleFlash':
        animation = AnimatedSprite.fromAsset('effect', 'muzzleFlash', {
          frameWidth: 16, frameHeight: 16, frameCount: 4, frameDuration: 0.05
        });
        break;
      case 'explosion':
        animation = AnimatedSprite.fromAsset('effect', 'explosion', {
          frameWidth: 32, frameHeight: 32, frameCount: 8, frameDuration: 0.08
        });
        break;
      case 'blood':
        animation = AnimatedSprite.fromAsset('effect', 'bloodSplatter', {
          frameWidth: 24, frameHeight: 24, frameCount: 1
        });
        break;
    }
    
    if (animation) {
      animation.setLoop(false);
      animation.play();
      this.activeEffects.push({
        animation,
        x,
        y,
        options
      });
    }
    
    return animation;
  }
  
  /**
   * Draw all active effects
   * @param {CanvasRenderingContext2D} ctx
   */
  drawEffects(ctx) {
    for (const effect of this.activeEffects) {
      if (AssetManager.usingPlaceholders) {
        effect.animation.drawPlaceholder(ctx, effect.x, effect.y, 
          effect.animation.spriteSheet ? 'explosion' : 'blood', 
          effect.options
        );
      } else {
        effect.animation.draw(ctx, effect.x, effect.y, effect.options);
      }
    }
  }
  
  /**
   * Clear all animations
   */
  clear() {
    this.animations.clear();
    this.activeEffects = [];
  }
}

/**
 * Predefined animation configurations
 */
const AnimationConfigs = {
  player: {
    idle: { frameWidth: 64, frameHeight: 64, frameCount: 4, fps: 8 },
    run: { frameWidth: 64, frameHeight: 64, frameCount: 8, fps: 12 },
    shoot: { frameWidth: 64, frameHeight: 64, frameCount: 4, fps: 15, loop: false },
    reload: { frameWidth: 64, frameHeight: 64, frameCount: 6, fps: 10, loop: false },
    death: { frameWidth: 64, frameHeight: 64, frameCount: 8, fps: 8, loop: false }
  },
  
  enemies: {
    tyranidGrunt: {
      idle: { frameWidth: 32, frameHeight: 32, frameCount: 4, fps: 6 },
      walk: { frameWidth: 32, frameHeight: 32, frameCount: 6, fps: 10 },
      attack: { frameWidth: 32, frameHeight: 32, frameCount: 6, fps: 12, loop: false },
      death: { frameWidth: 32, frameHeight: 32, frameCount: 4, fps: 8, loop: false }
    },
    tyranidWarrior: {
      idle: { frameWidth: 48, frameHeight: 48, frameCount: 4, fps: 6 },
      walk: { frameWidth: 48, frameHeight: 48, frameCount: 8, fps: 8 },
      attack: { frameWidth: 48, frameHeight: 48, frameCount: 8, fps: 10, loop: false },
      death: { frameWidth: 48, frameHeight: 48, frameCount: 6, fps: 6, loop: false }
    },
    orkBoy: {
      idle: { frameWidth: 40, frameHeight: 40, frameCount: 4, fps: 5 },
      run: { frameWidth: 40, frameHeight: 40, frameCount: 8, fps: 10 },
      shoot: { frameWidth: 40, frameHeight: 40, frameCount: 6, fps: 12, loop: false },
      death: { frameWidth: 40, frameHeight: 40, frameCount: 6, fps: 8, loop: false }
    }
  },
  
  effects: {
    muzzleFlash: { frameWidth: 16, frameHeight: 16, frameCount: 4, fps: 20, loop: false },
    explosion: { frameWidth: 32, frameHeight: 32, frameCount: 8, fps: 12, loop: false },
    bloodSplatter: { frameWidth: 24, frameHeight: 24, frameCount: 1, fps: 1 },
    plasmaBolt: { frameWidth: 12, frameHeight: 12, frameCount: 4, fps: 15 },
    rocketTrail: { frameWidth: 16, frameHeight: 16, frameCount: 6, fps: 10 }
  }
};

// Export for use in game
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AnimatedSprite, AnimationManager, AnimationConfigs };
}
