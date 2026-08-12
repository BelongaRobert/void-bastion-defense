# Black Orbit Outpost — Rebuild Plan

**Developer / credit:** Belongarobert  
**Working title:** Black Orbit Outpost  
**Status:** Plan locked — awaiting implementation kickoff  
**Target:** Steam (Windows + Steam Deck), mobile port later  
**Price:** List **$9.99**, permanent/launch **50% → $4.99** (never sell above effective $5 without explicit change)

---

## 1. Product one-liner

You are a movable defender holding a black-orbit outpost through three acts of escalating cosmic horror: walk the grounds, shoot the dead and worse, place hardpoints between waves, and earn light meta unlocks that deepen loadouts across runs.

---

## 2. Locked decisions (from Robert)

| Topic | Decision |
|-------|----------|
| Combat | **Movable defender** — walk, aim/shoot, place limited hardpoints |
| Tone | **Quiet cosmic dread** — no religion; blood, gore, zombies, body horror OK |
| Art | Prefer **stylized illustrated 2D (A)**; fall back to **crisp pixel (B)** if free/commercial packs aren’t enough |
| Scope | **Full 1.0:** 3 acts × ~8 waves, **medium** content budget |
| Progression | **Light unlocks + deeper meta** (B + C) |
| Input / platform | Mouse + keyboard first-class; **Windows + Deck** day one; architecture that does not block a later mobile port |
| Branding | Title OK for now; credit **Belongarobert** |
| Steam account | **Not set up yet** — build game + store kit first; App ID when available |
| Engine | **Phaser 3 + TypeScript + Vite + Electron** (agent builds everything; browser-testable; Steam/Deck via Electron + steamworks) |

---

## 3. Why this engine (least work for Robert)

You are not operating an editor. I own implementation.

- **Phaser 3 + TS:** 100% code, fast iteration, strong 2D tooling, easy CI/browser smoke tests  
- **Electron:** Steam Windows + Deck packaging path we already understand from Void Bastion Defense  
- **Mobile later:** keep input abstracted (`Pointer` / `VirtualStick` / `Gamepad`); no desktop-only assumptions in core combat  
- **Not Godot/Unity for v1:** higher setup/editor friction for autonomous builds; revisit only if native Steam features become blocking

Legacy `space-marine-runner` / Void Bastion Defense is **design reference only** — not a code base to port.

---

## 4. Fantasy & tone

**Setting:** A sealed outpost on a dark orbital body / dead station fringe. Something woke in the dark. Radio is mostly static. You are what is left of the garrison.

**Feel:** Quiet dread between waves; sudden violence in waves. Gore is readable and punchy, not slapstick. No sermons, cults-as-religion, or holy iconography — cosmic wrongness and infected flesh instead.

**Reference cocktail (not clones):** risk of rain’s dread hush + Broforce/Hotline gun feel lite + VT2 wave structure lite + short premium “finish the run” like a compact Hades act structure.

---

## 5. Core gameplay loop

```
Main Menu
  → Loadout (unlocked weapons / hardpoints / modifiers)
  → Act Select (1 unlocked → 2/3 after clears)
  → Wave N of Act
       Combat: move, aim, shoot, dodge, use abilities
       Protect: Outpost Core HP (lose if core dies; player death = downed/revive rules TBD)
  → Between-wave Rest
       Heal / repair core / shop / place or upgrade hardpoints / optional event
  → Boss every ~wave 8 (act finale)
  → Act clear → unlocks + meta currency
  → Act 3 clear → True Ending teaser + Endless / Challenge unlock
```

### Combat pillars

1. **Mobility** — WASD/stick move; not glued to center  
2. **Gunfeel** — reload tension, recoil/spread, distinct weapon roles  
3. **Core pressure** — enemies path to the **Outpost Core**; you are a firefighter, not a deathmatch hero  
4. **Hardpoints** — few powerful deployables (turret, shredder mine, floodlight reveal, gore-bait decoy, etc.), limited slots per act  
5. **Readable dread** — telegraph elites/bosses; audio stingers; blood as feedback

### Lose / win

- **Wave win:** kill quota or timer + surviving threats cleared (pick one rule set in prototype; default = kill quota + no active elites)  
- **Act win:** defeat act boss  
- **Run fail:** Outpost Core HP ≤ 0  
- **Player HP:** depletable; at 0 → short downed state or instant fail if core also critical (prototype A: player downed 8s once per wave, then fail)

---

## 6. Content budget (Medium 1.0)

### Acts (3 × 8 waves)

| Act | Theme | Enemy focus | Boss |
|-----|--------|-------------|------|
| **1 — Dockyard Dark** | Breached hangar, flickering lights | Shamblers, runners, spitters | **The Dockmaster** (tanky summoner) |
| **2 — Cold Storage** | Freezers, fog, reflections | Armored dead, bursters, stalkers | **Cold Vault** (phase: fog + ambush) |
| **3 — Black Orbit** | Exterior plates / void exposure | Void-touched, elite packs, siege | **Orbit Waker** (arena + core siege) |

Each act: ~6 combat waves, 1 mid-elite spike, 1 rest-heavy wave, **boss on wave 8**.

### Weapons (medium)

**Start unlocked (3):** SMG, pump shotgun, sidearm  
**Unlock via meta (5):** marksman rifle, flamethrower, crowbar melee hybrid, grenade launcher, experimental void rifle  

**Roles:** crowd clear / single target / burn DoT / anti-armor / panic melee  

### Hardpoints (6 total)

| Hardpoint | Role |
|-----------|------|
| Autogun Nest | Sustained DPS |
| Shredder Mine | Choke burst |
| Floodlight | Reveal / slow dread units |
| Bile Trap | Slow + DoT zone |
| Repair Drone Pad | Core/player HoT between engagements |
| Barricade | Path block / funnel (limited HP) |

Slots: start **2**, unlock **3rd** via meta.

### Enemies (medium roster ~10 + 3 bosses)

- Shambler, Runner, Spitter, Bloater, Armored, Stalker, Screamer (buff pack), Void Mite (swarm), Siege Brute, Mirror Wraith (Act 3)  
- Plus 3 act bosses above  

### Meta (B + C)

**Currency:** `Salvage` (run) + `Orbit Marks` (meta, from act clears / challenges)

**Unlock tree branches:**

1. Weapons & ammo mods  
2. Hardpoint slots & blueprints  
3. Outpost perks (core armor, starting medkits, shop discount)  
4. Challenge modifiers (for Marks & cosmetics)  
5. Cosmetics (blood decals, weapon skins, outpost banners) — no pay-to-win  

**Challenge / deeper meta:**

- Daily/Weekly modifier card (e.g. *Fog*, *Double Runners*, *Core Bleed*)  
- Act clear stars (1–3) based on core HP remaining + time  
- Leaderboard: Act 3 clear time; Weekly score  

---

## 7. Systems architecture

```
apps/
  game/                 # Phaser 3 + Vite + TypeScript
  electron/             # Desktop shell, Steam hooks
packages/
  shared/               # types, balance JSON schemas
docs/
  PLAN.md               # this file
  STEAM_CHECKLIST.md
  ART_BIBLE.md
```

### Runtime modules

| Module | Responsibility |
|--------|----------------|
| `Core/GameApp` | Boot, scene flow, services |
| `Scenes/*` | Boot, Menu, Loadout, ActMap, Combat, Rest, BossIntro, Results |
| `Combat/PlayerController` | Move, aim (mouse), shoot, dash, interact |
| `Combat/WeaponSystem` | Fire modes, reload, ammo, mods |
| `Combat/EnemyDirector` | Wave spawn budgets, composition curves |
| `Combat/Pathing` | Enemies → core (simple grid flow field) |
| `Combat/HardpointSystem` | Place / upgrade / targeting |
| `Combat/GoreFX` | Blood sprays, corpses, gib caps for Deck perf |
| `Meta/SaveService` | Local + Steam Cloud when available |
| `Meta/UnlockTree` | Marks spending, entitlements |
| `Input/InputMap` | KBM + gamepad; mobile adapters later |
| `Audio/AudioBus` | Music layers (drone → combat), SFX, dread stingers |
| `Steam/SteamBridge` | Achievements, cloud, rich presence, leaderboards (stub until App ID) |

### Balance data

All numbers in JSON/TS data tables (`weapons.json`, `enemies.json`, `waves/act1.json`) — not hardcoded in combat logic.

---

## 8. Art & audio plan

### Art priority

1. Attempt **Kenney + itch.io commercial-friendly packs + Craftpix freebies** composited into a **stylized illustrated** look (A)  
2. If cohesion fails within a short art spike → switch to **unified pixel pack** (B) and own that look  
3. Custom work always: **UI chrome, core outpost silhouette, logo, boss tells, blood VFX**

### Visual rules

- One composition in combat: outpost core as landmark, not a busy dashboard  
- Atmosphere: fog, practical lights, blood on floors as persistent decals (capped)  
- Avoid purple-glow default sci-fi; prefer **void navy, sickly green biolume, cold steel, arterial red**  
- Expressive UI type (not Inter/Roboto); terminal + display pairing  

### Audio

- Ambient drones between waves  
- Percussive combat beds per act  
- Gore hits, reloads, core alarms, boss entrance stingers  
- Procedural fallbacks early; replace with real assets before store page trailer  

---

## 9. Steam & business

| Item | Plan |
|------|------|
| Dev credit | Belongarobert |
| Platforms v1 | Windows + Steam Deck verified checklist |
| Price | **$9.99** list, **50% default/launch → $4.99** |
| Account | Robert creates Steam Direct when ready (~$100 fee); I prepare all page copy + capsule specs |
| Features v1 | Achievements (~25), Cloud saves, Rich presence, Leaderboards (weekly + act times), Full controller |
| Trailer | 60–90s after Act 1 vertical polish |
| Mobile | Post-1.0; touch virtual stick + auto-aim assist; same TS codebase where possible |

### Store tags (draft)

Action, Survival, Twin Stick Shooter, Horror, Zombies, Singleplayer, Controller, Indie, Score Attack

---

## 10. What we delete / ignore from the old game

- Warhammer / Emperor / bolter / faction IP pastiche  
- Center-only turret fantasy as the *only* verb  
- Fake “30 towers / campaign scenarios” marketing  
- Monolithic `game.js` Canvas architecture  
- Shipping store copy that lies about systems  

**Keep as inspiration only:** wave tension, fortress-as-HP, weapon unlock dopamine, Deck/controller ambition, short session loop.

---

## 11. Build milestones

### M0 — Repo & skeleton
- New `projects/black-orbit-outpost` app (Vite + Phaser + TS)  
- Electron shell stub  
- CI: `typecheck` + headless boot smoke  
- Input map KBM + gamepad stub  

### M1 — Vertical slice (Act 1 waves 1–3)
- Movable player, aim/shoot, 2 weapons  
- Core HP + 3 enemy types  
- 1 hardpoint (Autogun Nest)  
- Rest screen (heal + place)  
- Gore VFX v0  
- **Gate:** feels good on Deck-resolution window  

### M2 — Act 1 complete
- Full 8 waves + Dockmaster boss  
- Shop/rest economy  
- Save/continue  
- Art direction lock (A or B)  

### M3 — Meta + Act 2
- Unlock tree + Orbit Marks  
- Act 2 roster + boss  
- Challenges v0 (3 modifiers)  

### M4 — Act 3 + polish
- Act 3 + Orbit Waker  
- Achievements wiring (local + Steam stub)  
- Balance pass, performance caps (particles/corpses)  
- Options: rembind, aim assist, gore toggle, screen shake  

### M5 — Steam packaging
- Electron production build  
- Controller glyphs, Deck UI scale  
- Store page copy, capsules checklist, trailer checklist  
- Price/discount notes for partner panel  

### M6 — Soft launch readiness
- Bug bash, accessibility (colorblind enemy tells, subtitle prompts)  
- Cloud save when App ID exists  
- Mobile input spike (non-blocking prototype)  

---

## 12. Success criteria for 1.0

- Clear Act 1–3 in one sitting (~45–90 min skilled)  
- Mouse/keyboard *and* gamepad both first-class on Windows  
- Deck: stable 60fps target on medium gore settings  
- Meta tree has meaningful choices without requiring grinding for “real” weapons  
- Store page only claims systems that exist  
- Belongarobert credited on boot + Steam page  

---

## 13. Open items (resolved in first implementation spikes)

These do **not** block starting M0/M1; they will be decided in-prototype:

1. Exact fail rule when player HP hits 0 (downed vs instant)  
2. Wave clear rule (quota vs defend timer)  
3. Camera: tight follow vs hybrid follow-with-core-frame  
4. Final title lock vs keep *Black Orbit Outpost*  
5. Steam App ID (Robert)  

---

## 14. Immediate next step after plan approval

**Kick off M0 + M1:** scaffold the Phaser/TS project, implement movable defender + core defense + Act 1 first three waves, then lock art path (illustrated packs vs pixel).

No further product questions required to start coding unless Robert changes a locked decision above.
