# Black Orbit Outpost

Premium act-based outpost defense for Steam (Windows + Deck). Movable defender, cosmic dread, zombies & gore. Chapter Elites fight *with* the finale wave. PS2-style portrait dialogue story.

**Developer:** Belongarobert  
**Antagonist:** Nyx  
**Price:** $9.99 list → **$4.99** launch/standing 50%

See [PLAN.md](./PLAN.md), [ART_BIBLE.md](./ART_BIBLE.md), and [steam/STORE_PAGE.md](./steam/STORE_PAGE.md).

## Status

**M5 in progress / packaging ready:** Campaign Acts 1–3 complete; Electron production build scripts; controller glyph HUD; Deck UI scale; Steam achievement/rich-presence stubs; store capsules/trailer checklists. Paste Steam App ID into `steam/steam_appid.txt` when available.

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
npm run dist:win       # NSIS + portable (needs Wine/CI on Linux hosts)
npm run dist:portable
```

## Controls

- **WASD** move · **Mouse** aim · **Click** fire · **1/2** weapons · **R** reload · **Shift** dash
- **Gamepad:** LS move · RS aim · RT fire · Y reload · A dash · LB/RB weapons
- Menu: **1** act select · **2** continue · **3** meta · **4** options · **0** Act3 W8 (dev)
- Combat dev: **K** clear hostiles · **N** skip wave

## Steam kit

| Doc | Purpose |
|-----|---------|
| `steam/STORE_PAGE.md` | Copy, tags, sysreq, **price notes** |
| `steam/CAPSULES.md` | Capsule / screenshot checklist |
| `steam/TRAILER.md` | 60–90s trailer beat sheet |
| `steam/steam_appid.txt` | App ID placeholder (`0` until partner app exists) |
