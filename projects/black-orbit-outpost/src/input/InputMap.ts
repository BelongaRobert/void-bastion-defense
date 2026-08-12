import Phaser from 'phaser';
import type { TouchControls } from './TouchControls';

export type Action =
  | 'fire'
  | 'reload'
  | 'weapon1'
  | 'weapon2'
  | 'dash'
  | 'interact'
  | 'pause';

/**
 * Keyboard + mouse + gamepad + optional touch spike.
 */
export class InputMap {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private pointerHeld = false;
  private confirmPulse = false;
  private padPrev: boolean[] = [];
  private scene: Phaser.Scene;
  private touch: TouchControls | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const kb = scene.input.keyboard;
    if (!kb) throw new Error('Keyboard plugin required');

    this.cursors = kb.createCursorKeys();
    this.keys = {
      w: kb.addKey('W'),
      a: kb.addKey('A'),
      s: kb.addKey('S'),
      d: kb.addKey('D'),
      r: kb.addKey('R'),
      space: kb.addKey('SPACE'),
      shift: kb.addKey('SHIFT'),
      e: kb.addKey('E'),
      one: kb.addKey('ONE'),
      two: kb.addKey('TWO'),
      enter: kb.addKey('ENTER'),
      esc: kb.addKey('ESC'),
    };

    scene.input.on('pointerdown', () => {
      this.pointerHeld = true;
      this.confirmPulse = true;
    });
    scene.input.on('pointerup', () => {
      this.pointerHeld = false;
    });
  }

  attachTouch(touch: TouchControls | null): void {
    this.touch = touch;
  }

  isTouchActive(): boolean {
    return !!this.touch?.isEnabled();
  }

  getMoveVector(): Phaser.Math.Vector2 {
    const v = new Phaser.Math.Vector2(0, 0);
    if (this.cursors.left?.isDown || this.keys.a.isDown) v.x -= 1;
    if (this.cursors.right?.isDown || this.keys.d.isDown) v.x += 1;
    if (this.cursors.up?.isDown || this.keys.w.isDown) v.y -= 1;
    if (this.cursors.down?.isDown || this.keys.s.isDown) v.y += 1;

    const pad = this.getPad();
    if (pad && pad.axes.length >= 2) {
      const ax = pad.axes[0].getValue();
      const ay = pad.axes[1].getValue();
      if (Math.abs(ax) > 0.2) v.x += ax;
      if (Math.abs(ay) > 0.2) v.y += ay;
    }

    if (this.touch?.isEnabled()) {
      const tm = this.touch.getMove();
      if (tm.lengthSq() > 0.02) {
        v.x += tm.x;
        v.y += tm.y;
      }
    }

    if (v.lengthSq() > 1) v.normalize();
    return v;
  }

  isDown(action: Action): boolean {
    const pad = this.getPad();
    switch (action) {
      case 'fire':
        return (
          (!this.touch?.isEnabled() && this.pointerHeld) ||
          this.padPressed(pad, 7) ||
          (!!this.touch?.isEnabled() && this.touch.isFiring())
        );
      case 'reload':
        return Phaser.Input.Keyboard.JustDown(this.keys.r) || this.padJust(pad, 3);
      case 'weapon1':
        return Phaser.Input.Keyboard.JustDown(this.keys.one) || this.padJust(pad, 4);
      case 'weapon2':
        return Phaser.Input.Keyboard.JustDown(this.keys.two) || this.padJust(pad, 5);
      case 'dash':
        return Phaser.Input.Keyboard.JustDown(this.keys.shift) || this.padJust(pad, 0);
      case 'interact':
        return Phaser.Input.Keyboard.JustDown(this.keys.e) || this.padJust(pad, 2);
      case 'pause':
        return Phaser.Input.Keyboard.JustDown(this.keys.esc);
      default:
        return false;
    }
  }

  /** Edge-triggered confirm for UI / dialogue */
  justConfirmed(): boolean {
    const key =
      Phaser.Input.Keyboard.JustDown(this.keys.space) ||
      Phaser.Input.Keyboard.JustDown(this.keys.enter);
    const pad = this.getPad();
    const clicked = this.confirmPulse;
    this.confirmPulse = false;
    return clicked || key || this.padJust(pad, 0);
  }

  getAimWorld(): Phaser.Math.Vector2 {
    const p = this.scene.input.activePointer;
    return new Phaser.Math.Vector2(p.worldX, p.worldY);
  }

  getGamepadAimDir(): Phaser.Math.Vector2 | null {
    const pad = this.getPad();
    if (!pad || pad.axes.length < 4) return null;
    const rx = pad.axes[2].getValue();
    const ry = pad.axes[3].getValue();
    if (Math.abs(rx) + Math.abs(ry) < 0.35) return null;
    return new Phaser.Math.Vector2(rx, ry).normalize();
  }

  private getPad(): Phaser.Input.Gamepad.Gamepad | null {
    const gp = this.scene.input.gamepad;
    if (!gp || gp.total === 0) return null;
    return gp.getPad(0) ?? null;
  }

  private padPressed(pad: Phaser.Input.Gamepad.Gamepad | null, index: number): boolean {
    return !!pad?.buttons[index]?.pressed;
  }

  private padJust(pad: Phaser.Input.Gamepad.Gamepad | null, index: number): boolean {
    const pressed = this.padPressed(pad, index);
    const was = this.padPrev[index] ?? false;
    this.padPrev[index] = pressed;
    return pressed && !was;
  }
}
