# Effect Sprites

Place visual effect sprites here.

## Effect Types

### Muzzle Flashes
```
├── muzzle-flash-small.png     # 16x16, 4 frames
├── muzzle-flash-medium.png    # 24x24, 4 frames
└── muzzle-flash-large.png     # 32x32, 6 frames
```

### Explosions
```
├── explosion-small.png        # 32x32, 8 frames
├── explosion-medium.png       # 64x64, 10 frames
└── explosion-large.png        # 96x96, 12 frames
```

### Blood/Gore
```
├── blood-splatter-small.png   # 24x24, 4 variants
├── blood-splatter-medium.png  # 32x32, 4 variants
└── blood-pool.png             # 48x48, 1 frame
```

### Magic/Energy
```
├── warp-energy.png            # 32x32, 8 frames
├── warp-portal.png            # 64x64, 12 frames
└── energy-shield.png          # 48x48, 6 frames
```

### Environmental
```
├── smoke.png                  # 32x32, 8 frames
├── fire.png                   # 32x32, 8 frames
└── sparks.png                 # 16x16, 6 frames
```

## Frame Guidelines:

### Muzzle Flash
- Quick flash (4-6 frames)
- Starts bright, fades out
- Yellow/orange to transparent

### Explosion
- Expanding fireball (8-12 frames)
- Adds debris/sparks at end
- Orange/red core, smoke edges

### Blood
- Random splatter patterns
- Multiple variants for variety
- Dark red with some variation

## Recommended Sources:

1. **Kenney.nl/particle-pack** - Explosions, fire, smoke
2. **OpenGameArt.org** - "explosion", "blood", "effect"
3. **itch.io** - VFX sprite packs

## Optimization Tips:

- Keep frames small (under 64x64 if possible)
- Reuse effects where possible
- Consider using particle systems for small effects
- Test performance on mobile devices

## Placeholders:

The game generates placeholder effects using canvas:
- **Muzzle Flash**: Yellow burst
- **Explosion**: Expanding orange/red circles
- **Blood**: Red splatter shapes
