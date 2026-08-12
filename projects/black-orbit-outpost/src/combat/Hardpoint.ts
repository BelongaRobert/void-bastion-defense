import Phaser from 'phaser';
import { Colors, DEPTH } from '../theme';
import type { EnemyGroup } from './Enemy';

export class AutogunNest extends Phaser.Physics.Arcade.Image {
  private fireCd = 0;
  private range = 280;
  private damage = 7;
  private barrel: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'turret');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(DEPTH.hardpoint);
    this.setDisplaySize(36, 36);
    this.setTint(Colors.steel);
    this.barrel = scene.add
      .rectangle(x, y, 22, 6, Colors.warning)
      .setDepth(DEPTH.hardpoint + 1);
  }

  updateNest(delta: number, enemies: EnemyGroup, spawnBullet: (x: number, y: number, angle: number) => void): void {
    this.fireCd -= delta;
    let nearest: Phaser.Physics.Arcade.Sprite | null = null;
    let best = this.range;
    for (const child of enemies.getChildren()) {
      const e = child as Phaser.Physics.Arcade.Sprite;
      if (!e.active) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
      if (d < best) {
        best = d;
        nearest = e;
      }
    }
    if (!nearest) {
      this.barrel.setPosition(this.x, this.y);
      return;
    }
    const ang = Phaser.Math.Angle.Between(this.x, this.y, nearest.x, nearest.y);
    this.barrel.setPosition(this.x + Math.cos(ang) * 14, this.y + Math.sin(ang) * 14);
    this.barrel.setRotation(ang);
    if (this.fireCd <= 0) {
      this.fireCd = 280;
      spawnBullet(this.x + Math.cos(ang) * 20, this.y + Math.sin(ang) * 20, ang);
    }
  }

  getDamage(): number {
    return this.damage;
  }

  destroyNest(): void {
    this.barrel.destroy();
    this.destroy();
  }
}
