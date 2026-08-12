import Phaser from 'phaser';
import { CHALLENGES } from '../content/challenges';
import { InputMap } from '../input/InputMap';
import { metaState, resetRun, runState } from '../state/RunState';
import { saveService } from '../state/SaveService';
import { DialogueBox } from '../story/DialogueBox';
import { storyDirector } from '../story/StoryDirector';
import { Colors, GAME_HEIGHT, GAME_WIDTH } from '../theme';

export class ResultsScene extends Phaser.Scene {
  private inputMap!: InputMap;
  private dialogue!: DialogueBox;
  private done = false;

  constructor() {
    super('Results');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(Colors.voidNavy);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a101a, 1).setOrigin(0);

    const act = runState.act;
    const challenge = CHALLENGES.find((c) => c.id === runState.challengeId);
    const marksMult = challenge?.marksMult ?? 1;
    const baseMarks = 25 + Math.floor(runState.salvage / 20) + (act === 2 ? 15 : 0);
    const marks = Math.floor(baseMarks * marksMult);

    if (act === 1) {
      metaState.act1Cleared = true;
      metaState.bestAct1Wave = Math.max(metaState.bestAct1Wave, 8);
    } else {
      metaState.act2Cleared = true;
      metaState.bestAct2Wave = Math.max(metaState.bestAct2Wave, 8);
    }
    metaState.orbitMarks += marks;
    saveService.clearRun();
    saveService.saveMetaOnly();

    const eliteName = act === 2 ? 'Cold Vault' : 'The Dockmaster';
    const actTitle = act === 2 ? 'ACT 2 COMPLETE' : 'ACT 1 COMPLETE';
    const zone = act === 2 ? 'Cold Storage — secured' : 'Dockyard Dark — secured';
    const next =
      act === 1
        ? 'Act 2 — Cold Storage — unlocked'
        : 'Act 3 — Black Orbit — coming in M4';

    this.add
      .text(GAME_WIDTH / 2, 90, actTitle, {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '40px',
        color: '#7dffb3',
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        170,
        [
          zone,
          `Chapter Elite defeated: ${eliteName}`,
          `Salvage banked: ${runState.salvage}`,
          challenge ? `Challenge: ${challenge.name} (×${challenge.marksMult})` : 'Challenge: none',
          `Orbit Marks earned: +${marks}  (total ${metaState.orbitMarks})`,
          '',
          next,
        ].join('\n'),
        {
          fontFamily: '"Share Tech Mono", monospace',
          fontSize: '18px',
          color: '#e8f0f7',
          align: 'center',
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5, 0);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 80, '[ SPACE — RETURN TO MENU ]', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '18px',
        color: '#e8b84a',
      })
      .setOrigin(0.5);

    this.inputMap = new InputMap(this);
    this.dialogue = new DialogueBox(this);
    this.done = false;

    const beat = storyDirector.getBeat(storyDirector.clearForAct(act));
    if (beat) this.dialogue.play(beat);
  }

  update(): void {
    if (this.dialogue.isOpen()) {
      if (this.inputMap.justConfirmed()) this.dialogue.tryAdvance();
      return;
    }
    if (this.done) return;
    if (this.inputMap.justConfirmed()) {
      this.done = true;
      resetRun();
      this.dialogue.destroy();
      this.scene.start('Menu');
    }
  }
}
