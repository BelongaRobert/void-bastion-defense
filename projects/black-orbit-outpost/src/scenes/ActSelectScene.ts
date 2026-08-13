import Phaser from 'phaser';
import { getAvailableChallenges, type ChallengeDef } from '../content/challenges';
import { InputMap } from '../input/InputMap';
import {
  applyMetaUnlocksToRun,
  metaState,
  resetRun,
  runState,
} from '../state/RunState';
import { saveService } from '../state/SaveService';
import { DialogueBox } from '../story/DialogueBox';
import { storyDirector } from '../story/StoryDirector';
import { Colors, GAME_HEIGHT, GAME_WIDTH } from '../theme';
import { Atmosphere } from '../fx/Atmosphere';
import { audioBus } from '../audio/AudioBus';

export class ActSelectScene extends Phaser.Scene {
  private inputMap!: InputMap;
  private dialogue!: DialogueBox;
  private starting = false;
  private selectedChallenge: ChallengeDef | null = null;
  private status!: Phaser.GameObjects.Text;

  constructor() {
    super('ActSelect');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(Colors.voidNavy);
    new Atmosphere(this, { mode: 'overlay', dust: true, coreGlow: false });
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0c1420, 0.55).setOrigin(0);
    this.cameras.main.fadeIn(300, 7, 11, 18);

    this.add
      .text(GAME_WIDTH / 2, 40, 'SELECT ACT', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '32px',
        color: '#e8f0f7',
      })
      .setOrigin(0.5);

    const act2Line = metaState.act1Cleared
      ? '[2] Act 2 — Cold Storage' + (metaState.act2Cleared ? '  ✓' : '')
      : '[2] Act 2 — Cold Storage  (locked)';
    const act3Line = metaState.act2Cleared
      ? '[3] Act 3 — Black Orbit' + (metaState.act3Cleared ? '  ✓' : '')
      : '[3] Act 3 — Black Orbit  (locked)';

    this.add
      .text(
        GAME_WIDTH / 2,
        100,
        [
          '[1] Act 1 — Dockyard Dark' + (metaState.act1Cleared ? '  ✓' : ''),
          act2Line,
          act3Line,
          '',
          'Challenges (optional — press letter):',
          ...getAvailableChallenges(metaState.act1Cleared).map(
            (c, i) =>
              `[${String.fromCharCode(65 + i)}] ${c.name} — ${c.description} (×${c.marksMult} marks)`,
          ),
          '[0] Clear challenge',
          '',
          '[M] Meta   [O] Options   [ESC] Menu',
        ].join('\n'),
        {
          fontFamily: '"Share Tech Mono", monospace',
          fontSize: '15px',
          color: '#e8f0f7',
          align: 'center',
          lineSpacing: 5,
        },
      )
      .setOrigin(0.5, 0);

    this.status = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 60, '', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '14px',
        color: '#e8b84a',
      })
      .setOrigin(0.5);

    this.inputMap = new InputMap(this);
    this.dialogue = new DialogueBox(this);
    this.starting = false;
    this.selectedChallenge = null;
    this.refreshStatus();

    this.input.keyboard?.on('keydown-ONE', () => this.startAct(1));
    this.input.keyboard?.on('keydown-TWO', () => this.startAct(2));
    this.input.keyboard?.on('keydown-THREE', () => this.startAct(3));
    this.input.keyboard?.on('keydown-ZERO', () => {
      this.selectedChallenge = null;
      this.refreshStatus();
    });
    this.input.keyboard?.on('keydown-M', () => this.scene.start('Meta'));
    this.input.keyboard?.on('keydown-O', () => this.scene.start('Options'));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Menu'));

    getAvailableChallenges(metaState.act1Cleared).forEach((c, i) => {
      const key = String.fromCharCode(65 + i);
      this.input.keyboard?.on(`keydown-${key}`, () => {
        this.selectedChallenge = c;
        this.refreshStatus();
      });
    });
  }

  update(): void {
    if (this.dialogue.isOpen()) {
      if (this.inputMap.justConfirmed()) this.dialogue.tryAdvance();
    }
  }

  private refreshStatus(): void {
    const ch = this.selectedChallenge
      ? `Challenge: ${this.selectedChallenge.name}`
      : 'Challenge: none';
    this.status.setText(
      `Orbit Marks ${metaState.orbitMarks}  ·  ${ch}  ·  Achievements ${metaState.achievements.length}`,
    );
  }

  private startAct(act: number): void {
    if (this.starting || this.dialogue.isOpen()) return;
    if (act === 2 && !metaState.act1Cleared) {
      this.status.setText('Clear Act 1 first');
      return;
    }
    if (act === 3 && !metaState.act2Cleared) {
      this.status.setText('Clear Act 2 first');
      return;
    }
    this.starting = true;
    audioBus.ui();
    resetRun();
    runState.act = act;
    runState.wave = 1;
    this.applyChallenge();
    applyMetaUnlocksToRun();
    metaState.runsStarted += 1;
    saveService.saveRun();
    audioBus.startAmbient('combat');

    const beat = storyDirector.getBeat(storyDirector.introForAct(act));
    if (beat) {
      this.dialogue.play(beat, () => this.scene.start('Combat'));
    } else {
      this.scene.start('Combat');
    }
  }

  private applyChallenge(): void {
    const c = this.selectedChallenge;
    if (!c) return;
    runState.challengeId = c.id;
    runState.enemyHpMult = c.enemyHpMult ?? 1;
    runState.enemySpeedMult = c.enemySpeedMult ?? 1;
    runState.spawnMult = c.spawnMult ?? 1;
    runState.coreBleed = !!c.coreBleed;
  }
}
