import Phaser from 'phaser';
import { UNLOCKS, canPurchase, isUnlocked, purchaseUnlock } from '../content/unlocks';
import { InputMap } from '../input/InputMap';
import { metaState } from '../state/RunState';
import { saveService } from '../state/SaveService';
import { Colors, GAME_HEIGHT, GAME_WIDTH } from '../theme';

export class MetaScene extends Phaser.Scene {
  private inputMap!: InputMap;
  private status!: Phaser.GameObjects.Text;
  private listText!: Phaser.GameObjects.Text;

  constructor() {
    super('Meta');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(Colors.voidNavy);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a121c, 1).setOrigin(0);

    this.add
      .text(GAME_WIDTH / 2, 40, 'ORBIT MARKS — UNLOCK TREE', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '28px',
        color: '#7dffb3',
      })
      .setOrigin(0.5);

    this.status = this.add
      .text(GAME_WIDTH / 2, 90, '', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '16px',
        color: '#e8b84a',
      })
      .setOrigin(0.5);

    this.listText = this.add
      .text(GAME_WIDTH / 2, 140, '', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '15px',
        color: '#e8f0f7',
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5, 0);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 50, '[1-6] Buy   [ESC / SPACE] Back to Act Select', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '14px',
        color: '#8fa3b8',
      })
      .setOrigin(0.5);

    this.inputMap = new InputMap(this);
    this.refresh();

    for (let i = 0; i < UNLOCKS.length; i++) {
      const n = i + 1;
      this.input.keyboard?.on(`keydown-${n}`, () => this.buy(i));
    }
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('ActSelect'));
  }

  update(): void {
    if (this.inputMap.justConfirmed()) {
      this.scene.start('ActSelect');
    }
  }

  private buy(index: number): void {
    const def = UNLOCKS[index];
    if (!def) return;
    const err = canPurchase(def);
    if (err) {
      this.status.setText(err);
      return;
    }
    purchaseUnlock(def);
    saveService.saveMetaOnly();
    this.refresh();
    this.status.setText(`Unlocked: ${def.name}`);
  }

  private refresh(): void {
    this.status.setText(`Orbit Marks: ${metaState.orbitMarks}`);
    this.listText.setText(
      UNLOCKS.map((u, i) => {
        const owned = isUnlocked(u.id) ? 'OWNED' : `${u.cost} marks`;
        const lock = u.requiresAct1 && !metaState.act1Cleared ? ' [Act1]' : '';
        return `[${i + 1}] ${u.name} — ${u.description}  (${owned})${lock}`;
      }).join('\n'),
    );
  }
}
