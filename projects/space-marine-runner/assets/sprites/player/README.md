# Player Sprites

Place player character sprites here.

## Recommended Structure:

```
player/
├── marine-idle.png       # 64x64, 4 frames
├── marine-run.png        # 64x64, 8 frames (sprite sheet)
├── marine-shoot.png      # 64x64, 4 frames
├── marine-reload.png     # 64x64, 6 frames
└── marine-death.png      # 64x64, 8 frames
```

## Sprite Sheet Layout:

Frames are arranged left to right, top to bottom.
Example for 8-frame animation in 64x64:

```
[Frame 0][Frame 1][Frame 2][Frame 3]
[Frame 4][Frame 5][Frame 6][Frame 7]
```

## Frame Guidelines:

- **Idle**: Marine breathing/shifting weight (4-6 frames)
- **Run**: Full running cycle (6-8 frames)
- **Shoot**: Recoil and recovery (4-6 frames)
- **Reload**: Weapon reload animation (6-10 frames)
- **Death**: Falling/death animation (6-8 frames)

## Recommended Sources:

1. **Kenney.nl** - Free sci-fi character sprites
2. **OpenGameArt.org** - Search "space marine", "soldier"
3. **itch.io** - Free pixel art character packs

## Format:

- **PNG** with transparency
- **Power of 2 dimensions** (32, 64, 128)
- **Consistent frame size** across all animations
