# Black Orbit Outpost

Premium act-based outpost defense for Steam (Windows + Deck). Movable defender, cosmic dread, zombies & gore. Chapter Elites fight *with* the finale wave. PS2-style portrait dialogue story.

**Developer:** Belongarobert  

See [PLAN.md](./PLAN.md) for the full rebuild plan.

## Status

**M0 + M1 in progress:** playable Act 1 waves 1–3 vertical slice with DialogueBox, rest/hardpoint, gore VFX.

## Stack

- Phaser 3 + TypeScript + Vite
- Electron shell (Steam / Deck packaging later)
- Steamworks when App ID is available

## Run

```bash
cd projects/black-orbit-outpost
npm install
npm run dev
```

Open the URL Vite prints (http://127.0.0.1:5173).

```bash
npm run typecheck
npm run build
```

Electron (after build, or with Vite running):

```bash
npm run electron        # production dist
npm run electron:dev    # needs concurrently/wait-on from npm install
```

## M1 controls

- **WASD** move · **Mouse** aim · **Click** fire
- **1 / 2** SMG / Shotgun · **R** reload · **Shift** dash
- **Space / Click** advance dialogue & menus
- Rest: **1** heal · **2** repair core · **3** place Autogun Nest · **Space** next wave
