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
      .text(GAME_WIDTH / 2, 120, 'BLACK ORBIT OUTPOST', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '42px',
        color: '#e8f0f7',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 175, 'Hold the core. Survive the dark. — Nyx is listening.', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '16px',
        color: '#7dffb3',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 250, '[1] NEW RUN (Act Select)', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '20px',
        color: '#e8b84a',
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        295,
        this.canContinue ? '[2] CONTINUE RUN' : '[2] CONTINUE (no save)',
        {
          fontFamily: 'Orbitron, sans-serif',
          fontSize: '18px',
          color: this.canContinue ? '#e8f0f7' : '#556270',
        },
      )
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 340, '[3] META UNLOCKS', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '18px',
        color: '#e8f0f7',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 390, '[8] DEV Act1 W8   [9] DEV Act2 W8 Elite', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '13px',
        color: '#556270',
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        450,
        `Marks ${metaState.orbitMarks}  ·  A1 ${metaState.act1Cleared ? '✓' : '—'}  ·  A2 ${metaState.act2Cleared ? '✓' : '—'}  ·  Best ${metaState.bestAct1Wave}/${metaState.bestAct2Wave}`,
        {
          fontFamily: '"Share Tech Mono", monospace',
          fontSize: '14px',
          color: '#8fa3b8',
        },
      )
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 48, 'A Belongarobert game  ·  M3 Meta + Act 2', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '14px',
        color: '#8fa3b8',
      })
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown-ONE', () => this.scene.start('ActSelect'));
    this.input.keyboard?.on('keydown-TWO', () => this.beginContinue());
    this.input.keyboard?.on('keydown-THREE', () => this.scene.start('Meta'));
    this.input.keyboard?.on('keydown-EIGHT', () => this.beginDev(1, 8));
    this.input.keyboard?.on('keydown-NINE', () => this.beginDev(2, 8));
  }

  private beginContinue(): void {
    if (!this.canContinue) return;
    saveService.load();
    this.scene.start('Combat');
  }

  private beginDev(act: number, wave: number): void {
    resetRun();
    runState.act = act;
    runState.wave = wave;
    runState.salvage = 180;
    runState.hasAutogunNest = true;
    runState.autogunNestPos = { x: 900, y: 400 };
    runState.hardpointsPlaced = 1;
    runState.damageBonus = 5;
    runState.nestDamageBonus = 4;
    runState.ammoReserveBonus = 12;
    if (act === 2) metaState.act1Cleared = true;
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
