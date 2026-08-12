import Phaser from 'phaser';
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

    const marks = 25 + Math.floor(runState.salvage / 20);
    metaState.act1Cleared = true;
    metaState.orbitMarks += marks;
    metaState.bestAct1Wave = Math.max(metaState.bestAct1Wave, 8);
    saveService.clearRun();
    saveService.saveMetaOnly();

    this.add
      .text(GAME_WIDTH / 2, 100, 'ACT 1 COMPLETE', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '40px',
        color: '#7dffb3',
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        180,
        [
          'Dockyard Dark — secured',
          `Chapter Elite defeated: The Dockmaster`,
          `Salvage banked this run: ${runState.salvage}`,
          `Orbit Marks earned: +${marks}  (total ${metaState.orbitMarks})`,
          '',
          'Act 2 — Cold Storage — coming in M3',
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

    const beat = storyDirector.getBeat('act1_clear');
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
