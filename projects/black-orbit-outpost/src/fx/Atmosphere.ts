import Phaser from 'phaser';
import { Colors, DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../theme';

/** Full-bleed cosmic atmosphere: stars, dust, vignette, optional core glow. */
export class Atmosphere {
  private stars: Phaser.GameObjects.Graphics;
  private vignette: Phaser.GameObjects.Graphics;
  private coreGlow: Phaser.GameObjects.Arc | null = null;
  private twinkle: { x: number; y: number; r: number; phase: number }[] = [];
  private motes: Phaser.GameObjects.Arc[] = [];
  private scene: Phaser.Scene;
  private lastTwinkle = 0;

  constructor(scene: Phaser.Scene, opts?: {
    coreGlow?: boolean;
    dust?: boolean;
    dense?: boolean;
    /** overlay = vignette+dust only (keep existing arena art) */
    mode?: 'full' | 'overlay';
  }) {
    this.scene = scene;
    const mode = opts?.mode ?? 'full';
    this.stars = scene.add.graphics().setDepth(DEPTH.floor);
    if (mode === 'full') {
      this.drawStars(opts?.dense ? 140 : 90);
    }

    this.vignette = scene.add.graphics().setDepth(DEPTH.hud - 1).setScrollFactor(0);
    this.drawVignette();

    if (opts?.coreGlow !== false && mode === 'full') {
      this.coreGlow = scene.add
        .circle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 160, Colors.biolume, 0.05)
        .setDepth(DEPTH.floor + 1);
      scene.tweens.add({
        targets: this.coreGlow,
        alpha: { from: 0.04, to: 0.12 },
        scale: { from: 0.95, to: 1.12 },
        duration: 3200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    if (opts?.dust !== false) {
      this.spawnDustSprites(opts?.dense ? 28 : 18);
    }
    this.overlayOnly = mode === 'overlay';
  }

  private overlayOnly = false;

  update(time: number): void {
    if (this.overlayOnly) return;
    if (time - this.lastTwinkle < 90) return;
    this.lastTwinkle = time;
    this.stars.clear();
    this.drawStarsBase();
    for (const s of this.twinkle) {
      const a = 0.15 + (Math.sin(time * 0.003 + s.phase) + 1) * 0.2;
      this.stars.fillStyle(0xffffff, a);
      this.stars.fillCircle(s.x, s.y, s.r);
    }
  }

  destroy(): void {
    this.stars.destroy();
    this.vignette.destroy();
    this.coreGlow?.destroy();
    for (const m of this.motes) m.destroy();
    this.motes = [];
  }

  private drawStars(count: number): void {
    this.twinkle = [];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * GAME_WIDTH;
      const y = Math.random() * GAME_HEIGHT;
      const r = 0.6 + Math.random() * 1.8;
      if (i % 4 === 0) {
        this.twinkle.push({ x, y, r, phase: Math.random() * Math.PI * 2 });
      }
    }
    this.drawStarsBase();
  }

  private drawStarsBase(): void {
    this.stars.fillStyle(Colors.voidNavy, 1);
    this.stars.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.stars.fillStyle(0x0c1a28, 0.55);
    this.stars.fillCircle(GAME_WIDTH * 0.2, GAME_HEIGHT * 0.3, 280);
    this.stars.fillStyle(0x1a0c18, 0.35);
    this.stars.fillCircle(GAME_WIDTH * 0.85, GAME_HEIGHT * 0.7, 260);
    for (const s of this.twinkle) {
      this.stars.fillStyle(0x7dffb3, 0.12);
      this.stars.fillCircle(s.x, s.y, s.r);
    }
    for (let i = 0; i < 70; i++) {
      this.stars.fillStyle(0xe8f0f7, 0.06 + Math.random() * 0.1);
      this.stars.fillCircle(Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT, 0.7 + Math.random());
    }
  }

  private drawVignette(): void {
    const g = this.vignette;
    g.clear();
    g.fillStyle(0x000000, 0.35);
    g.fillRect(0, 0, GAME_WIDTH, 36);
    g.fillRect(0, GAME_HEIGHT - 36, GAME_WIDTH, 36);
    g.fillRect(0, 0, 40, GAME_HEIGHT);
    g.fillRect(GAME_WIDTH - 40, 0, 40, GAME_HEIGHT);
    g.fillStyle(0x000000, 0.2);
    g.fillRect(0, 0, GAME_WIDTH, 18);
    g.fillRect(0, GAME_HEIGHT - 18, GAME_WIDTH, 18);
  }

  private spawnDustSprites(count: number): void {
    for (let i = 0; i < count; i++) {
      const mote = this.scene.add
        .circle(
          Math.random() * GAME_WIDTH,
          Math.random() * GAME_HEIGHT,
          1 + Math.random() * 1.5,
          Colors.biolume,
          0.15 + Math.random() * 0.25,
        )
        .setDepth(DEPTH.floor + 2);
      this.motes.push(mote);
      this.scene.tweens.add({
        targets: mote,
        x: mote.x + (Math.random() - 0.5) * 120,
        y: mote.y - 40 - Math.random() * 80,
        alpha: { from: mote.alpha, to: 0.05 },
        duration: 6000 + Math.random() * 5000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }
}

/** Dramatic title entrance: fade + slight rise. */
export function revealText(
  scene: Phaser.Scene,
  text: Phaser.GameObjects.Text,
  delay = 0,
  fromY = 12,
): void {
  const y = text.y;
  text.setAlpha(0).setY(y + fromY);
  scene.tweens.add({
    targets: text,
    alpha: 1,
    y,
    duration: 700,
    delay,
    ease: 'Cubic.easeOut',
  });
}
