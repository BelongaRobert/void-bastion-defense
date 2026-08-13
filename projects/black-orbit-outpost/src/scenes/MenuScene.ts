import Phaser from 'phaser';
import { Colors, GAME_HEIGHT, GAME_WIDTH } from '../theme';
import { isDeckLikely, setRichPresence } from '../platform/DesktopBridge';
import { metaState, resetRun, runState, applyMetaUnlocksToRun } from '../state/RunState';
import { saveService } from '../state/SaveService';
import { settingsState } from '../state/SettingsState';
import { audioBus } from '../audio/AudioBus';
import { isDevBuild } from '../platform/BuildFlags';
import { Atmosphere, revealText } from '../fx/Atmosphere';

export class MenuScene extends Phaser.Scene {
  private canContinue = false;
  private atmosphere!: Atmosphere;

  constructor() {
    super('Menu');
  }

  create(): void {
    saveService.load();
    this.canContinue = saveService.hasContinue();
    audioBus.unlock();
    audioBus.startAmbient('menu');
    if (isDeckLikely() && !localStorage.getItem('boo_deck_ui_init')) {
      settingsState.uiScale = 'large';
      localStorage.setItem('boo_deck_ui_init', '1');
      saveService.saveMetaOnly();
    }
    setRichPresence('In menus');
    this.cameras.main.setBackgroundColor(Colors.voidNavy);
    this.atmosphere = new Atmosphere(this, { dense: true, coreGlow: true, dust: true });

    // Hero Core — brand-forward visual plane
    const core = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT * 0.42, 'core').setDisplaySize(140, 140);
    core.setTint(Colors.core).setAlpha(0.95).setDepth(5);
    this.tweens.add({
      targets: core,
      scale: { from: 1, to: 1.06 },
      duration: 2800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    const ring = this.add
      .circle(GAME_WIDTH / 2, GAME_HEIGHT * 0.42, 95, Colors.biolume, 0)
      .setStrokeStyle(2, Colors.biolume, 0.45)
      .setDepth(4);
    this.tweens.add({
      targets: ring,
      scale: { from: 0.92, to: 1.15 },
      alpha: { from: 0.55, to: 0.15 },
      duration: 2400,
      yoyo: true,
      repeat: -1,
    });

    const brand = this.add
      .text(GAME_WIDTH / 2, 72, 'BLACK ORBIT OUTPOST', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '46px',
        color: '#e8f0f7',
      })
      .setOrigin(0.5)
      .setDepth(20);
    revealText(this, brand, 80, 18);

    const tag = this.add
      .text(GAME_WIDTH / 2, 122, 'Hold the core. Survive the dark.', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '17px',
        color: '#7dffb3',
      })
      .setOrigin(0.5)
      .setDepth(20);
    revealText(this, tag, 280, 10);

    const lines = [
      '[1]  NEW RUN',
      this.canContinue ? '[2]  CONTINUE' : '[2]  CONTINUE  —  no save',
      '[3]  META',
      '[4]  OPTIONS',
    ];
    if (isDevBuild()) lines.push('[0]  DEV · Act3 Elite');

    const menu = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 210, lines.join('\n'), {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '18px',
        color: '#e8b84a',
        align: 'center',
        lineSpacing: 12,
      })
      .setOrigin(0.5, 0)
      .setDepth(20);
    revealText(this, menu, 480, 16);

    const meta = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 72,
        `Orbit Marks ${metaState.orbitMarks}   ·   Acts ${metaState.act1Cleared ? 'I' : '·'}${metaState.act2Cleared ? ' II' : ''}${metaState.act3Cleared ? ' III' : ''}   ·   A Belongarobert game`,
        {
          fontFamily: '"Share Tech Mono", monospace',
          fontSize: '13px',
          color: '#8fa3b8',
        },
      )
      .setOrigin(0.5)
      .setDepth(20);
    revealText(this, meta, 700, 8);

    this.cameras.main.fadeIn(600, 7, 11, 18);

    this.input.keyboard?.on('keydown-ONE', () => this.go('ActSelect'));
    this.input.keyboard?.on('keydown-TWO', () => {
      if (!this.canContinue) return;
      audioBus.ui();
      saveService.load();
      audioBus.startAmbient('combat');
      this.scene.start('Combat');
    });
    this.input.keyboard?.on('keydown-THREE', () => this.go('Meta'));
    this.input.keyboard?.on('keydown-FOUR', () => this.go('Options'));
    if (isDevBuild()) {
      this.input.keyboard?.on('keydown-ZERO', () => this.beginDev(3, 8));
    }
  }

  update(_t: number, _d: number): void {
    this.atmosphere?.update(this.time.now);
  }

  private go(scene: string): void {
    audioBus.ui();
    this.atmosphere?.destroy();
    this.scene.start(scene);
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
    audioBus.startAmbient('elite');
    this.atmosphere?.destroy();
    this.scene.start('Combat');
  }
}
