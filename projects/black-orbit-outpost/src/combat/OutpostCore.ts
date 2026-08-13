import Phaser from 'phaser';
import { Colors, DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../theme';
import { runState } from '../state/RunState';
import { settingsState } from '../state/SettingsState';
import { audioBus } from '../audio/AudioBus';

export class OutpostCore extends Phaser.Physics.Arcade.Image {
  radius = 36;
  private ring: Phaser.GameObjects.Arc;
  private hpText: Phaser.GameObjects.Text;
  private pulse = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'core');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(DEPTH.core);
    this.setDisplaySize(64, 64);
    this.setTint(Colors.core);

    this.ring = scene.add
      .circle(x, y, 48, Colors.biolume, 0)
      .setStrokeStyle(2, Colors.biolume, 0.5)
      .setDepth(DEPTH.core - 1);

    this.hpText = scene.add
      .text(x, y + 52, '', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '12px',
        color: '#7dffb3',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud)
      .setScrollFactor(1);

    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    body.setCircle(this.radius);
    body.updateFromGameObject();
    this.refreshHp();
  }

  damage(amount: number): void {
    runState.coreHp = Math.max(0, runState.coreHp - amount);
    this.refreshHp();
    audioBus.coreAlarm();
    if (settingsState.screenShake) this.scene.cameras.main.shake(80, 0.004);
    this.setTint(Colors.arterial);
    this.scene.time.delayedCall(80, () => this.setTint(Colors.core));
  }

  heal(amount: number): void {
    runState.coreHp = Math.min(runState.coreMaxHp, runState.coreHp + amount);
    this.refreshHp();
  }

  refreshHp(): void {
    const pct = runState.coreHp / runState.coreMaxHp;
    this.hpText.setText(`CORE ${Math.ceil(runState.coreHp)}`);
    this.hpText.setColor(pct < 0.35 ? '#ff3b5c' : '#7dffb3');
    this.ring.setStrokeStyle(2, pct < 0.35 ? Colors.arterial : Colors.biolume, 0.55);
  }

  updateVisual(delta: number): void {
    this.pulse += delta;
    const s = 1 + Math.sin(this.pulse * 0.004) * 0.04;
    this.setScale(s);
    this.ring.setScale(s);
  }

  isDead(): boolean {
    return runState.coreHp <= 0;
  }

  static defaultPosition(): { x: number; y: number } {
    return { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
  }
}
