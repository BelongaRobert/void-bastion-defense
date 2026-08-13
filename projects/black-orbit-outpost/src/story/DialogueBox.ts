import Phaser from 'phaser';
import type { DialogueLine, StoryBeat } from '../content/story/act1';
import { Colors, DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../theme';
import {
  dialogueAdvanceMs,
  dialogueFontPx,
  dialogueOpenLockMs,
} from '../state/SettingsState';

const PORTRAIT_TINT: Record<DialogueLine['portrait'], number> = {
  hero: 0x4de1c1,
  villain: 0x9b5cff,
  radio: 0x8fa3b8,
};

/**
 * PS2-style talking-head dialogue box.
 * Portrait bust + nameplate + text; advance with click / Space / A.
 */
export class DialogueBox {
  private root: Phaser.GameObjects.Container;
  private portraitBg: Phaser.GameObjects.Rectangle;
  private portraitFace: Phaser.GameObjects.Container;
  private nameText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private hintText: Phaser.GameObjects.Text;
  private lines: DialogueLine[] = [];
  private index = 0;
  private active = false;
  private onComplete: (() => void) | null = null;
  private scene: Phaser.Scene;
  private advanceLock = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const boxW = GAME_WIDTH - 80;
    const boxH = 150;
    const x = 40;
    const y = GAME_HEIGHT - boxH - 28;

    const panel = scene.add
      .rectangle(0, 0, boxW, boxH, Colors.voidNavyMid, 0.94)
      .setOrigin(0)
      .setStrokeStyle(3, Colors.steel);

    this.portraitBg = scene.add
      .rectangle(16, 16, 100, 118, 0x121a28)
      .setOrigin(0)
      .setStrokeStyle(2, Colors.biolume);

    this.portraitFace = scene.add.container(66, 75);

    this.nameText = scene.add
      .text(130, 18, '', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '18px',
        color: '#7dffb3',
      })
      .setOrigin(0);

    this.bodyText = scene.add
      .text(130, 48, '', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: `${dialogueFontPx()}px`,
        color: '#e8f0f7',
        wordWrap: { width: boxW - 160 },
        lineSpacing: 6,
      })
      .setOrigin(0);

    this.hintText = scene.add
      .text(boxW - 16, boxH - 14, 'CLICK / SPACE — NEXT', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '12px',
        color: '#8fa3b8',
      })
      .setOrigin(1, 1);

    this.root = scene.add
      .container(x, y, [
        panel,
        this.portraitBg,
        this.portraitFace,
        this.nameText,
        this.bodyText,
        this.hintText,
      ])
      .setDepth(DEPTH.dialogue)
      .setScrollFactor(0)
      .setVisible(false);
  }

  isOpen(): boolean {
    return this.active;
  }

  play(beat: StoryBeat, onComplete?: () => void): void {
    this.lines = beat.lines;
    this.index = 0;
    this.active = true;
    this.onComplete = onComplete ?? null;
    this.advanceLock = this.scene.time.now + dialogueOpenLockMs();
    this.root.setVisible(true);
    this.renderLine();
  }

  /** Call from scene update when input wants to advance */
  tryAdvance(): void {
    if (!this.active) return;
    if (this.scene.time.now < this.advanceLock) return;
    this.index += 1;
    if (this.index >= this.lines.length) {
      this.close();
      return;
    }
    this.advanceLock = this.scene.time.now + dialogueAdvanceMs();
    this.renderLine();
  }

  private close(): void {
    this.active = false;
    this.root.setVisible(false);
    const cb = this.onComplete;
    this.onComplete = null;
    cb?.();
  }

  private renderLine(): void {
    const line = this.lines[this.index];
    this.nameText.setText(line.name);
    this.bodyText.setFontSize(dialogueFontPx());
    this.bodyText.setText(line.text);
    const tint = PORTRAIT_TINT[line.portrait];
    this.portraitBg.setStrokeStyle(2, tint);
    this.nameText.setColor(
      line.portrait === 'villain' ? '#c9a0ff' : line.portrait === 'radio' ? '#8fa3b8' : '#7dffb3',
    );
    this.buildFace(line.portrait, tint);
  }

  private buildFace(kind: DialogueLine['portrait'], tint: number): void {
    this.portraitFace.removeAll(true);
    if (kind === 'villain') {
      // Nyx — elongated, arterial eyes, crown spikes
      const head = this.scene.add.ellipse(0, -6, 52, 58, tint, 0.9);
      const spikeL = this.scene.add.triangle(-18, -36, 0, 0, -10, -22, 10, -8, Colors.arterial);
      const spikeR = this.scene.add.triangle(18, -36, 0, 0, -10, -8, 10, -22, Colors.arterial);
      const eyeL = this.scene.add.ellipse(-11, -10, 10, 6, Colors.arterial, 1);
      const eyeR = this.scene.add.ellipse(11, -10, 10, 6, Colors.arterial, 1);
      const grin = this.scene.add.rectangle(0, 10, 26, 3, Colors.arterial);
      this.portraitFace.add([head, spikeL, spikeR, eyeL, eyeR, grin]);
    } else if (kind === 'radio') {
      const box = this.scene.add.rectangle(0, 0, 52, 40, Colors.steelDark).setStrokeStyle(2, Colors.steel);
      const dial = this.scene.add.circle(-12, 0, 8, Colors.biolumeDim);
      const ant = this.scene.add.rectangle(16, -22, 3, 22, Colors.steel);
      this.portraitFace.add([box, dial, ant]);
    } else {
      // Defender — helmeted biolume visor
      const helm = this.scene.add.rectangle(0, -4, 44, 48, tint, 0.9).setStrokeStyle(2, Colors.steel);
      const visor = this.scene.add.rectangle(0, -6, 28, 10, Colors.voidNavy, 1);
      const chin = this.scene.add.rectangle(0, 18, 22, 8, Colors.steelDark);
      this.portraitFace.add([helm, visor, chin]);
    }
  }

  destroy(): void {
    this.root.destroy(true);
  }
}
