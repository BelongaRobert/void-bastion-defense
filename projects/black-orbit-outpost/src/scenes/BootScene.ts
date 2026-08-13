import Phaser from 'phaser';
import { Colors } from '../theme';
import { audioBus } from '../audio/AudioBus';

/** Generate stylized procedural textures (no external art pack). */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // Local fonts via CSS (@font-face in index.html).
  }

  create(): void {
    audioBus.unlock();

    this.makeTexture('player', 48, 48, (g) => {
      // Armored defender silhouette
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(10, 8, 28, 32, 6);
      g.fillCircle(24, 14, 10);
      g.fillStyle(0x070b12, 1);
      g.fillRect(18, 20, 12, 6);
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(38, 22, 46, 24, 38, 28); // muzzle stub
    });

    this.makeTexture('enemy_blob', 40, 40, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(20, 22, 16);
      g.fillCircle(12, 14, 8);
      g.fillCircle(28, 14, 8);
      g.fillStyle(0x070b12, 1);
      g.fillCircle(14, 16, 2);
      g.fillCircle(26, 16, 2);
    });

    this.makeTexture('core', 80, 80, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(40, 40, 34);
      g.lineStyle(4, 0x070b12, 1);
      g.strokeCircle(40, 40, 26);
      g.strokeCircle(40, 40, 16);
      g.fillStyle(0x070b12, 1);
      g.fillCircle(40, 40, 7);
      g.lineStyle(2, 0x070b12, 0.8);
      g.strokeRect(28, 28, 24, 24);
    });

    this.makeTexture('bullet', 10, 6, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 1, 10, 4, 2);
    });

    this.makeTexture('spit', 12, 12, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(6, 6, 5);
      g.fillCircle(3, 4, 2);
    });

    this.makeTexture('turret', 48, 48, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(6, 10, 36, 28, 4);
      g.fillCircle(24, 24, 10);
      g.fillRect(24, 18, 20, 12);
      g.fillStyle(0x070b12, 1);
      g.fillCircle(24, 24, 4);
    });

    this.makeTexture('muzzle_flash', 24, 24, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(2, 12, 22, 4, 22, 20);
      g.fillCircle(8, 12, 5);
    });

    this.makeTexture('floor_dot', 4, 4, (g) => {
      g.fillStyle(Colors.steelDark, 1);
      g.fillRect(0, 0, 4, 4);
    });

    // Brief brand splash before menu
    this.cameras.main.setBackgroundColor(Colors.voidNavy);
    this.add.rectangle(0, 0, this.scale.width, this.scale.height, Colors.voidNavy, 1).setOrigin(0);
    const core = this.add.image(this.scale.width / 2, this.scale.height / 2 - 20, 'core').setDisplaySize(96, 96);
    core.setTint(Colors.core).setAlpha(0);
    const credit = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 70, 'BELONGAROBERT', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '18px',
        color: '#8fa3b8',
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({ targets: [core, credit], alpha: 1, duration: 500 });
    this.time.delayedCall(1100, () => {
      this.tweens.add({
        targets: [core, credit],
        alpha: 0,
        duration: 400,
        onComplete: () => this.scene.start('Menu'),
      });
    });
  }

  private makeTexture(
    key: string,
    w: number,
    h: number,
    draw: (g: Phaser.GameObjects.Graphics) => void,
  ): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
