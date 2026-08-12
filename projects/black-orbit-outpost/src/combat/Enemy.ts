import Phaser from 'phaser';
import { ENEMIES, type EnemyDef, type EnemyId } from '../content/enemies';
import { Colors, DEPTH } from '../theme';
import type { OutpostCore } from './OutpostCore';
import type { Player } from './Player';
import type { GoreFX } from './GoreFX';

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
  private attackCd = 0;
  private pulse = 0;

  constructor(scene: Phaser.Scene, x = 0, y = 0) {
    super(scene, x, y, 'enemy_blob');
    this.setDepth(DEPTH.enemy);
  }

  spawn(type: EnemyId, x: number, y: number): void {
    this.def = ENEMIES[type];
    this.hp = this.def.hp;
    this.enableBody(true, x, y, true, true);
    this.setTint(this.def.color);
    this.setDisplaySize(this.def.radius * 2, this.def.radius * 2);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(this.def.radius);
    body.setAllowGravity(false);
    body.setCollideWorldBounds(true);
    this.attackCd = 400;
    this.pulse = 0;
  }

  takeDamage(amount: number, gore: GoreFX): boolean {
    this.hp -= amount;
    this.setTint(0xffffff);
    this.scene.time.delayedCall(50, () => {
      if (this.active) this.setTint(this.def.color);
    });
    if (this.hp <= 0) {
      gore.burst(this.x, this.y, Colors.arterial, 16);
      this.kill();
      return true;
    }
    gore.burst(this.x, this.y, Colors.arterialBright, 4);
    return false;
  }

  kill(): void {
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

    const preferPlayer = !this.def.preferCore || this.def.id === 'runner';
    const tx = preferPlayer ? player.x : core.x;
    const ty = preferPlayer ? player.y : core.y;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, tx, ty);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(Math.cos(angle) * this.def.speed, Math.sin(angle) * this.def.speed);
    this.setScale(1 + Math.sin(this.pulse * 0.01) * 0.05);

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
      maxSize: 80,
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
}
