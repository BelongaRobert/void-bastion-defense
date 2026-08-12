import Phaser from 'phaser';
import { InputMap } from '../input/InputMap';
import { runState } from '../state/RunState';
import { saveService } from '../state/SaveService';
import { storyDirector } from '../story/StoryDirector';
import { DialogueBox } from '../story/DialogueBox';
import { Colors, GAME_HEIGHT, GAME_WIDTH } from '../theme';

interface ShopItem {
  key: string;
  label: string;
  cost: number;
  apply: () => string | null;
}

export class ShopScene extends Phaser.Scene {
  private inputMap!: InputMap;
  private dialogue!: DialogueBox;
  private status!: Phaser.GameObjects.Text;
  private ready = false;
  private clearedWave = 0;
  private items: ShopItem[] = [];

  constructor() {
    super('Shop');
  }

  create(): void {
    this.clearedWave = runState.wave;
    this.cameras.main.setBackgroundColor(Colors.voidNavy);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0c1420, 1).setOrigin(0);

    this.add
      .text(GAME_WIDTH / 2, 50, 'DOCKYARD SHOP', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '30px',
        color: '#e8b84a',
      })
      .setOrigin(0.5);

    this.status = this.add
      .text(GAME_WIDTH / 2, 96, '', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '16px',
        color: '#7dffb3',
      })
      .setOrigin(0.5);

    this.items = [
      {
        key: '1',
        label: '[1] Field Medkit — heal 50 HP',
        cost: 30,
        apply: () => {
          runState.playerHp = Math.min(runState.playerMaxHp, runState.playerHp + 50);
          return 'Medkit applied';
        },
      },
      {
        key: '2',
        label: '[2] Core Patch — repair 200 core',
        cost: 35,
        apply: () => {
          runState.coreHp = Math.min(runState.coreMaxHp, runState.coreHp + 200);
          return 'Core patched';
        },
      },
      {
        key: '3',
        label: '[3] Hollow Points — +2 weapon damage (run)',
        cost: 55,
        apply: () => {
          runState.damageBonus += 2;
          return 'Damage +2';
        },
      },
      {
        key: '4',
        label: '[4] Nest Calibration — +3 turret damage (run)',
        cost: 40,
        apply: () => {
          runState.nestDamageBonus += 3;
          return 'Nest damage +3';
        },
      },
      {
        key: '5',
        label: '[5] Extended Mags — +8 magazine (run)',
        cost: 45,
        apply: () => {
          runState.ammoReserveBonus += 8;
          return 'Mag size +8';
        },
      },
      {
        key: '6',
        label: '[6] Dock Scrap Bundle — +40 salvage',
        cost: 25,
        apply: () => {
          runState.salvage += 40;
          return '+40 salvage';
        },
      },
    ];

    this.add
      .text(
        GAME_WIDTH / 2,
        150,
        this.items.map((i) => `${i.label}${i.cost ? `  (−${i.cost})` : ''}`).join('\n') +
          '\n\n[SPACE] Leave shop → next wave',
        {
          fontFamily: '"Share Tech Mono", monospace',
          fontSize: '17px',
          color: '#e8f0f7',
          align: 'center',
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5, 0);

    this.inputMap = new InputMap(this);
    this.dialogue = new DialogueBox(this);
    this.ready = false;
    this.refresh();

    const beatId = storyDirector.restBeatForWave(this.clearedWave);
    if (beatId) {
      const beat = storyDirector.getBeat(beatId);
      if (beat) this.dialogue.play(beat);
    }

    this.input.keyboard?.on('keydown-ONE', () => this.buy(0));
    this.input.keyboard?.on('keydown-TWO', () => this.buy(1));
    this.input.keyboard?.on('keydown-THREE', () => this.buy(2));
    this.input.keyboard?.on('keydown-FOUR', () => this.buy(3));
    this.input.keyboard?.on('keydown-FIVE', () => this.buy(4));
    this.input.keyboard?.on('keydown-SIX', () => this.buy(5));

    saveService.saveRun();
  }

  update(): void {
    if (this.dialogue.isOpen()) {
      if (this.inputMap.justConfirmed()) this.dialogue.tryAdvance();
      return;
    }
    if (this.ready) return;
    if (this.inputMap.justConfirmed()) {
      this.ready = true;
      runState.wave += 1;
      saveService.saveRun();
      this.dialogue.destroy();
      this.scene.start('Combat');
    }
  }

  private buy(index: number): void {
    if (this.dialogue.isOpen()) return;
    const item = this.items[index];
    if (!item) return;
    if (runState.salvage < item.cost) {
      this.flash('Not enough salvage');
      return;
    }
    runState.salvage -= item.cost;
    const msg = item.apply();
    this.refresh();
    saveService.saveRun();
    if (msg) this.flash(msg);
  }

  private refresh(): void {
    this.status.setText(
      `Salvage ${runState.salvage} · HP ${runState.playerHp} · Core ${runState.coreHp} · DMG+${runState.damageBonus} · Nest+${runState.nestDamageBonus} · Mag+${runState.ammoReserveBonus}`,
    );
  }

  private flash(msg: string): void {
    const t = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 70, msg, {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '18px',
        color: '#e8b84a',
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({
      targets: t,
      alpha: 1,
      duration: 150,
      yoyo: true,
      hold: 700,
      onComplete: () => t.destroy(),
    });
  }
}
