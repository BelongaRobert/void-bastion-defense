import Phaser from 'phaser';
import { ENEMIES, type EnemyDef, type EnemyId } from '../content/enemies';
import { Colors, DEPTH } from '../theme';
import { runState } from '../state/RunState';
import { settingsState } from '../state/SettingsState';
import type { OutpostCore } from './OutpostCore';
import type { Player } from './Player';
import type { GoreFX } from './GoreFX';

/** Shape tells for colorblind mode — role readable without hue. */
type TellKind = 'fast' | 'ranged' | 'tank' | 'burst' | 'elite';

function tellKindFor(def: EnemyDef): TellKind {
  if (def.isElite) return 'elite';
  if (def.id === 'burster') return 'burst';
  if (def.ranged) return 'ranged';
  if (def.speed >= 120 || def.id === 'voidmite' || def.id === 'stalker' || def.id === 'runner') {
    return 'fast';
  }
  return 'tank';
}

export class EnemyProjectile extends Phaser.Physics.Arcade.Image {
  damage = 0;

  constructor(scene: Phaser.Scene, x = 0, y = 0) {
    super(scene, x, y, 'spit');
    this.setDepth(DEPTH.bullet);
  }

  launch(x: number, y: number, angle: number, speed: number, damage: number): void {
    this.enableBody(true, x, y, true, true);
    this.setTint(Colors.biolume);
    this.damage = damage;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.velocity.set(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  kill(): void {
    this.disableBody(true, true);
  }
}

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  def!: EnemyDef;
  hp = 0;
  maxHp = 0;
  private attackCd = 0;
  private summonCd = 0;
  private pulse = 0;
  private moveSpeed = 0;
  private onSummon: ((type: EnemyId, x: number, y: number) => void) | null = null;
  private eliteRing: Phaser.GameObjects.Arc | null = null;
  private tellMark: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, x = 0, y = 0) {
    super(scene, x, y, 'enemy_blob');
    this.setDepth(DEPTH.enemy);
  }

  setSummonHandler(fn: (type: EnemyId, x: number, y: number) => void): void {
    this.onSummon = fn;
  }

  spawn(type: EnemyId, x: number, y: number): void {
    this.def = ENEMIES[type];
    this.hp = Math.floor(this.def.hp * runState.enemyHpMult);
    this.maxHp = this.hp;
    this.moveSpeed = this.def.speed * runState.enemySpeedMult;
    this.enableBody(true, x, y, true, true);
    this.setTint(this.def.color);
    this.setDisplaySize(this.def.radius * 2, this.def.radius * 2);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(this.def.radius * 0.9);
    body.setOffset(
      this.displayWidth / 2 - this.def.radius * 0.9,
      this.displayHeight / 2 - this.def.radius * 0.9,
    );
    body.setAllowGravity(false);
    body.setCollideWorldBounds(true);
    this.attackCd = 400;
    this.summonCd = this.def.summonIntervalMs ?? 0;
    this.pulse = 0;
    this.eliteRing?.destroy();
    this.eliteRing = null;
    this.tellMark?.destroy();
    this.tellMark = null;
    if (this.def.isElite) {
      this.setDepth(DEPTH.enemy + 2);
      this.eliteRing = this.scene.add
        .circle(x, y, this.def.radius + 10, Colors.antagonist, 0)
        .setStrokeStyle(3, this.def.color, 0.9)
        .setDepth(DEPTH.enemy + 1);
    }
    if (settingsState.colorblindTells) {
      this.tellMark = this.scene.add.graphics().setDepth(DEPTH.enemy + 3);
      this.drawTell(tellKindFor(this.def));
    }
  }

  private drawTell(kind: TellKind): void {
    if (!this.tellMark) return;
    this.tellMark.clear();
    this.tellMark.lineStyle(2, 0xffffff, 0.95);
    this.tellMark.fillStyle(0x070b12, 0.55);
    const r = Math.max(8, this.def.radius * 0.45);
    switch (kind) {
      case 'fast':
        // Chevron / arrow
        this.tellMark.fillTriangle(0, -r, -r * 0.7, r * 0.6, r * 0.7, r * 0.6);
        this.tellMark.strokeTriangle(0, -r, -r * 0.7, r * 0.6, r * 0.7, r * 0.6);
        break;
      case 'ranged':
        this.tellMark.beginPath();
        this.tellMark.moveTo(0, -r);
        this.tellMark.lineTo(r, 0);
        this.tellMark.lineTo(0, r);
        this.tellMark.lineTo(-r, 0);
        this.tellMark.closePath();
        this.tellMark.fillPath();
        this.tellMark.strokePath();
        break;
      case 'burst':
        this.tellMark.lineBetween(-r, -r, r, r);
        this.tellMark.lineBetween(-r, r, r, -r);
        break;
      case 'elite':
        this.tellMark.strokeCircle(0, 0, r * 1.1);
        this.tellMark.strokeCircle(0, 0, r * 0.55);
        break;
      default:
        this.tellMark.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
        this.tellMark.strokeRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
        break;
    }
  }

  takeDamage(amount: number, gore: GoreFX): boolean {
    this.hp -= amount;
    this.setTint(0xffffff);
    this.scene.time.delayedCall(50, () => {
      if (this.active) this.setTint(this.def.color);
    });
    if (this.hp <= 0) {
      gore.burst(this.x, this.y, Colors.arterial, this.def.isElite ? 36 : 16);
      this.kill();
      return true;
    }
    gore.burst(this.x, this.y, Colors.arterialBright, this.def.isElite ? 8 : 4);
    return false;
  }

  kill(): void {
    this.eliteRing?.destroy();
    this.eliteRing = null;
    this.tellMark?.destroy();
    this.tellMark = null;
    this.disableBody(true, true);
  }

  updateEnemy(
    delta: number,
    core: OutpostCore,
    player: Player,
    spitGroup: Phaser.Physics.Arcade.Group,
  ): void {
    if (!this.active) return;
    this.pulse += delta;
    this.attackCd -= delta;
    if (this.eliteRing) {
      this.eliteRing.setPosition(this.x, this.y);
      this.eliteRing.setScale(1 + Math.sin(this.pulse * 0.008) * 0.08);
    }
    if (this.tellMark) {
      this.tellMark.setPosition(this.x, this.y - this.def.radius - 6);
    }

    const preferPlayer = !this.def.preferCore || this.def.id === 'runner';
    const tx = preferPlayer ? player.x : core.x;
    const ty = preferPlayer ? player.y : core.y;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, tx, ty);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(Math.cos(angle) * this.moveSpeed, Math.sin(angle) * this.moveSpeed);
    this.setScale(1 + Math.sin(this.pulse * 0.01) * 0.05);

    if (this.def.isElite && this.def.summonIntervalMs && this.def.summonType) {
      this.summonCd -= delta;
      if (this.summonCd <= 0) {
        this.summonCd = this.def.summonIntervalMs;
        const ox = this.x + (Math.random() - 0.5) * 80;
        const oy = this.y + (Math.random() - 0.5) * 80;
        this.onSummon?.(this.def.summonType, ox, oy);
      }
    }

    const distCore = Phaser.Math.Distance.Between(this.x, this.y, core.x, core.y);
    const distPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    if (this.def.ranged) {
      if (this.attackCd <= 0 && distCore < 360) {
        this.attackCd = this.def.attackRateMs;
        const spit = spitGroup.get() as EnemyProjectile | null;
        if (spit) {
          const a = Phaser.Math.Angle.Between(this.x, this.y, core.x, core.y);
          spit.launch(this.x, this.y, a, this.def.projectileSpeed ?? 240, this.def.damage);
        }
      }
      return;
    }

    if (this.attackCd <= 0) {
      if (distCore < this.def.radius + core.radius + 6) {
        this.attackCd = this.def.attackRateMs;
        core.damage(this.def.damage);
      } else if (preferPlayer && distPlayer < this.def.radius + 18) {
        this.attackCd = this.def.attackRateMs;
        player.damage(this.def.damage);
      }
    }
  }
}

export class EnemyGroup extends Phaser.Physics.Arcade.Group {
  constructor(scene: Phaser.Scene) {
    super(scene.physics.world, scene, {
      classType: Enemy,
      maxSize: 140,
      runChildUpdate: false,
    });
  }

  spawnAt(type: EnemyId, x: number, y: number): Enemy | null {
    const e = this.get(x, y) as Enemy | null;
    if (!e) return null;
    e.spawn(type, x, y);
    return e;
  }

  countActiveLiving(): number {
    return this.countActive(true);
  }

  getElite(): Enemy | null {
    for (const child of this.getChildren()) {
      const e = child as Enemy;
      if (e.active && e.def?.isElite) return e;
    }
    return null;
  }
}
