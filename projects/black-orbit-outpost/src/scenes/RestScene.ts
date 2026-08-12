import Phaser from 'phaser';
import { InputMap } from '../input/InputMap';
import { runState } from '../state/RunState';
import { saveService } from '../state/SaveService';
import { storyDirector } from '../story/StoryDirector';
import { DialogueBox } from '../story/DialogueBox';
import { Colors, GAME_HEIGHT, GAME_WIDTH } from '../theme';

const HEAL_COST = 20;
const CORE_REPAIR_COST = 25;
const NEST_COST = 45;

export class RestScene extends Phaser.Scene {
  private inputMap!: InputMap;
  private dialogue!: DialogueBox;
  private status!: Phaser.GameObjects.Text;
  private placing = false;
  private marker!: Phaser.GameObjects.Arc;
  private readyForCombat = false;
  private clearedWave = 0;

  constructor() {
    super('Rest');
  }

  create(): void {
    this.clearedWave = runState.wave;
    this.cameras.main.setBackgroundColor(Colors.voidNavy);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0f1826, 1).setOrigin(0);

    this.add
      .text(GAME_WIDTH / 2, 60, 'REST — DOCKYARD BAY', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '28px',
        color: '#e8f0f7',
      })
      .setOrigin(0.5);

    this.status = this.add
      .text(GAME_WIDTH / 2, 110, '', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '16px',
        color: '#7dffb3',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        190,
        [
          `Wave ${this.clearedWave} cleared · Next: Wave ${this.clearedWave + 1}`,
          '',
          `[1] Heal self  (−${HEAL_COST} salvage, +35 HP)`,
          `[2] Repair core (−${CORE_REPAIR_COST} salvage, +120 core)`,
          `[3] Place Autogun Nest (−${NEST_COST} salvage)  then click map`,
          '[SPACE] Continue to next wave',
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

    this.marker = this.add
      .circle(0, 0, 20, Colors.warning, 0.25)
      .setStrokeStyle(2, Colors.warning)
      .setVisible(false);

    this.inputMap = new InputMap(this);
    this.dialogue = new DialogueBox(this);
    this.refreshStatus();
    this.placing = false;
    this.readyForCombat = false;

    const beatId = storyDirector.restBeatForWave(this.clearedWave);
    if (beatId) {
      const beat = storyDirector.getBeat(beatId);
      if (beat) this.dialogue.play(beat);
    }

    this.input.keyboard?.on('keydown-ONE', () => this.tryHeal());
    this.input.keyboard?.on('keydown-TWO', () => this.tryRepair());
    this.input.keyboard?.on('keydown-THREE', () => this.beginPlaceNest());

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.dialogue.isOpen()) return;
      if (!this.placing) return;
      this.placeNest(p.worldX, p.worldY);
    });

    saveService.saveRun();
  }

  update(): void {
    if (this.dialogue.isOpen()) {
      if (this.inputMap.justConfirmed()) this.dialogue.tryAdvance();
      return;
    }

    if (this.placing) {
      const p = this.input.activePointer;
      this.marker.setVisible(true).setPosition(p.worldX, p.worldY);
      return;
    }

    if (this.readyForCombat) return;
    if (this.inputMap.justConfirmed()) {
      this.readyForCombat = true;
      runState.wave += 1;
      saveService.saveRun();
      this.dialogue.destroy();
      this.scene.start('Combat');
    }
  }

  private tryHeal(): void {
    if (this.dialogue.isOpen() || this.placing) return;
    if (runState.salvage < HEAL_COST) return this.flash('Not enough salvage');
    runState.salvage -= HEAL_COST;
    runState.playerHp = Math.min(runState.playerMaxHp, runState.playerHp + 35);
    this.refreshStatus();
  }

  private tryRepair(): void {
    if (this.dialogue.isOpen() || this.placing) return;
    if (runState.salvage < CORE_REPAIR_COST) return this.flash('Not enough salvage');
    runState.salvage -= CORE_REPAIR_COST;
    runState.coreHp = Math.min(runState.coreMaxHp, runState.coreHp + 120);
    this.refreshStatus();
  }

  private beginPlaceNest(): void {
    if (this.dialogue.isOpen()) return;
    if (runState.hasAutogunNest) return this.flash('Nest already placed');
    if (runState.hardpointsPlaced >= runState.maxHardpoints) return this.flash('Hardpoint slots full');
    if (runState.salvage < NEST_COST) return this.flash('Not enough salvage');
    this.placing = true;
    this.flash('Click to place Autogun Nest');
  }

  private placeNest(x: number, y: number): void {
    runState.salvage -= NEST_COST;
    runState.hasAutogunNest = true;
    runState.hardpointsPlaced += 1;
    runState.autogunNestPos = { x, y };
    this.placing = false;
    this.marker.setVisible(false);
    this.refreshStatus();
    this.flash('Autogun Nest armed');
    saveService.saveRun();
  }

  private refreshStatus(): void {
    this.status.setText(
      `Salvage ${runState.salvage}  ·  HP ${runState.playerHp}/${runState.playerMaxHp}  ·  Core ${runState.coreHp}/${runState.coreMaxHp}  ·  Nest ${runState.hasAutogunNest ? 'ONLINE' : 'NONE'}`,
    );
  }

  private flash(msg: string): void {
    const t = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 80, msg, {
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
