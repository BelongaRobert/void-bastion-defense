import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../theme';

/**
 * Mobile / touch spike: left virtual stick + right fire zone.
 * Non-blocking prototype — enable via Options or automatic on coarse pointers.
 */
export class TouchControls {
  private root: Phaser.GameObjects.Container;
  private base: Phaser.GameObjects.Arc;
  private knob: Phaser.GameObjects.Arc;
  private fireBtn: Phaser.GameObjects.Arc;
  private fireLabel: Phaser.GameObjects.Text;
  private stickId: number | null = null;
  private fireId: number | null = null;
  private move = new Phaser.Math.Vector2(0, 0);
  private firing = false;
  private enabled = false;
  private readonly stickOrigin = { x: 140, y: GAME_HEIGHT - 140 };
  private readonly fireOrigin = { x: GAME_WIDTH - 140, y: GAME_HEIGHT - 140 };
  private readonly maxRadius = 56;

  constructor(private scene: Phaser.Scene) {
    this.base = scene.add.circle(0, 0, this.maxRadius, 0x1a2433, 0.45).setStrokeStyle(2, 0x8fa3b8, 0.7);
    this.knob = scene.add.circle(0, 0, 28, 0x7dffb3, 0.55);
    this.fireBtn = scene.add.circle(0, 0, 52, 0xc41e3a, 0.4).setStrokeStyle(2, 0xff3b5c, 0.8);
    this.fireLabel = scene.add
      .text(0, 0, 'FIRE', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '14px',
        color: '#e8f0f7',
      })
      .setOrigin(0.5);

    const stick = scene.add.container(this.stickOrigin.x, this.stickOrigin.y, [this.base, this.knob]);
    const fire = scene.add.container(this.fireOrigin.x, this.fireOrigin.y, [
      this.fireBtn,
      this.fireLabel,
    ]);
    this.root = scene.add
      .container(0, 0, [stick, fire])
      .setDepth(DEPTH.hud + 50)
      .setScrollFactor(0)
      .setVisible(false);

    scene.input.addPointer(2);
    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.root.setVisible(on);
    if (!on) {
      this.move.set(0, 0);
      this.firing = false;
      this.stickId = null;
      this.fireId = null;
      this.knob.setPosition(0, 0);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getMove(): Phaser.Math.Vector2 {
    return this.move.clone();
  }

  isFiring(): boolean {
    return this.firing;
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.onDown, this);
    this.scene.input.off('pointermove', this.onMove, this);
    this.scene.input.off('pointerup', this.onUp, this);
    this.root.destroy(true);
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (!this.enabled) return;
    if (p.x < GAME_WIDTH * 0.45 && this.stickId === null) {
      this.stickId = p.id;
      this.updateStick(p);
    } else if (p.x >= GAME_WIDTH * 0.55 && this.fireId === null) {
      this.fireId = p.id;
      this.firing = true;
      this.fireBtn.setFillStyle(0xff3b5c, 0.7);
    }
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (!this.enabled) return;
    if (p.id === this.stickId) this.updateStick(p);
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (!this.enabled) return;
    if (p.id === this.stickId) {
      this.stickId = null;
      this.move.set(0, 0);
      this.knob.setPosition(0, 0);
    }
    if (p.id === this.fireId) {
      this.fireId = null;
      this.firing = false;
      this.fireBtn.setFillStyle(0xc41e3a, 0.4);
    }
  }

  private updateStick(p: Phaser.Input.Pointer): void {
    const dx = p.x - this.stickOrigin.x;
    const dy = p.y - this.stickOrigin.y;
    const len = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(len, this.maxRadius);
    const nx = (dx / len) * clamped;
    const ny = (dy / len) * clamped;
    this.knob.setPosition(nx, ny);
    this.move.set(nx / this.maxRadius, ny / this.maxRadius);
    if (this.move.lengthSq() > 1) this.move.normalize();
  }
}

export function prefersTouchControls(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const touch = navigator.maxTouchPoints > 0;
  return !!(coarse || (touch && window.innerWidth < 1100));
}
