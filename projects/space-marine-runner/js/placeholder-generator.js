/**
 * Void Bastion Defense - Placeholder Generator
 * Generates simple colored shapes as temporary sprites
 * Run this in browser console or include in build process
 */

const PlaceholderGenerator = {
  /**
   * Create a canvas with placeholder sprite
   */
  createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  },

  /**
   * Generate player placeholder sprite
   * @param {number} width
   * @param {number} height
   * @returns {HTMLCanvasElement}
   */
  generatePlayer(width = 64, height = 64) {
    const canvas = this.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Clear background (transparent)
    ctx.clearRect(0, 0, width, height);
    
    const cx = width / 2;
    const cy = height / 2;
    
    // Marine body - green triangle
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.moveTo(cx, cy - height * 0.4);
    ctx.lineTo(cx + width * 0.3, cy + height * 0.3);
    ctx.lineTo(cx, cy + height * 0.15);
    ctx.lineTo(cx - width * 0.3, cy + height * 0.3);
    ctx.closePath();
    ctx.fill();
    
    // Armor outline
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Helmet circle
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.arc(cx, cy - height * 0.1, width * 0.18, 0, Math.PI * 2);
    ctx.fill();
    
    // Visor
    ctx.fillStyle = '#81c784';
    ctx.fillRect(cx - width * 0.1, cy - height * 0.12, width * 0.2, height * 0.08);
    
    // Backpack/jump pack
    ctx.fillStyle = '#388e3c';
    ctx.fillRect(cx - width * 0.15, cy - height * 0.05, width * 0.1, height * 0.25);
    ctx.fillRect(cx + width * 0.05, cy - height * 0.05, width * 0.1, height * 0.25);
    
    return canvas;
  },

  /**
   * Generate enemy placeholder
   * @param {string} type - 'tyranid', 'ork', 'chaos'
   * @param {number} width
   * @param {number} height
   * @returns {HTMLCanvasElement}
   */
  generateEnemy(type = 'tyranid', width = 32, height = 32) {
    const canvas = this.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, width, height);
    
    const cx = width / 2;
    const cy = height / 2;
    
    switch(type) {
      case 'tyranid':
        // Tyranid - pink/red biological horror with spikes
        ctx.fillStyle = '#e91e63';
        ctx.beginPath();
        ctx.arc(cx, cy, width * 0.35, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner darker circle
        ctx.fillStyle = '#c2185b';
        ctx.beginPath();
        ctx.arc(cx, cy, width * 0.25, 0, Math.PI * 2);
        ctx.fill();
        
        // Spikes
        ctx.fillStyle = '#ad1457';
        for(let i = 0; i < 4; i++) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate((Math.PI / 2) * i);
          ctx.beginPath();
          ctx.moveTo(width * 0.3, 0);
          ctx.lineTo(width * 0.45, -height * 0.1);
          ctx.lineTo(width * 0.45, height * 0.1);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        
        // Eye
        ctx.fillStyle = '#880e4f';
        ctx.beginPath();
        ctx.arc(cx, cy - height * 0.05, width * 0.08, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 'ork':
        // Ork - green brute
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(width * 0.2, height * 0.2, width * 0.6, height * 0.6);
        
        // Head
        ctx.fillStyle = '#81c784';
        ctx.fillRect(width * 0.25, height * 0.1, width * 0.5, height * 0.3);
        
        // Teeth/jaw
        ctx.fillStyle = '#fff';
        for(let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(width * 0.3 + i * width * 0.15, height * 0.6);
          ctx.lineTo(width * 0.35 + i * width * 0.15, height * 0.75);
          ctx.lineTo(width * 0.4 + i * width * 0.15, height * 0.6);
          ctx.fill();
        }
        
        // Eyes
        ctx.fillStyle = '#f44336';
        ctx.fillRect(width * 0.3, height * 0.2, width * 0.1, height * 0.08);
        ctx.fillRect(width * 0.6, height * 0.2, width * 0.1, height * 0.08);
        break;
        
      case 'chaos':
        // Chaos - purple with dark spikes
        ctx.fillStyle = '#7b1fa2';
        ctx.beginPath();
        ctx.moveTo(cx, height * 0.1);
        ctx.lineTo(width * 0.85, cy);
        ctx.lineTo(width * 0.7, height * 0.9);
        ctx.lineTo(width * 0.3, height * 0.9);
        ctx.lineTo(width * 0.15, cy);
        ctx.closePath();
        ctx.fill();
        
        // Inner dark
        ctx.fillStyle = '#4a148c';
        ctx.beginPath();
        ctx.moveTo(cx, height * 0.25);
        ctx.lineTo(width * 0.75, cy);
        ctx.lineTo(cx, height * 0.75);
        ctx.lineTo(width * 0.25, cy);
        ctx.closePath();
        ctx.fill();
        
        // Glowing eye
        ctx.fillStyle = '#e91e63';
        ctx.shadowColor = '#e91e63';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(cx, cy - height * 0.1, width * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        break;
        
      default:
        // Generic red circle
        ctx.fillStyle = '#f44336';
        ctx.beginPath();
        ctx.arc(cx, cy, width * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    return canvas;
  },

  /**
   * Generate weapon sprite
   * @param {string} type - 'bolter', 'heavy', 'plasma'
   * @param {number} width
   * @param {number} height
   * @returns {HTMLCanvasElement}
   */
  generateWeapon(type = 'bolter', width = 48, height = 24) {
    const canvas = this.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, width, height);
    
    switch(type) {
      case 'bolter':
        // Standard bolter - gray rifle
        ctx.fillStyle = '#607d8b';
        ctx.fillRect(width * 0.1, height * 0.3, width * 0.6, height * 0.4);
        // Barrel
        ctx.fillStyle = '#455a64';
        ctx.fillRect(width * 0.7, height * 0.35, width * 0.25, height * 0.3);
        // Stock
        ctx.fillStyle = '#37474f';
        ctx.fillRect(0, height * 0.25, width * 0.15, height * 0.5);
        // Detail lines
        ctx.strokeStyle = '#263238';
        ctx.lineWidth = 1;
        ctx.strokeRect(width * 0.2, height * 0.35, width * 0.4, height * 0.3);
        break;
        
      case 'heavy':
        // Heavy bolter - bigger, bulkier
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(width * 0.1, height * 0.2, width * 0.5, height * 0.6);
        // Large barrel
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(width * 0.6, height * 0.25, width * 0.35, height * 0.5);
        // Ammo box
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(width * 0.15, height * 0.15, width * 0.25, height * 0.25);
        break;
        
      case 'plasma':
        // Plasma gun - glowing blue
        ctx.fillStyle = '#0277bd';
        ctx.fillRect(width * 0.2, height * 0.3, width * 0.5, height * 0.4);
        // Glowing core
        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 8;
        ctx.fillRect(width * 0.4, height * 0.35, width * 0.2, height * 0.3);
        ctx.shadowBlur = 0;
        // Barrel
        ctx.fillStyle = '#01579b';
        ctx.fillRect(width * 0.7, height * 0.35, width * 0.25, height * 0.3);
        break;
    }
    
    return canvas;
  },

  /**
   * Generate bullet/projectile
   * @param {string} type - 'normal', 'plasma', 'heavy'
   * @param {number} size
   * @returns {HTMLCanvasElement}
   */
  generateBullet(type = 'normal', size = 8) {
    const canvas = this.createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, size, size);
    
    const cx = size / 2;
    const cy = size / 2;
    
    switch(type) {
      case 'plasma':
        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 4;
        break;
      case 'heavy':
        ctx.fillStyle = '#ff9800';
        ctx.shadowColor = '#ff9800';
        ctx.shadowBlur = 3;
        break;
      default:
        ctx.fillStyle = '#ffeb3b';
        ctx.shadowColor = '#ffeb3b';
        ctx.shadowBlur = 3;
    }
    
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    return canvas;
  },

  /**
   * Generate explosion frames as sprite sheet
   * @param {number} frameCount
   * @param {number} frameSize
   * @returns {HTMLCanvasElement}
   */
  generateExplosionSheet(frameCount = 8, frameSize = 32) {
    const canvas = this.createCanvas(frameSize * frameCount, frameSize);
    const ctx = canvas.getContext('2d');
    
    for(let frame = 0; frame < frameCount; frame++) {
      const progress = frame / frameCount;
      const x = frame * frameSize;
      const cx = x + frameSize / 2;
      const cy = frameSize / 2;
      const maxRadius = frameSize * 0.45;
      const radius = maxRadius * (0.3 + progress * 0.7);
      
      // Clear frame
      ctx.clearRect(x, 0, frameSize, frameSize);
      
      // Outer fire
      const alpha = 1 - progress * 0.5;
      ctx.fillStyle = `rgba(255, 152, 0, ${alpha})`;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner core
      ctx.fillStyle = `rgba(255, 235, 59, ${alpha + 0.2})`;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
      
      // Debris
      if (frame > 2) {
        ctx.fillStyle = `rgba(96, 96, 96, ${1 - progress})`;
        const debrisCount = 4 + frame;
        for(let i = 0; i < debrisCount; i++) {
          const angle = (Math.PI * 2 / debrisCount) * i + progress;
          const dist = radius * (0.7 + Math.random() * 0.3);
          const dx = cx + Math.cos(angle) * dist;
          const dy = cy + Math.sin(angle) * dist;
          ctx.fillRect(dx - 1, dy - 1, 3, 3);
        }
      }
    }
    
    return canvas;
  },

  /**
   * Generate muzzle flash
   * @param {number} frameCount
   * @param {number} frameSize
   * @returns {HTMLCanvasElement}
   */
  generateMuzzleFlash(frameCount = 4, frameSize = 16) {
    const canvas = this.createCanvas(frameSize * frameCount, frameSize);
    const ctx = canvas.getContext('2d');
    
    for(let frame = 0; frame < frameCount; frame++) {
      const x = frame * frameSize;
      const cx = x + frameSize / 2;
      const cy = frameSize / 2;
      
      ctx.clearRect(x, 0, frameSize, frameSize);
      
      // Flash shape
      const size = frameSize * (0.8 - frame * 0.15);
      
      ctx.fillStyle = '#ffeb3b';
      ctx.shadowColor = '#ff9800';
      ctx.shadowBlur = 8 - frame * 2;
      
      // Star burst
      ctx.beginPath();
      for(let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        const r = i % 2 === 0 ? size / 2 : size / 4;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Center glow
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    return canvas;
  },

  /**
   * Download canvas as PNG
   * @param {HTMLCanvasElement} canvas
   * @param {string} filename
   */
  download(canvas, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  },

  /**
   * Generate all placeholders and offer downloads
   * Run this in browser console to generate placeholder images
   */
  generateAll() {
    const sprites = [
      { name: 'player-marine.png', generator: () => this.generatePlayer(64, 64) },
      { name: 'enemy-tyranid.png', generator: () => this.generateEnemy('tyranid', 32, 32) },
      { name: 'enemy-ork.png', generator: () => this.generateEnemy('ork', 40, 40) },
      { name: 'enemy-chaos.png', generator: () => this.generateEnemy('chaos', 48, 48) },
      { name: 'weapon-bolter.png', generator: () => this.generateWeapon('bolter', 48, 24) },
      { name: 'weapon-heavy.png', generator: () => this.generateWeapon('heavy', 48, 24) },
      { name: 'weapon-plasma.png', generator: () => this.generateWeapon('plasma', 48, 24) },
      { name: 'bullet-normal.png', generator: () => this.generateBullet('normal', 8) },
      { name: 'bullet-plasma.png', generator: () => this.generateBullet('plasma', 12) },
      { name: 'effect-explosion.png', generator: () => this.generateExplosionSheet(8, 32) },
      { name: 'effect-muzzle.png', generator: () => this.generateMuzzleFlash(4, 16) }
    ];
    
    sprites.forEach((sprite, index) => {
      setTimeout(() => {
        const canvas = sprite.generator();
        this.download(canvas, sprite.name);
        console.log(`Generated: ${sprite.name}`);
      }, index * 100);
    });
    
    console.log('Generating all placeholder sprites...');
  }
};

// Auto-generate if run in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PlaceholderGenerator;
}

// Console helper
console.log('PlaceholderGenerator loaded. Run PlaceholderGenerator.generateAll() to download sprites.');
