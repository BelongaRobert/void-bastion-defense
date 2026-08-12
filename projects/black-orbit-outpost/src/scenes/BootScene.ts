import Phaser from 'phaser';
import { Colors } from '../theme';

/** Generate placeholder textures so M1 runs without external art. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // Fonts load via CSS; nothing else required for M1 placeholders.
  }

  create(): void {
    this.makeTexture('player', 32, 32, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(16, 16, 14);
      g.fillStyle(0x070b12, 1);
      g.fillCircle(16, 16, 5);
    });
    this.makeTexture('enemy_blob', 32, 32, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(16, 16, 15);
    });
    this.makeTexture('core', 64, 64, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(32, 32, 28);
      g.lineStyle(3, 0x070b12, 1);
      g.strokeCircle(32, 32, 18);
      g.fillStyle(0x070b12, 1);
      g.fillCircle(32, 32, 6);
    });
    this.makeTexture('bullet', 8, 8, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(4, 4, 3);
    });
    this.makeTexture('spit', 10, 10, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(5, 5, 4);
    });
    this.makeTexture('turret', 40, 40, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(4, 4, 32, 32, 4);
      g.fillStyle(0x070b12, 1);
      g.fillCircle(20, 20, 6);
    });
    this.makeTexture('floor_dot', 4, 4, (g) => {
      g.fillStyle(Colors.steelDark, 1);
      g.fillRect(0, 0, 4, 4);
    });

    this.scene.start('Menu');
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
