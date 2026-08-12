import Phaser from 'phaser';
import { Colors, GAME_HEIGHT, GAME_WIDTH } from '../theme';
import { resetRun } from '../state/RunState';
import { DialogueBox } from '../story/DialogueBox';
import { storyDirector } from '../story/StoryDirector';
import { InputMap } from '../input/InputMap';

export class MenuScene extends Phaser.Scene {
  private dialogue!: DialogueBox;
  private inputMap!: InputMap;
  private starting = false;

  constructor() {
    super('Menu');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(Colors.voidNavy);
    this.drawBackdrop();

    this.add
      .text(GAME_WIDTH / 2, 160, 'BLACK ORBIT OUTPOST', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '42px',
        color: '#e8f0f7',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 220, 'Hold the core. Survive the dark.', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '18px',
        color: '#7dffb3',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 320, '[ CLICK / SPACE — BEGIN ACT 1 ]', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '20px',
        color: '#e8b84a',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 48, 'A Belongarobert game  ·  M1 Vertical Slice', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '14px',
        color: '#8fa3b8',
      })
      .setOrigin(0.5);

    this.dialogue = new DialogueBox(this);
    this.inputMap = new InputMap(this);
    this.starting = false;
  }

  update(): void {
    if (this.dialogue.isOpen()) {
      if (this.inputMap.justConfirmed()) this.dialogue.tryAdvance();
      return;
    }
    if (this.starting) return;
    if (this.inputMap.justConfirmed()) {
      this.starting = true;
      resetRun();
      const beat = storyDirector.getBeat('act1_intro');
      if (beat) {
        this.dialogue.play(beat, () => this.scene.start('Combat'));
      } else {
        this.scene.start('Combat');
      }
    }
  }

  private drawBackdrop(): void {
    const g = this.add.graphics();
    g.fillStyle(0x0f1826, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    for (let i = 0; i < 60; i++) {
      g.fillStyle(0x7dffb3, 0.08 + Math.random() * 0.12);
      g.fillCircle(Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT, 1 + Math.random() * 2);
    }
    g.lineStyle(2, Colors.steelDark, 0.5);
    g.strokeRect(40, 40, GAME_WIDTH - 80, GAME_HEIGHT - 80);
  }
}
