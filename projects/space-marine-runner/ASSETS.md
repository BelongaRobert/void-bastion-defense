# Void Bastion Defense - Asset Sources Guide

## Recommended Free Asset Sources

### 1. Kenney.nl (CC0 - Completely Free)
The gold standard for free game assets. All assets are CC0 (public domain) - no attribution required, use for any purpose.

**Recommended Packs:**
- **Space Kit**: https://kenney.nl/assets/space-kit
  - Spaceships, turrets, satellites, space stations
  - Perfect for player ships and defensive structures
- **Weapon Pack**: https://kenney.nl/assets/weapon-pack
  - Futuristic guns, rifles, projectiles
  - Great for marine weapons and turrets
- **Particle Pack**: https://kenney.nl/assets/particle-pack
  - Explosions, fire, smoke, magic effects
  - Ideal for bullet impacts and explosions
- **UI Pack**: https://kenney.nl/assets/ui-pack
  - Buttons, panels, icons, health bars
  - Complete UI solution
- **Space Shooter Extension**: https://kenney.nl/assets/space-shooter-extension
  - Additional ships and enemies
- **Space Shooter Redux**: https://kenney.nl/assets/space-shooter-redux
  - Classic space shooter sprites

**License**: CC0 (no attribution required)

### 2. OpenGameArt.org
Community-driven asset repository with various licenses.

**How to Search:**
- Keywords: "sci-fi", "space", "soldier", "enemy", "alien", "cyberpunk"
- Filter: CC0 or CC-BY licenses
- Sort by: "Most votes" for quality

**Recommended Collections:**
- Search "LPC" (Liberated Pixel Cup) for base characters
- Filter by "2D" and "Pixel Art"
- Check individual file licenses carefully

**License**: Varies (CC0, CC-BY, CC-BY-SA, GPL, etc.) - always check!

### 3. itch.io
Indie game marketplace with free asset sections.

**Direct Links:**
- Free Assets: https://itch.io/game-assets/free
- Filter by "Pixel Art" or "Sprites"
- Sort by "Most popular"

**Tips:**
- Many creators offer free versions of paid packs
- Check licenses carefully - varies by creator
- Great for unique, stylized assets

### 4. Craftpix.net (Free Section)
Professional-quality free assets.

**Freebies Page:** https://craftpix.net/freebies/

**Recommended:**
- Character sprite packs
- UI kits
- Some free 2D game kits

**License**: Varies (check individual asset pages)

### 5. Other Notable Sources

**Game-icons.net**
- https://game-icons.net/
- SVG icons perfect for UI and abilities
- CC BY license (attribution required)

**Unity Asset Store (Free Section)**
- https://assetstore.unity.com/
- Search with Price filter: Free
- Can use in other engines too

**Unreal Marketplace (Free Section)**
- https://www.unrealengine.com/marketplace/
- Monthly free assets
- Can export for use elsewhere

---

## How to Add Assets to Void Bastion Defense

### Step 1: Download Asset Pack
1. Download your chosen asset pack
2. Extract to a temporary location
3. Review the files and organization

### Step 2: Organize Files
Place assets in the appropriate folders:

```
assets/
├── sprites/
│   ├── player/           # Marine, ship sprites
│   │   ├── idle.png
│   │   ├── run.png
│   │   └── shoot.png
│   ├── enemies/          # Tyranid, Ork, Chaos sprites
│   │   ├── tyranid-grunt.png
│   │   ├── tyranid-warrior.png
│   │   └── ork-boy.png
│   ├── weapons/          # Guns, turrets, projectiles
│   │   ├── bolter.png
│   │   ├── heavy-bolter.png
│   │   └── plasma-gun.png
│   └── effects/          # Muzzle flash, explosions, blood
│       ├── muzzle-flash.png
│       ├── explosion.png
│       └── blood-splatter.png
├── audio/                # Sound effects and music
└── fonts/                # Custom fonts
```

### Step 3: Update Sprite Loader
Edit `js/sprite-loader.js` to load new assets:

```javascript
const assets = {
  player: {
    idle: loadSprite('assets/sprites/player/idle.png'),
    run: loadSpriteSheet('assets/sprites/player/run.png', 64, 64, 8),
    shoot: loadSpriteSheet('assets/sprites/player/shoot.png', 64, 64, 4)
  },
  enemies: {
    tyranidGrunt: loadSpriteSheet('assets/sprites/enemies/tyranid-grunt.png', 32, 32, 6),
    orkBoy: loadSpriteSheet('assets/sprites/enemies/ork-boy.png', 48, 48, 8)
  }
};
```

### Step 4: Configure Animation Frames
Update `js/animated-sprite.js` or create animation definitions:

```javascript
const animations = {
  player: {
    idle: { frames: [0], speed: 0.1 },
    run: { frames: [0,1,2,3,4,5,6,7], speed: 0.1 },
    shoot: { frames: [0,1,2,3], speed: 0.05, loop: false }
  }
};
```

### Step 5: Test on Mobile
1. Test on target device
2. Check loading times
3. Verify animations play smoothly
4. Ensure touch controls work with new sprites

---

## Current Placeholder System

Until real assets are added, the game uses canvas-generated placeholders:

- **Player**: Green triangle representing a space marine
- **Enemies**: 
  - Red circles (Tyranid swarm)
  - Purple hexagons (Chaos marines)
  - Orange squares (Ork boyz)
- **Effects**: Simple colored particles
- **Weapons**: Geometric shapes

Replace these by updating the sprite paths in the loader.

---

## Asset Naming Conventions

Follow these conventions for consistency:

**Files:**
- lowercase-with-hyphens.png
- Use descriptive names: `tyranid-warrior-idle.png`
- Include animation type: `-idle`, `-walk`, `-attack`, `-death`

**Sprite Sheets:**
- Include dimensions in filename: `marine-run-64x64.png`
- Document frame count in code

**Folders:**
- Group by entity type, then by specific unit

---

## Performance Tips

1. **Sprite Sheets**: Combine multiple frames into one file
2. **Power of 2**: Use dimensions like 32, 64, 128, 256
3. **PNG Format**: Use for sprites (transparency support)
4. **Compress**: Run through PNG optimizers like TinyPNG
5. **Lazy Loading**: Load assets only when needed

---

## Legal Notes

- **CC0**: Do whatever you want, no attribution needed
- **CC-BY**: Must give credit (add to credits screen)
- **CC-BY-SA**: Credit + share derivatives under same license
- **Proprietary**: Check license terms carefully

**Always keep license files with your assets!**

---

*For the Emperor! May your assets be plentiful and your frame rates high.* ⚔️🐙
