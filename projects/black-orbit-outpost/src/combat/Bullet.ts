import Phaser from 'phaser';
import { DEPTH } from '../theme';

export class Bullet extends Phaser.Physics.Arcade.Image {
  damage = 0;
  private lifeMs = 900;
  private trailCd = 0;
  private bulletColor = 0xffffff;

  constructor(scene: Phaser.Scene, x = 0, y = 0) {
    super(scene, x, y, 'bullet');
    this.setDepth(DEPTH.bullet);
  }

  fire(
    x: number,
    y: number,
    angle: number,
    speed: number,
    damage: number,
    color: number,
  ): void {
    this.enableBody(true, x, y, true, true);
    this.setTint(color);
    this.bulletColor = color;
    this.damage = damage;
    this.lifeMs = 900;
    this.trailCd = 0;
    this.setRotation(angle);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.velocity.set(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  tick(delta: number): void {
    if (!this.active) return;
    this.lifeMs -= delta;
    this.trailCd -= delta;
    if (this.trailCd <= 0) {
      this.trailCd = 28;
      const ghost = this.scene.add
        .circle(this.x, this.y, 2.2, this.bulletColor, 0.45)
        .setDepth(DEPTH.bullet - 1);
      this.scene.tweens.add({
        targets: ghost,
        alpha: 0,
        scale: 0.2,
        duration: 120,
        onComplete: () => ghost.destroy(),
      });
    }
    if (
      this.lifeMs <= 0 ||
      this.x < -40 ||
      this.y < -40 ||
      this.x > this.scene.scale.width + 40 ||
      this.y > this.scene.scale.height + 40
    ) {
      this.kill();
    }
  }

  kill(): void {
    this.disableBody(true, true);
  }
}

export class BulletGroup extends Phaser.Physics.Arcade.Group {
  constructor(scene: Phaser.Scene) {
    super(scene.physics.world, scene, {
      classType: Bullet,
      maxSize: 120,
      runChildUpdate: false,
    });
  }

  spawn(
    x: number,
    y: number,
    angle: number,
    speed: number,
    damage: number,
    color: number,
  ): Bullet | null {
    const b = this.get(x, y) as Bullet | null;
    if (!b) return null;
    b.fire(x, y, angle, speed, damage, color);
    return b;
  }

  tick(delta: number): void {
    for (const child of this.getChildren()) {
      (child as Bullet).tick(delta);
    }
  }
}
