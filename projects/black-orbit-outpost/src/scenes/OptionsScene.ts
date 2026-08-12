import Phaser from 'phaser';
import { InputMap } from '../input/InputMap';
import { settingsState, type SettingsState } from '../state/SettingsState';
import { saveService } from '../state/SaveService';
import { ACHIEVEMENTS, achievementService } from '../meta/Achievements';
import { Colors, GAME_HEIGHT, GAME_WIDTH } from '../theme';

export class OptionsScene extends Phaser.Scene {
  private inputMap!: InputMap;
  private body!: Phaser.GameObjects.Text;

  constructor() {
    super('Options');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(Colors.voidNavy);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a1018, 1).setOrigin(0);

    this.add
      .text(GAME_WIDTH / 2, 36, 'OPTIONS', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '28px',
        color: '#e8f0f7',
      })
      .setOrigin(0.5);

    this.body = this.add
      .text(GAME_WIDTH / 2, 90, '', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '15px',
        color: '#e8f0f7',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0);

    this.refresh();
    this.inputMap = new InputMap(this);

    this.input.keyboard?.on('keydown-ONE', () => this.toggle('gore'));
    this.input.keyboard?.on('keydown-TWO', () => this.toggle('screenShake'));
    this.input.keyboard?.on('keydown-THREE', () => this.toggle('aimAssist'));
    this.input.keyboard?.on('keydown-FOUR', () => this.cycleDialogue());
    this.input.keyboard?.on('keydown-FIVE', () => this.toggleUiScale());
    this.input.keyboard?.on('keydown-SIX', () => this.toggle('colorblindTells'));
    this.input.keyboard?.on('keydown-SEVEN', () => this.toggleDialogueText());
    this.input.keyboard?.on('keydown-EIGHT', () => this.toggle('touchControls'));
    this.input.keyboard?.on('keydown-ESC', () => this.back());
  }

  update(): void {
    if (this.inputMap.justConfirmed()) this.back();
  }

  private toggle(
    key: keyof Pick<
      SettingsState,
      'gore' | 'screenShake' | 'aimAssist' | 'colorblindTells' | 'touchControls'
    >,
  ): void {
    settingsState[key] = !settingsState[key];
    saveService.saveMetaOnly();
    this.refresh();
  }

  private cycleDialogue(): void {
    const order: SettingsState['dialogueSpeed'][] = ['slow', 'normal', 'fast'];
    const i = order.indexOf(settingsState.dialogueSpeed);
    settingsState.dialogueSpeed = order[(i + 1) % order.length];
    saveService.saveMetaOnly();
    this.refresh();
  }

  private toggleUiScale(): void {
    settingsState.uiScale = settingsState.uiScale === 'normal' ? 'large' : 'normal';
    saveService.saveMetaOnly();
    this.refresh();
  }

  private toggleDialogueText(): void {
    settingsState.dialogueTextScale =
      settingsState.dialogueTextScale === 'normal' ? 'large' : 'normal';
    saveService.saveMetaOnly();
    this.refresh();
  }

  private refresh(): void {
    const unlocked = achievementService.listUnlocked();
    this.body.setText(
      [
        `[1] Gore: ${settingsState.gore ? 'ON' : 'OFF'}`,
        `[2] Screen shake: ${settingsState.screenShake ? 'ON' : 'OFF'}`,
        `[3] Aim assist: ${settingsState.aimAssist ? 'ON' : 'OFF'}`,
        `[4] Dialogue speed: ${settingsState.dialogueSpeed.toUpperCase()}`,
        `[5] Deck UI scale: ${settingsState.uiScale.toUpperCase()}`,
        `[6] Colorblind enemy tells: ${settingsState.colorblindTells ? 'ON' : 'OFF'}`,
        `[7] Dialogue text: ${settingsState.dialogueTextScale.toUpperCase()}`,
        `[8] Touch controls (mobile spike): ${settingsState.touchControls ? 'ON' : 'OFF'}`,
        '',
        `Achievements ${unlocked.length}/${ACHIEVEMENTS.length}`,
        ...ACHIEVEMENTS.map(
          (a) => `${unlocked.includes(a.id) ? '✓' : '·'} ${a.name} — ${a.description}`,
        ),
        '',
        '[SPACE / ESC] Back',
      ].join('\n'),
    );
  }

  private back(): void {
    this.scene.start('Menu');
  }
}
