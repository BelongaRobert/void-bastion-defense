# Void Bastion Defense - Steam Integration

**The Steam Lord's domain - blessed by the Emperor! ⚔️🐙**

Complete Steamworks integration for Void Bastion Defense, built with Electron and Greenworks.

## Overview

This package provides comprehensive Steam integration including:
- ✅ Steamworks API wrapper (Greenworks)
- ✅ Achievement system (30 achievements)
- ✅ Steam Cloud saves with auto-sync
- ✅ Global and Friends leaderboards
- ✅ Player stats tracking
- ✅ Rich presence integration
- ✅ Trading Cards, Badges, Emoticons (placeholder assets)
- ✅ Store page assets structure

## Quick Start

### Installation

```bash
npm install
npm run build
```

### Prerequisites

1. **Steam Client** - Must be running (standalone mode works without it)
2. **Steamworks SDK** - Required for Greenworks compilation
3. **Electron** - v28+ recommended

### Integration

```typescript
import {
  initializeSteamElectron,
  steamIntegration,
  cloudSaveManager,
  leaderboardManager
} from './steam-integration';

// In your Electron main process
async function initSteam() {
  const result = await initializeSteamElectron();
  
  if (result.mode === 'steam') {
    console.log('Steam connected! ID:', result.steamId);
  } else {
    console.log('Running in standalone mode');
  }
}
```

## API Reference

### Steam Integration

```typescript
// Initialize
await steamIntegration.initialize();

// Rich Presence
steamIntegration.setRichPresence('#WaveStatus', { wave: '15', score: '5000' });

// Achievements
steamIntegration.unlockAchievement('ACH_WAVE_10');

// Stats
steamIntegration.trackKill('sniper');
steamIntegration.trackWaveComplete(10);
```

### Cloud Saves

```typescript
// Save game
await cloudSaveManager.savePlayerData({
  playerLevel: 25,
  unlockedTowers: ['sniper', 'heavy', 'plasma'],
  preferences: { volume: 0.8 }
}, { backup: true });

// Load game
const saveData = await cloudSaveManager.loadPlayerData();

// Auto-sync
cloudSaveManager.startAutoSync(5); // Every 5 minutes
```

### Leaderboards

```typescript
// Get global leaderboard
const entries = await leaderboardManager.getGlobalLeaderboard(
  'LB_HIGH_WAVE',
  0,  // Start rank
  10  // End rank
);

// Upload score
await leaderboardManager.uploadWaveScore(wave, kills, playTime);

// Get weekly challenge
const challenge = leaderboardManager.getCurrentChallenge();
```

### Stats Manager

```typescript
// Track events
statsManager.trackKill('sniper');
statsManager.trackWaveCompleted(15);
statsManager.trackTowerBuilt('plasma');
statsManager.trackBossDefeated();

// Get stats
const stats = statsManager.getPlayerStats();
const breakdown = statsManager.getWeaponBreakdown();
```

## Renderer Process API

The preload script exposes `window.steamAPI`:

```javascript
// Achievements
await window.steamAPI.unlockAchievement('ACH_FIRST_BLOOD');
const { all, unlocked } = await window.steamAPI.getAchievements();

// Rich Presence
await window.steamAPI.setRichPresence('#WaveStatus', { wave: '10' });
await window.steamAPI.startGamePresence(10, 5000);

// Leaderboards
const entries = await window.steamAPI.getLeaderboard('LB_HIGH_WAVE', 'global', 0, 10);
await window.steamAPI.uploadScore('LB_HIGH_WAVE', wave, JSON.stringify({ kills, time }));

// Cloud Saves
await window.steamAPI.saveGame(playerData);
const data = await window.steamAPI.loadGame();

// Steam Info
const steamId = await window.steamAPI.getSteamId();
const username = await window.steamAPI.getUserName();
```

## Achievements (30 Total)

### Tutorial & First Steps (5)
- First Blood - Defeat your first enemy
- Graduate - Complete the tutorial
- First Wave - Complete your first wave
- Architect - Build your first tower
- Engineer - Upgrade a tower

### Wave Milestones (6)
- Wave 10 Survivor → Wave 25 Veteran → Wave 50 Elite → Wave 75 Master → Centurion (Wave 100) → Immortal (Wave 150)

### Tower Mastery (5)
- Tower Master - Build every tower type
- Maxed Out - Max upgrade a tower
- Long Shot - 1000 sniper kills
- Crowd Control - 500 AoE multi-kills
- Tactical Retreat - Sell 50 towers

### Enemy Kills (5)
- Hundred Slayer → Thousand Slayer → Ten Thousand Slayer
- Boss Hunter - Defeat 25 bosses
- Elite Slayer - Defeat 100 elites

### Economy & Strategy (5)
- War Chest - 10,000 credits
- Perfect Defense - 0 damage wave
- Minimalist - Wave 5 with 3 towers
- Full Arsenal - 20+ active towers
- Efficient Killer - Wave 10 with <5000 credits

### Secret (4)
- Xenos Scum - Defeat Tyranid boss
- Heretic - Defeat Chaos boss
- Ancient Evil - Defeat Necron boss
- For the Emperor! - ???

## Project Structure

```
steam/
├── src/
│   ├── index.ts                 # Main exports
│   ├── steam-integration.ts     # Core Steamworks wrapper
│   ├── cloud-save.ts            # Steam Cloud save manager
│   ├── leaderboards.ts          # Steam Leaderboards
│   ├── stats-manager.ts         # Player stats tracking
│   └── electron-wrapper.ts      # Electron integration
├── assets/
│   ├── achievements/            # Achievement icon specs
│   ├── trading-cards/           # Trading card structure
│   ├── badges/                  # Badge specifications
│   ├── emoticons/               # Emoticon codes
│   ├── profile-bg/              # Profile backgrounds
│   └── store/                   # Store page assets
│       ├── screenshots/         # Screenshot specs
│       └── trailer/             # Trailer specs
├── config/
│   ├── steam_appid.json         # App ID placeholder
│   └── achievements.cfg         # Achievement config
├── docs/
│   └── store-page-copy.md       # Store page text
├── package.json
└── tsconfig.json
```

## Configuration

### Steam App ID

Update `config/steam_appid.json` with your actual Steam App ID when available:

```json
{
  "appid": "YOUR_APP_ID_HERE"
}
```

For development/testing, you can use `480` (Spacewar - Steamworks test app).

### Greenworks Setup

1. Download Steamworks SDK
2. Extract to project root
3. Build Greenworks native module:

```bash
npm install greenworks
# Follow Greenworks build instructions for your platform
```

## Store Assets

### Required for Steam Submission

1. **Capsule Images**
   - Main: 231x87
   - Small: 231x87
   - Header: 460x215
   - Library: 600x900

2. **Screenshots**
   - 5-10 images at 1920x1080
   - JPG format, under 2MB each

3. **Trailer**
   - 60-90 seconds
   - 1920x1080, 60fps
   - MP4 format

See `assets/store/` for detailed specifications.

## Testing

### With Steam (Full Features)
1. Start Steam client
2. Launch Electron app
3. All features available

### Without Steam (Standalone Mode)
1. Close Steam client
2. Launch Electron app
3. Falls back to local saves/achievements

## Events

All managers emit events:

```typescript
steamIntegration.on('achievementUnlocked', (id) => {
  console.log('Achievement:', id);
});

cloudSaveManager.on('conflictDetected', (conflicts) => {
  // Handle save conflicts
});

leaderboardManager.on('scoreUploaded', ({ leaderboard, score }) => {
  console.log('Score uploaded:', score);
});
```

## Troubleshooting

### "Greenworks not found"
- Steamworks SDK not properly installed
- Native module build failed
- Running in standalone mode

### "Steam not running"
- Steam client not launched
- App ID not configured
- User not logged into Steam

### Cloud save conflicts
- Automatic resolution: newest wins
- Manual resolution via `cloudSaveManager.checkCloudSaves()`

## License

MIT - The Emperor protects!

## Credits

- Greenworks: https://github.com/greenheartgames/greenworks
- Steamworks SDK: https://partner.steamgames.com
- Inspired by Warhammer 40K (unofficial fan project)

---

**For the Emperor! ⚔️🐙**
