import Phaser from 'phaser';
import { Colors, GAME_HEIGHT, GAME_WIDTH } from '../theme';
import { metaState, resetRun, runState, applyMetaUnlocksToRun } from '../state/RunState';
import { saveService } from '../state/SaveService';

export class MenuScene extends Phaser.Scene {
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
      .text(GAME_WIDTH / 2, 110, 'BLACK ORBIT OUTPOST', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '42px',
        color: '#e8f0f7',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 165, 'Hold the core. Survive the dark. — Nyx is listening.', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '16px',
        color: '#7dffb3',
      })
      .setOrigin(0.5);

    const lines = [
      '[1] NEW RUN (Act Select)',
      this.canContinue ? '[2] CONTINUE RUN' : '[2] CONTINUE (no save)',
      '[3] META UNLOCKS',
      '[4] OPTIONS / ACHIEVEMENTS',
      '[0] DEV Act3 W8 Orbit Waker',
    ];
    this.add
      .text(GAME_WIDTH / 2, 240, lines.join('\n'), {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '18px',
        color: '#e8b84a',
        align: 'center',
        lineSpacing: 10,
      })
      .setOrigin(0.5, 0);

    this.add
      .text(
        GAME_WIDTH / 2,
        430,
        `Marks ${metaState.orbitMarks}  ·  A1 ${metaState.act1Cleared ? '✓' : '—'} A2 ${metaState.act2Cleared ? '✓' : '—'} A3 ${metaState.act3Cleared ? '✓' : '—'}  ·  Ach ${metaState.achievements.length}`,
        {
          fontFamily: '"Share Tech Mono", monospace',
          fontSize: '13px',
          color: '#8fa3b8',
        },
      )
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 48, 'A Belongarobert game  ·  M4 Campaign Complete', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '14px',
        color: '#8fa3b8',
      })
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown-ONE', () => this.scene.start('ActSelect'));
    this.input.keyboard?.on('keydown-TWO', () => {
      if (!this.canContinue) return;
      saveService.load();
      this.scene.start('Combat');
    });
    this.input.keyboard?.on('keydown-THREE', () => this.scene.start('Meta'));
    this.input.keyboard?.on('keydown-FOUR', () => this.scene.start('Options'));
    this.input.keyboard?.on('keydown-ZERO', () => this.beginDev(3, 8));
  }

  private beginDev(act: number, wave: number): void {
    resetRun();
    runState.act = act;
    runState.wave = wave;
    runState.salvage = 200;
    runState.hasAutogunNest = true;
    runState.autogunNestPos = { x: 900, y: 400 };
    runState.hardpointsPlaced = 1;
    runState.damageBonus = 6;
    runState.nestDamageBonus = 5;
    runState.ammoReserveBonus = 14;
    metaState.act1Cleared = true;
    metaState.act2Cleared = true;
    applyMetaUnlocksToRun();
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
