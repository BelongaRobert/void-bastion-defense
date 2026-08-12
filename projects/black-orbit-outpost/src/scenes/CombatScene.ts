import Phaser from 'phaser';
import { ACT1_WAVES, M1_MAX_WAVE } from '../content/waves';
import { InputMap } from '../input/InputMap';
import { runState } from '../state/RunState';
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
      maxSize: 40,
      runChildUpdate: false,
    });

    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => {
      const bullet = b as Bullet;
      const enemy = e as Enemy;
      if (!bullet.active || !enemy.active) return;
      const dead = enemy.takeDamage(bullet.damage, this.gore);
      bullet.kill();
      if (dead) runState.salvage += enemy.def.salvage;
    });

    this.physics.add.overlap(this.spit, this.core, (p) => {
      const proj = p as EnemyProjectile;
      if (!proj.active) return;
      this.core.damage(proj.damage);
      this.gore.burst(this.core.x, this.core.y, Colors.biolume, 6);
      proj.kill();
    });

    this.physics.add.overlap(this.spit, this.player, (p) => {
      const proj = p as EnemyProjectile;
      if (!proj.active) return;
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
    const wave = ACT1_WAVES[runState.wave - 1];
    this.director.begin(wave);
    this.hud.flash(wave.label, this);
    this.waveClearing = false;
    this.failed = false;
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
    this.player.updatePlayer(delta, this.inputMap, this.bullets, false);
    this.core.updateVisual(delta);

    for (const child of this.enemies.getChildren()) {
      const e = child as Enemy;
      if (e.active) e.updateEnemy(delta, this.core, this.player, this.spit);
    }

    if (this.nest) {
      this.nest.updateNest(delta, this.enemies, (x, y, angle) => {
        this.bullets.spawn(x, y, angle, 700, this.nest!.getDamage(), Colors.warning);
      });
    }

    this.hud.update(
      this.player,
      this.director.getLabel(),
      this.enemies.countActiveLiving(),
      this.director.remainingToSpawn(),
    );

    if (this.core.isDead() || runState.playerHp <= 0) {
      this.failRun();
      return;
    }

    if (
      !this.waveClearing &&
      this.director.isFinishedSpawning() &&
      this.enemies.countActiveLiving() === 0
    ) {
      this.waveClearing = true;
      this.time.delayedCall(600, () => this.onWaveCleared());
    }
  }

  private onWaveCleared(): void {
    if (this.failed) return;
    runState.salvage += 15 + runState.wave * 5;
    if (runState.wave >= M1_MAX_WAVE) {
      this.hud.flash('ACT 1 SLICE COMPLETE', this);
      this.time.delayedCall(1400, () => {
        this.cleanup();
        this.scene.start('Menu');
      });
      return;
    }
    this.cleanup();
    this.scene.start('Rest');
  }

  private failRun(): void {
    this.failed = true;
    this.hud.flash('OUTPOST LOST', this);
    this.time.delayedCall(1600, () => {
      this.cleanup();
      this.scene.start('Menu');
    });
  }

  private cleanup(): void {
    this.player.destroyVisuals();
    this.nest?.destroyNest();
    this.dialogue.destroy();
  }

  private drawArena(): void {
    const g = this.add.graphics();
    g.fillStyle(0x0a101a, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.lineStyle(1, 0x1a2838, 0.7);
    for (let x = 0; x < GAME_WIDTH; x += 64) g.lineBetween(x, 0, x, GAME_HEIGHT);
    for (let y = 0; y < GAME_HEIGHT; y += 64) g.lineBetween(0, y, GAME_WIDTH, y);
    g.lineStyle(2, Colors.steelDark, 0.8);
    g.strokeRect(16, 16, GAME_WIDTH - 32, GAME_HEIGHT - 32);
    // Dockyard silhouette props
    g.fillStyle(0x121c2a, 1);
    g.fillRect(80, 80, 120, 40);
    g.fillRect(GAME_WIDTH - 220, GAME_HEIGHT - 140, 140, 60);
    g.fillRect(GAME_WIDTH - 160, 90, 60, 160);
  }
}
