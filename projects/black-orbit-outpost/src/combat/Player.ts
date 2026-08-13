import Phaser from 'phaser';
import { WEAPONS, type WeaponId } from '../content/weapons';
import type { InputMap } from '../input/InputMap';
import { Colors, DEPTH } from '../theme';
import { runState } from '../state/RunState';
import { settingsState } from '../state/SettingsState';
import { audioBus } from '../audio/AudioBus';
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
  private flash: Phaser.GameObjects.Image;
  private emptyClickCd = 0;
  private kick = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.player);
    this.setDisplaySize(30, 30);
    this.setTint(Colors.biolume);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(14);
    body.setCollideWorldBounds(true);
    body.setDrag(900);

    this.bodyRing = scene.add.circle(x, y, 18, Colors.biolume, 0).setStrokeStyle(2, Colors.steel);
    this.muzzle = scene.add.rectangle(x, y, 10, 4, Colors.warning).setDepth(DEPTH.player + 1);
    this.flash = scene.add
      .image(x, y, 'muzzle_flash')
      .setDepth(DEPTH.player + 2)
      .setVisible(false)
      .setTint(Colors.warning);

    (Object.keys(WEAPONS) as WeaponId[]).forEach((id) => {
      this.ammo[id] = WEAPONS[id].magazine + runState.ammoReserveBonus;
    });
  }

  get isReloading(): boolean {
    return this.reloadLeft > 0;
  }

  damage(amount: number): void {
    if (this.invuln > 0) return;
    runState.playerHp = Math.max(0, runState.playerHp - amount);
    this.invuln = 450;
    this.setTint(Colors.arterial);
    audioBus.hit();
    if (settingsState.screenShake) this.scene.cameras.main.shake(60, 0.003);
    this.scene.time.delayedCall(100, () => {
      if (this.active) this.setTint(Colors.biolume);
    });
  }

  heal(amount: number): void {
    runState.playerHp = Math.min(runState.playerMaxHp, runState.playerHp + amount);
  }

  updatePlayer(
    delta: number,
    input: InputMap,
    bullets: BulletGroup,
    frozen: boolean,
    nearestEnemy: { x: number; y: number } | null = null,
  ): void {
    this.fireCd = Math.max(0, this.fireCd - delta);
    this.reloadLeft = Math.max(0, this.reloadLeft - delta);
    this.dashCd = Math.max(0, this.dashCd - delta);
    this.invuln = Math.max(0, this.invuln - delta);
    this.emptyClickCd = Math.max(0, this.emptyClickCd - delta);
    this.kick = Math.max(0, this.kick - delta * 0.08);

    const muzzleDist = 18 + this.kick;
    this.bodyRing.setPosition(this.x, this.y);
    this.muzzle.setPosition(
      this.x + Math.cos(this.aimAngle) * muzzleDist,
      this.y + Math.sin(this.aimAngle) * muzzleDist,
    );
    this.muzzle.setRotation(this.aimAngle);
    this.flash.setPosition(
      this.x + Math.cos(this.aimAngle) * (muzzleDist + 10),
      this.y + Math.sin(this.aimAngle) * (muzzleDist + 10),
    );
    this.flash.setRotation(this.aimAngle);

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
    } else if (input.isTouchActive()) {
      if (nearestEnemy) {
        this.aimAngle = Phaser.Math.Angle.Between(
          this.x,
          this.y,
          nearestEnemy.x,
          nearestEnemy.y,
        );
      } else if (move.lengthSq() > 0.05) {
        this.aimAngle = Math.atan2(move.y, move.x);
      }
    } else {
      const aim = input.getAimWorld();
      let targetX = aim.x;
      let targetY = aim.y;
      if (settingsState.aimAssist && nearestEnemy) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, nearestEnemy.x, nearestEnemy.y);
        const cursorDist = Phaser.Math.Distance.Between(aim.x, aim.y, nearestEnemy.x, nearestEnemy.y);
        if (dist < 320 && cursorDist < 90) {
          targetX = nearestEnemy.x;
          targetY = nearestEnemy.y;
        }
      }
      this.aimAngle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    }

    if (input.isDown('weapon1')) this.weaponId = 'smg';
    if (input.isDown('weapon2')) this.weaponId = 'shotgun';
    if (input.isDown('reload')) this.startReload();

    if (input.isDown('dash') && this.dashCd <= 0 && move.lengthSq() > 0) {
      this.dashCd = 900;
      body.setVelocity(move.x * 520, move.y * 520);
      this.invuln = Math.max(this.invuln, 180);
      audioBus.dash();
    }

    if (input.isDown('fire')) this.tryFire(bullets);
  }

  private magSize(id: WeaponId): number {
    return WEAPONS[id].magazine + runState.ammoReserveBonus;
  }

  private startReload(): void {
    const w = WEAPONS[this.weaponId];
    if (this.reloadLeft > 0) return;
    if (this.ammo[this.weaponId] >= this.magSize(this.weaponId)) return;
    this.reloadLeft = w.reloadMs;
    audioBus.reload();
    this.scene.time.delayedCall(w.reloadMs, () => {
      this.ammo[this.weaponId] = this.magSize(this.weaponId);
    });
  }

  private tryFire(bullets: BulletGroup): void {
    const w = WEAPONS[this.weaponId];
    if (this.reloadLeft > 0 || this.fireCd > 0) return;
    if (this.ammo[this.weaponId] <= 0) {
      if (this.emptyClickCd <= 0) {
        audioBus.emptyClick();
        this.emptyClickCd = 220;
      }
      this.startReload();
      return;
    }

    this.fireCd = w.fireRateMs;
    this.ammo[this.weaponId] -= 1;
    const dmg = w.damage + runState.damageBonus;
    this.kick = w.id === 'shotgun' ? 10 : 4;

    audioBus.shoot(w.id);
    this.flash.setVisible(true).setAlpha(1).setScale(w.id === 'shotgun' ? 1.4 : 0.9);
    this.scene.tweens.add({
      targets: this.flash,
      alpha: 0,
      duration: w.id === 'shotgun' ? 70 : 40,
      onComplete: () => this.flash.setVisible(false),
    });
    if (settingsState.screenShake) {
      this.scene.cameras.main.shake(w.id === 'shotgun' ? 50 : 18, w.id === 'shotgun' ? 0.004 : 0.0015);
    }

    // Slight positional recoil
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.velocity.x -= Math.cos(this.aimAngle) * (w.id === 'shotgun' ? 90 : 25);
    body.velocity.y -= Math.sin(this.aimAngle) * (w.id === 'shotgun' ? 90 : 25);

    for (let i = 0; i < w.pellets; i++) {
      const spread = Phaser.Math.DegToRad((Math.random() - 0.5) * w.spreadDeg);
      const ang = this.aimAngle + spread;
      bullets.spawn(
        this.x + Math.cos(ang) * 20,
        this.y + Math.sin(ang) * 20,
        ang,
        w.bulletSpeed,
        dmg,
        w.color,
      );
    }

    if (this.ammo[this.weaponId] <= 0) this.startReload();
  }

  destroyVisuals(): void {
    this.bodyRing.destroy();
    this.muzzle.destroy();
    this.flash.destroy();
  }
}
