import Phaser from 'phaser';
import { Colors, DEPTH } from '../theme';
import { settingsState } from '../state/SettingsState';

export class GoreFX {
  private scene: Phaser.Scene;
  private bloodGroup: Phaser.GameObjects.Group;
  private decalCount = 0;
  private readonly maxDecals = 60;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.bloodGroup = scene.add.group();
  }

  burst(x: number, y: number, color: number = Colors.arterial, amount = 14): void {
    if (!settingsState.gore) {
      // Minimal spark when gore off
      amount = Math.min(3, amount);
      color = Colors.steel;
    }
    const capped = Math.min(amount, settingsState.gore ? 18 : 3);
    for (let i = 0; i < capped; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 180;
      const r = 2 + Math.random() * 4;
      const drop = this.scene.add.circle(x, y, r, color, 0.9).setDepth(DEPTH.gore);
      this.bloodGroup.add(drop);
      this.scene.tweens.add({
        targets: drop,
        x: x + Math.cos(angle) * speed * 0.25,
        y: y + Math.sin(angle) * speed * 0.25,
        alpha: 0,
        duration: 280 + Math.random() * 220,
        onComplete: () => {
          drop.destroy();
          if (settingsState.gore) {
            this.stampDecal(x + Math.cos(angle) * 18, y + Math.sin(angle) * 12, color);
          }
        },
      });
    }
  }

  private stampDecal(x: number, y: number, color: number): void {
    if (this.decalCount >= this.maxDecals) {
      const oldest = this.bloodGroup.getFirst(true) as Phaser.GameObjects.Arc | null;
      if (oldest) {
        oldest.destroy();
        this.decalCount -= 1;
      }
    }
    const blot = this.scene.add
      .circle(x, y, 3 + Math.random() * 5, color, 0.35)
      .setDepth(DEPTH.blood);
    this.bloodGroup.add(blot);
    this.decalCount += 1;
  }

  clear(): void {
    this.bloodGroup.clear(true, true);
    this.decalCount = 0;
  }
}
