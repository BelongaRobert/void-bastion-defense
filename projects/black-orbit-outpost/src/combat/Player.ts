import Phaser from 'phaser';
import { WEAPONS, type WeaponId } from '../data/weapons';
import type { InputMap } from '../input/InputMap';
import { Colors, DEPTH } from '../theme';
import { runState } from '../state/RunState';
import type { BulletGroup } from './Bullet';

export class Player extends Phaser.Physics.Arcade.Image {
  weaponId: WeaponId = 'smg';
  ammo: Record<WeaponId, number> = { smg: WEAPONS.smg.magazine, shotgun: WEAPONS.shotgun.magazine };
  private fireCd = 0;
  private reloadLeft = 0;
  private dashCd = 0;
  private invuln = 0;
  private aimAngle = 0;
  private muzzle: Phaser.GameObjects.Rectangle;
  private bodyRing: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.player);
    this.setDisplaySize(28, 28);
    this.setTint(Colors.biolume);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(14);
    body.setCollideWorldBounds(true);
    body.setDrag(900);

    this.bodyRing = scene.add.circle(x, y, 18, Colors.biolume, 0).setStrokeStyle(2, Colors.steel);
    this.muzzle = scene.add.rectangle(x, y, 10, 4, Colors.warning).setDepth(DEPTH.player + 1);
  }

  get isReloading(): boolean {
    return this.reloadLeft > 0;
  }

  damage(amount: number): void {
    if (this.invuln > 0) return;
    runState.playerHp = Math.max(0, runState.playerHp - amount);
    this.invuln = 450;
    this.setTint(Colors.arterial);
    this.scene.cameras.main.shake(60, 0.003);
    this.scene.time.delayedCall(100, () => {
      if (this.active) this.setTint(Colors.biolume);
    });
  }

  heal(amount: number): void {
    runState.playerHp = Math.min(runState.playerMaxHp, runState.playerHp + amount);
  }

  updatePlayer(delta: number, input: InputMap, bullets: BulletGroup, frozen: boolean): void {
    this.fireCd = Math.max(0, this.fireCd - delta);
    this.reloadLeft = Math.max(0, this.reloadLeft - delta);
    this.dashCd = Math.max(0, this.dashCd - delta);
    this.invuln = Math.max(0, this.invuln - delta);

    this.bodyRing.setPosition(this.x, this.y);
    this.muzzle.setPosition(
      this.x + Math.cos(this.aimAngle) * 18,
      this.y + Math.sin(this.aimAngle) * 18,
    );
    this.muzzle.setRotation(this.aimAngle);

    if (frozen) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      return;
    }

    const move = input.getMoveVector();
    const speed = 210;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(move.x * speed, move.y * speed);

    const stick = input.getGamepadAimDir();
    if (stick) {
      this.aimAngle = Math.atan2(stick.y, stick.x);
    } else {
      const aim = input.getAimWorld();
      this.aimAngle = Phaser.Math.Angle.Between(this.x, this.y, aim.x, aim.y);
    }

    if (input.isDown('weapon1')) this.weaponId = 'smg';
    if (input.isDown('weapon2')) this.weaponId = 'shotgun';

    if (input.isDown('reload')) this.startReload();

    if (input.isDown('dash') && this.dashCd <= 0 && move.lengthSq() > 0) {
      this.dashCd = 900;
      body.setVelocity(move.x * 520, move.y * 520);
      this.invuln = Math.max(this.invuln, 180);
    }

    if (input.isDown('fire')) this.tryFire(bullets);
  }

  private startReload(): void {
    const w = WEAPONS[this.weaponId];
    if (this.reloadLeft > 0) return;
    if (this.ammo[this.weaponId] >= w.magazine) return;
    this.reloadLeft = w.reloadMs;
    this.scene.time.delayedCall(w.reloadMs, () => {
      this.ammo[this.weaponId] = w.magazine;
    });
  }

  private tryFire(bullets: BulletGroup): void {
    const w = WEAPONS[this.weaponId];
    if (this.reloadLeft > 0 || this.fireCd > 0) return;
    if (this.ammo[this.weaponId] <= 0) {
      this.startReload();
      return;
    }

    this.fireCd = w.fireRateMs;
    this.ammo[this.weaponId] -= 1;

    for (let i = 0; i < w.pellets; i++) {
      const spread = Phaser.Math.DegToRad((Math.random() - 0.5) * w.spreadDeg);
      const ang = this.aimAngle + spread;
      bullets.spawn(
        this.x + Math.cos(ang) * 20,
        this.y + Math.sin(ang) * 20,
        ang,
        w.bulletSpeed,
        w.damage,
        w.color,
      );
    }

    if (this.ammo[this.weaponId] <= 0) this.startReload();
  }

  destroyVisuals(): void {
    this.bodyRing.destroy();
    this.muzzle.destroy();
  }
}
