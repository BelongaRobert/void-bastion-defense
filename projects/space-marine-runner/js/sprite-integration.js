/**
 * Void Bastion Defense - Sprite Integration
 * Shows how to integrate the sprite system into the main game
 * 
 * Include these files in your HTML:
 * <script src="js/sprite-loader.js"></script>
 * <script src="js/animated-sprite.js"></script>
 * <script src="js/sprite-integration.js"></script>
 */

/**
 * Game Sprite Controller - manages all in-game sprites
 */
const GameSprites = {
  // Animation manager for effects
  animations: new AnimationManager(),
  
  // Player reference
  player: null,
  
  // Enemy sprite pools
  enemies: new Map(),
  
  // Effect pools
  effects: [],
  
  /**
   * Initialize the sprite system
   */
  async init() {
    console.log('Initializing sprite system...');
    
    // Initialize asset manager
    await AssetManager.init();
    
    // Create player animation
    this.createPlayerAnimations();
    
    console.log('Sprite system ready');
  },
  
  /**
   * Create player animations
   */
  createPlayerAnimations() {
    const config = AnimationConfigs.player;
    
    // Try to load real sprites first
    if (!AssetManager.usingPlaceholders) {
      this.player = {
        idle: AnimatedSprite.fromAsset('player', 'idle', config.idle),
        run: AnimatedSprite.fromAsset('player', 'run', config.run),
        shoot: AnimatedSprite.fromAsset('player', 'shoot', config.shoot),
        current: 'idle'
      };
    } else {
      // Use placeholders
      this.player = {
        idle: this.createPlaceholderAnimation('player', config.idle),
        run: this.createPlaceholderAnimation('player', config.run),
        shoot: this.createPlaceholderAnimation('player', config.shoot),
        current: 'idle'
      };
    }
    
    // Register with animation manager
    this.animations.register('player', this.player.idle);
  },
  
  /**
   * Create a placeholder-based animation
   */
  createPlaceholderAnimation(type, config) {
    // Create a dummy canvas for the animation
    const canvas = document.createElement('canvas');
    canvas.width = config.frameWidth;
    canvas.height = config.frameHeight;
    
    return new AnimatedSprite(canvas, config.frameWidth, config.frameHeight, 
      config.frameCount, 1 / config.fps);
  },
  
  /**
   * Create enemy sprite
   * @param {string} enemyType - 'tyranidGrunt', 'orkBoy', etc.
   * @param {string} id - Unique enemy ID
   */
  createEnemy(enemyType, id) {
    const configs = AnimationConfigs.enemies;
    let config, placeholderType;
    
    switch(enemyType) {
      case 'tyranidGrunt':
        config = configs.tyranidGrunt;
        placeholderType = 'tyranid';
        break;
      case 'orkBoy':
        config = configs.orkBoy;
        placeholderType = 'ork';
        break;
      case 'chaosMarine':
        config = configs.tyranidWarrior; // Similar size
        placeholderType = 'chaos';
        break;
      default:
        config = configs.tyranidGrunt;
        placeholderType = 'tyranid';
    }
    
    const enemy = {
      type: enemyType,
      placeholderType: placeholderType,
      idle: AssetManager.usingPlaceholders 
        ? this.createPlaceholderAnimation(placeholderType, config.idle)
        : AnimatedSprite.fromAsset('enemy', enemyType, config.idle),
      walk: AssetManager.usingPlaceholders
        ? this.createPlaceholderAnimation(placeholderType, config.walk)
        : AnimatedSprite.fromAsset('enemy', enemyType, config.walk),
      attack: AssetManager.usingPlaceholders
        ? this.createPlaceholderAnimation(placeholderType, config.attack)
        : AnimatedSprite.fromAsset('enemy', enemyType, config.attack),
      death: AssetManager.usingPlaceholders
        ? this.createPlaceholderAnimation(placeholderType, config.death)
        : AnimatedSprite.fromAsset('enemy', enemyType, config.death),
      current: 'idle'
    };
    
    this.enemies.set(id, enemy);
    return enemy;
  },
  
  /**
   * Update all animations
   * @param {number} deltaTime - Time in seconds
   */
  update(deltaTime) {
    this.animations.update(deltaTime);
    
    // Update player animation
    if (this.player[this.player.current]) {
      this.player[this.player.current].update(deltaTime);
    }
    
    // Update all enemies
    for (const enemy of this.enemies.values()) {
      if (enemy[enemy.current]) {
        enemy[enemy.current].update(deltaTime);
      }
    }
  },
  
  /**
   * Draw player
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {Object} options
   */
  drawPlayer(ctx, x, y, options = {}) {
    const anim = this.player[this.player.current];
    
    if (AssetManager.usingPlaceholders) {
      // Draw placeholder
      PlaceholderSprites.drawPlayer(ctx, x, y, 
        options.width || 64, 
        options.height || 64,
        options.rotation || 0
      );
    } else if (anim) {
      // Draw real sprite
      anim.draw(ctx, x, y, options);
    }
  },
  
  /**
   * Draw enemy
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} id - Enemy ID
   * @param {number} x
   * @param {number} y
   * @param {Object} options
   */
  drawEnemy(ctx, id, x, y, options = {}) {
    const enemy = this.enemies.get(id);
    if (!enemy) return;
    
    const anim = enemy[enemy.current];
    
    if (AssetManager.usingPlaceholders) {
      PlaceholderSprites.drawEnemy(ctx, x, y,
        options.width || 32,
        options.height || 32,
        enemy.placeholderType
      );
    } else if (anim) {
      anim.draw(ctx, x, y, options);
    }
  },
  
  /**
   * Draw bullet
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {string} type - 'normal', 'plasma', 'heavy'
   */
  drawBullet(ctx, x, y, type = 'normal') {
    const size = type === 'plasma' ? 12 : (type === 'heavy' ? 10 : 8);
    PlaceholderSprites.drawBullet(ctx, x, y, size, size * 0.5, type);
  },
  
  /**
   * Play effect at position
   * @param {string} effectType - 'muzzleFlash', 'explosion', 'blood'
   * @param {number} x
   * @param {number} y
   */
  playEffect(effectType, x, y) {
    this.animations.playEffect(effectType, x, y);
  },
  
  /**
   * Draw all active effects
   * @param {CanvasRenderingContext2D} ctx
   */
  drawEffects(ctx) {
    this.animations.drawEffects(ctx);
  },
  
  /**
   * Set player animation state
   * @param {string} state - 'idle', 'run', 'shoot'
   */
  setPlayerState(state) {
    if (this.player[state] && this.player.current !== state) {
      this.player.current = state;
      this.player[state].reset();
      this.player[state].play();
      this.animations.register('player', this.player[state]);
    }
  },
  
  /**
   * Set enemy animation state
   * @param {string} id - Enemy ID
   * @param {string} state - 'idle', 'walk', 'attack', 'death'
   */
  setEnemyState(id, state) {
    const enemy = this.enemies.get(id);
    if (enemy && enemy[state] && enemy.current !== state) {
      enemy.current = state;
      enemy[state].reset();
      enemy[state].play();
    }
  },
  
  /**
   * Remove enemy
   * @param {string} id
   */
  removeEnemy(id) {
    this.enemies.delete(id);
  },
  
  /**
   * Clean up all sprites
   */
  cleanup() {
    this.animations.clear();
    this.enemies.clear();
    this.player = null;
  }
};

/**
 * Example usage in game loop:
 * 
 * // Initialize
 * await GameSprites.init();
 * 
 * // Create enemies
 * GameSprites.createEnemy('tyranidGrunt', 'enemy1');
 * GameSprites.createEnemy('orkBoy', 'enemy2');
 * 
 * // Game loop
 * function gameLoop(deltaTime) {
 *   // Update animations
 *   GameSprites.update(deltaTime);
 *   
 *   // Draw everything
 *   GameSprites.drawPlayer(ctx, player.x, player.y, {
 *     width: 64, height: 64, rotation: player.angle
 *   });
 *   
 *   enemies.forEach(enemy => {
 *     GameSprites.drawEnemy(ctx, enemy.id, enemy.x, enemy.y, {
 *       width: enemy.width, height: enemy.height, flipX: enemy.facingLeft
 *     });
 *   });
 *   
 *   // Draw effects on top
 *   GameSprites.drawEffects(ctx);
 * }
 * 
 * // Handle state changes
 * player.onMove = () => GameSprites.setPlayerState('run');
 * player.onStop = () => GameSprites.setPlayerState('idle');
 * player.onShoot = () => {
 *   GameSprites.setPlayerState('shoot');
 *   GameSprites.playEffect('muzzleFlash', player.x + 30, player.y + 10);
 * };
 */

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameSprites;
}
