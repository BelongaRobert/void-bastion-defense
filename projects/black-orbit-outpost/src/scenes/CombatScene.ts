import Phaser from 'phaser';
import { ACT_MAX_WAVE, getCurrentWaveDef, SHOP_AFTER_WAVES } from '../content/waves';
import { InputMap } from '../input/InputMap';
import { metaState, runState } from '../state/RunState';
import { saveService } from '../state/SaveService';
import { settingsState } from '../state/SettingsState';
import { achievementService } from '../meta/Achievements';
import { Colors, GAME_HEIGHT, GAME_WIDTH } from '../theme';
import { Bullet, BulletGroup } from '../combat/Bullet';
import { Enemy, EnemyGroup, EnemyProjectile } from '../combat/Enemy';
import { EnemyDirector } from '../combat/EnemyDirector';
import { GoreFX } from '../combat/GoreFX';
import { AutogunNest } from '../combat/Hardpoint';
import { OutpostCore } from '../combat/OutpostCore';
import { Player } from '../combat/Player';
import { DialogueBox } from '../story/DialogueBox';
import { Hud } from '../ui/Hud';

export class CombatScene extends Phaser.Scene {
  private inputMap!: InputMap;
  private player!: Player;
  private core!: OutpostCore;
  private bullets!: BulletGroup;
  private enemies!: EnemyGroup;
  private spit!: Phaser.Physics.Arcade.Group;
  private director!: EnemyDirector;
  private gore!: GoreFX;
  private hud!: Hud;
  private dialogue!: DialogueBox;
  private nest: AutogunNest | null = null;
  private waveClearing = false;
  private failed = false;
  private eliteAnnounced = false;

  constructor() {
    super('Combat');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(Colors.voidNavy);
    this.drawArena();

    this.inputMap = new InputMap(this);
    this.gore = new GoreFX(this);
    this.hud = new Hud(this);
    this.dialogue = new DialogueBox(this);

    const pos = OutpostCore.defaultPosition();
    this.core = new OutpostCore(this, pos.x, pos.y);
    this.player = new Player(this, pos.x - 120, pos.y + 80);

    this.bullets = new BulletGroup(this);
    this.enemies = new EnemyGroup(this);
    this.spit = this.physics.add.group({
      classType: EnemyProjectile,
      maxSize: 50,
      runChildUpdate: false,
    });

    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => {
      const bullet = b as Bullet;
      const enemy = e as Enemy;
      if (!bullet?.active || !enemy?.active) return;
      if (typeof bullet.kill !== 'function') return;
      const wasElite = !!enemy.def?.isElite;
      const dead = enemy.takeDamage(bullet.damage, this.gore);
      bullet.kill();
      if (dead) {
        runState.salvage += enemy.def.salvage;
        if (!runState.gotFirstKill) {
          runState.gotFirstKill = true;
          achievementService.unlock('first_blood');
          saveService.saveMetaOnly();
        }
        if (wasElite) {
          this.director.notifyEliteDied();
          this.hud.flash('CHAPTER ELITE DOWN', this, '#c9a0ff');
          if (settingsState.screenShake) this.cameras.main.shake(200, 0.01);
          if (enemy.def.id === 'dockmaster') achievementService.unlock('dockmaster_down');
          if (enemy.def.id === 'coldvault') achievementService.unlock('cold_vault_down');
          if (enemy.def.id === 'orbitwaker') achievementService.unlock('orbit_waker_down');
          saveService.saveMetaOnly();
        }
      }
    });

    this.physics.add.overlap(this.spit, this.core, (a, b) => {
      const proj = this.asSpit(a, b);
      if (!proj) return;
      this.core.damage(proj.damage);
      this.gore.burst(this.core.x, this.core.y, Colors.biolume, 6);
      proj.kill();
    });

    this.physics.add.overlap(this.spit, this.player, (a, b) => {
      const proj = this.asSpit(a, b);
      if (!proj) return;
      this.player.damage(proj.damage);
      proj.kill();
    });

    if (runState.hasAutogunNest && runState.autogunNestPos) {
      this.nest = new AutogunNest(
        this,
        runState.autogunNestPos.x,
        runState.autogunNestPos.y,
      );
    }

    this.director = new EnemyDirector();
    const wave = getCurrentWaveDef(runState.act, runState.wave);
    if (!wave) {
      this.scene.start('Menu');
      return;
    }
    this.director.begin(wave);
    this.hud.flash(wave.label, this, wave.elite ? '#c9a0ff' : '#e8b84a');
    this.waveClearing = false;
    this.failed = false;
    this.eliteAnnounced = false;
    saveService.saveRun();

    this.input.keyboard?.on('keydown-K', () => this.devClearHostiles());
    this.input.keyboard?.on('keydown-N', () => this.devSkipWave());
  }

  private asSpit(a: unknown, b: unknown): EnemyProjectile | null {
    for (const c of [a, b]) {
      const p = c as EnemyProjectile;
      if (p && typeof p.kill === 'function' && p.active) return p;
    }
    return null;
  }

  /** Dev: wipe living enemies (does not auto-complete until spawns finish) */
  private devClearHostiles(): void {
    for (const child of this.enemies.getChildren()) {
      const e = child as Enemy;
      if (!e.active) continue;
      const wasElite = !!e.def?.isElite;
      e.kill();
      if (wasElite) this.director.notifyEliteDied();
    }
    this.hud.flash('DEV CLEAR', this);
  }

  /** Dev: force wave clear */
  private devSkipWave(): void {
    if (this.waveClearing || this.failed) return;
    this.devClearHostiles();
    this.director.forceFinish();
    this.waveClearing = true;
    this.hud.flash('DEV SKIP WAVE', this);
    this.time.delayedCall(200, () => this.onWaveCleared());
  }

  update(_time: number, delta: number): void {
    if (this.failed) return;

    if (this.dialogue.isOpen()) {
      if (this.inputMap.justConfirmed()) this.dialogue.tryAdvance();
      this.player.updatePlayer(delta, this.inputMap, this.bullets, true);
      return;
    }

    this.director.update(this.enemies);
    this.bullets.tick(delta);

    let nearest: { x: number; y: number } | null = null;
    let best = 9999;
    for (const child of this.enemies.getChildren()) {
      const e = child as Enemy;
      if (!e.active) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (d < best) {
        best = d;
        nearest = { x: e.x, y: e.y };
      }
    }

    this.player.updatePlayer(delta, this.inputMap, this.bullets, false, nearest);
    this.core.updateVisual(delta);

    for (const child of this.enemies.getChildren()) {
      const e = child as Enemy;
      if (!e.active) continue;
      e.setSummonHandler((type, x, y) => {
        this.enemies.spawnAt(type, x, y);
      });
      e.updateEnemy(delta, this.core, this.player, this.spit);
    }

    if (this.nest) {
      this.nest.updateNest(delta, this.enemies, (x, y, angle) => {
        this.bullets.spawn(x, y, angle, 700, this.nest!.getDamage(), Colors.warning);
      });
    }

    const elite = this.enemies.getElite();
    if (elite && !this.eliteAnnounced) {
      this.eliteAnnounced = true;
      this.hud.flash('CHAPTER ELITE INBOUND', this, '#c9a0ff');
      this.cameras.main.flash(250, 80, 40, 120);
    }

    this.hud.update(
      this.player,
      this.director.getLabel(),
      this.enemies.countActiveLiving(),
      this.director.remainingToSpawn(),
      elite,
    );

    if (this.core.isDead() || runState.playerHp <= 0) {
      this.failRun();
      return;
    }

    const eliteCleared =
      !this.director.isEliteWave() ||
      (this.director.wasEliteSpawned() && !this.director.isEliteAlive() && !elite);

    if (
      !this.waveClearing &&
      this.director.isFinishedSpawning() &&
      this.enemies.countActiveLiving() === 0 &&
      eliteCleared
    ) {
      this.waveClearing = true;
      this.time.delayedCall(600, () => this.onWaveCleared());
    }
  }

  private onWaveCleared(): void {
    if (this.failed) return;
    runState.salvage += 20 + runState.wave * 6;
    this.trackBestWave();
    saveService.saveRun();

    if (runState.wave >= ACT_MAX_WAVE) {
      this.cleanup();
      this.scene.start('Results');
      return;
    }

    const nextIsShop = SHOP_AFTER_WAVES.has(runState.wave);
    this.cleanup();
    this.scene.start(nextIsShop ? 'Shop' : 'Rest');
  }

  private failRun(): void {
    this.failed = true;
    this.trackBestWave();
    saveService.clearRun();
    saveService.saveMetaOnly();
    this.hud.flash('OUTPOST LOST', this, '#ff3b5c');
    this.time.delayedCall(1600, () => {
      this.cleanup();
      this.scene.start('Menu');
    });
  }

  private trackBestWave(): void {
    if (runState.act === 3) {
      metaState.bestAct3Wave = Math.max(metaState.bestAct3Wave, runState.wave);
    } else if (runState.act === 2) {
      metaState.bestAct2Wave = Math.max(metaState.bestAct2Wave, runState.wave);
    } else {
      metaState.bestAct1Wave = Math.max(metaState.bestAct1Wave, runState.wave);
    }
  }

  private cleanup(): void {
    this.player.destroyVisuals();
    this.nest?.destroyNest();
    this.dialogue.destroy();
  }

  private drawArena(): void {
    const g = this.add.graphics();
    if (runState.act === 3) {
      g.fillStyle(0x05060c, 1);
      g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      for (let i = 0; i < 80; i++) {
        g.fillStyle(0xffffff, 0.08 + Math.random() * 0.15);
        g.fillCircle(Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT, 1);
      }
      g.lineStyle(2, 0x402030, 0.8);
      g.strokeRect(16, 16, GAME_WIDTH - 32, GAME_HEIGHT - 32);
      g.fillStyle(0x120818, 1);
      g.fillTriangle(100, 80, 180, 200, 40, 200);
      g.fillTriangle(GAME_WIDTH - 80, 100, GAME_WIDTH - 40, 260, GAME_WIDTH - 160, 240);
      g.fillStyle(0xff3b5c, 0.06);
      g.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 220);
    } else if (runState.act === 2) {
      g.fillStyle(0x081018, 1);
      g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      g.lineStyle(1, 0x1a3048, 0.55);
      for (let x = 0; x < GAME_WIDTH; x += 64) g.lineBetween(x, 0, x, GAME_HEIGHT);
      for (let y = 0; y < GAME_HEIGHT; y += 64) g.lineBetween(0, y, GAME_WIDTH, y);
      g.lineStyle(2, 0x3a6080, 0.7);
      g.strokeRect(16, 16, GAME_WIDTH - 32, GAME_HEIGHT - 32);
      g.fillStyle(0x102030, 1);
      g.fillRect(60, 100, 40, 220);
      g.fillRect(120, 100, 40, 220);
      g.fillRect(GAME_WIDTH - 160, 80, 50, 280);
      g.fillRect(GAME_WIDTH - 100, 80, 50, 280);
      g.fillStyle(0x7eb6ff, 0.08);
      g.fillCircle(GAME_WIDTH / 2, 120, 180);
    } else {
      g.fillStyle(0x0a101a, 1);
      g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      g.lineStyle(1, 0x1a2838, 0.7);
      for (let x = 0; x < GAME_WIDTH; x += 64) g.lineBetween(x, 0, x, GAME_HEIGHT);
      for (let y = 0; y < GAME_HEIGHT; y += 64) g.lineBetween(0, y, GAME_WIDTH, y);
      g.lineStyle(2, Colors.steelDark, 0.8);
      g.strokeRect(16, 16, GAME_WIDTH - 32, GAME_HEIGHT - 32);
      g.fillStyle(0x121c2a, 1);
      g.fillRect(80, 80, 120, 40);
      g.fillRect(GAME_WIDTH - 220, GAME_HEIGHT - 140, 140, 60);
      g.fillRect(GAME_WIDTH - 160, 90, 60, 160);
      g.fillStyle(0x152030, 1);
      g.fillRect(200, 40, 16, 160);
      g.fillRect(200, 40, 90, 12);
    }
  }
}
