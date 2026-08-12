import Phaser from 'phaser';
import { Colors, GAME_HEIGHT, GAME_WIDTH } from '../theme';
import { metaState, resetRun, runState } from '../state/RunState';
import { saveService } from '../state/SaveService';
import { DialogueBox } from '../story/DialogueBox';
import { storyDirector } from '../story/StoryDirector';
import { InputMap } from '../input/InputMap';

export class MenuScene extends Phaser.Scene {
  private dialogue!: DialogueBox;
  private inputMap!: InputMap;
  private starting = false;
  private canContinue = false;

  constructor() {
    super('Menu');
  }

  create(): void {
    saveService.load();
    this.canContinue = saveService.hasContinue();
    this.cameras.main.setBackgroundColor(Colors.voidNavy);
    this.drawBackdrop();

    this.add
      .text(GAME_WIDTH / 2, 140, 'BLACK ORBIT OUTPOST', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '42px',
        color: '#e8f0f7',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 200, 'Hold the core. Survive the dark.', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '18px',
        color: '#7dffb3',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 280, '[1] NEW ACT 1 RUN', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '20px',
        color: '#e8b84a',
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        320,
        this.canContinue ? '[2] CONTINUE RUN' : '[2] CONTINUE (no save)',
        {
          fontFamily: 'Orbitron, sans-serif',
          fontSize: '18px',
          color: this.canContinue ? '#e8f0f7' : '#556270',
        },
      )
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 360, '[8] DEV: Wave 7   [9] DEV: Wave 8 Elite', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '14px',
        color: '#556270',
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        430,
        `Orbit Marks ${metaState.orbitMarks}  ·  Act 1 ${metaState.act1Cleared ? 'CLEARED' : 'OPEN'}  ·  Best wave ${metaState.bestAct1Wave}`,
        {
          fontFamily: '"Share Tech Mono", monospace',
          fontSize: '14px',
          color: '#8fa3b8',
        },
      )
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 48, 'A Belongarobert game  ·  M2 Act 1 Complete', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '14px',
        color: '#8fa3b8',
      })
      .setOrigin(0.5);

    this.dialogue = new DialogueBox(this);
    this.inputMap = new InputMap(this);
    this.starting = false;

    this.input.keyboard?.on('keydown-ONE', () => this.beginNew());
    this.input.keyboard?.on('keydown-TWO', () => this.beginContinue());
    this.input.keyboard?.on('keydown-EIGHT', () => this.beginDevWave(7));
    this.input.keyboard?.on('keydown-NINE', () => this.beginDevWave(8));
  }

  update(): void {
    if (this.dialogue.isOpen()) {
      if (this.inputMap.justConfirmed()) this.dialogue.tryAdvance();
    }
  }

  private beginNew(): void {
    if (this.starting || this.dialogue.isOpen()) return;
    this.starting = true;
    resetRun();
    metaState.runsStarted += 1;
    saveService.saveRun();
    const beat = storyDirector.getBeat('act1_intro');
    if (beat) {
      this.dialogue.play(beat, () => this.scene.start('Combat'));
    } else {
      this.scene.start('Combat');
    }
  }

  private beginContinue(): void {
    if (this.starting || this.dialogue.isOpen()) return;
    if (!this.canContinue) return;
    this.starting = true;
    saveService.load();
    this.scene.start('Combat');
  }

  private beginDevWave(wave: number): void {
    if (this.starting || this.dialogue.isOpen()) return;
    this.starting = true;
    resetRun();
    runState.wave = wave;
    runState.salvage = 160;
    runState.hasAutogunNest = true;
    runState.autogunNestPos = { x: 900, y: 400 };
    runState.hardpointsPlaced = 1;
    runState.damageBonus = 4;
    runState.nestDamageBonus = 4;
    runState.ammoReserveBonus = 10;
    metaState.runsStarted += 1;
    saveService.saveRun();
    this.scene.start('Combat');
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
