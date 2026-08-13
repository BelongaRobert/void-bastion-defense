# Black Orbit Outpost

Premium act-based outpost defense for Steam (Windows + Deck). Movable defender, cosmic dread, zombies & gore. Chapter Elites fight *with* the finale wave. PS2-style portrait dialogue story.

**Developer:** Belongarobert  
**Antagonist:** Nyx  
**Price:** $9.99 list → **$4.99** launch/standing 50%

See [PLAN.md](./PLAN.md), [ART_BIBLE.md](./ART_BIBLE.md), and [steam/STORE_PAGE.md](./steam/STORE_PAGE.md).

## Status

**Wonder polish (v0.2.0):** Cinematic menu with pulsing Core, ambient drone, bullet trails, typewriter dialogue, richer arenas, Belongarobert boot splash. Steam App ID / $100 fee still deferred until your playtest.

## Run (browser)

```bash
cd projects/black-orbit-outpost
npm install
npm run dev
```

http://127.0.0.1:5173

## Electron / Windows package

```bash
npm run electron:dev   # Vite + Electron
npm run dist           # unpacked dir under release/
npm run dist:win       # NSIS + portable (Windows host / CI)
npm run dist:portable
```

## Controls

- **WASD** move · **Mouse** aim · **Click** fire · **1/2** weapons · **R** reload · **Shift** dash
- **Gamepad:** LS move · RS aim · RT fire · Y reload · A dash · LB/RB weapons
- Menu: **1** act select · **2** continue · **3** meta · **4** options
- Dev-only (`npm run dev`): menu **0** Act3 W8 · combat **K**/**N**

## Steam kit

| Doc | Purpose |
|-----|---------|
| `steam/STORE_PAGE.md` | Copy, tags, sysreq, **price notes** |
| `steam/CAPSULES.md` | Capsule / screenshot checklist |
| `steam/TRAILER.md` | 60–90s trailer beat sheet |
| `steam/steam_appid.txt` | App ID placeholder (`0` until partner app exists) |
