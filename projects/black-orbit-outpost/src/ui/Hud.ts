import Phaser from 'phaser';
import { WEAPONS } from '../content/weapons';
import type { Player } from '../combat/Player';
import type { Enemy } from '../combat/Enemy';
import { combatControlHints } from '../input/ControlHints';
import { Colors, DEPTH, GAME_WIDTH } from '../theme';
import { runState } from '../state/RunState';
import { uiFontScale } from '../state/SettingsState';

export class Hud {
  private scene: Phaser.Scene;
  private waveText: Phaser.GameObjects.Text;
  private coreText: Phaser.GameObjects.Text;
  private hpText: Phaser.GameObjects.Text;
  private weaponText: Phaser.GameObjects.Text;
  private salvageText: Phaser.GameObjects.Text;
  private hintsText: Phaser.GameObjects.Text;
  private eliteRoot: Phaser.GameObjects.Container;
  private eliteLabel: Phaser.GameObjects.Text;
  private eliteBarBg: Phaser.GameObjects.Rectangle;
  private eliteBarFill: Phaser.GameObjects.Rectangle;
  private lastHints = '';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const s = uiFontScale();
    this.waveText = scene.add.text(24, 16, '', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: `${Math.round(16 * s)}px`,
      color: '#e8b84a',
    });
    this.coreText = scene.add.text(24, 42, '', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize: `${Math.round(14 * s)}px`,
      color: '#7dffb3',
    });
    this.hpText = scene.add.text(24, 64, '', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize: `${Math.round(14 * s)}px`,
      color: '#e8f0f7',
    });
    this.weaponText = scene.add
      .text(GAME_WIDTH - 24, 16, '', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: `${Math.round(14 * s)}px`,
        color: '#e8f0f7',
        align: 'right',
      })
      .setOrigin(1, 0);
    this.salvageText = scene.add
      .text(GAME_WIDTH - 24, 42, '', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: `${Math.round(14 * s)}px`,
        color: '#e8b84a',
        align: 'right',
      })
      .setOrigin(1, 0);

    this.hintsText = scene.add
      .text(GAME_WIDTH / 2, 16, combatControlHints(scene), {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: `${Math.round(11 * s)}px`,
        color: '#8fa3b8',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);

    const barW = 420;
    this.eliteBarBg = scene.add.rectangle(0, 0, barW, 14, 0x1a1020).setStrokeStyle(2, Colors.antagonist);
    this.eliteBarFill = scene.add.rectangle(-barW / 2, 0, barW, 10, Colors.antagonist).setOrigin(0, 0.5);
    this.eliteLabel = scene.add
      .text(0, -22, 'CHAPTER ELITE', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '14px',
        color: '#c9a0ff',
      })
      .setOrigin(0.5);
    this.eliteRoot = scene.add
      .container(GAME_WIDTH / 2, 70, [this.eliteBarBg, this.eliteBarFill, this.eliteLabel])
      .setScrollFactor(0)
      .setDepth(DEPTH.hud)
      .setVisible(false);

    for (const t of [
      this.waveText,
      this.coreText,
      this.hpText,
      this.weaponText,
      this.salvageText,
    ]) {
      t.setScrollFactor(0).setDepth(DEPTH.hud);
    }
  }

  update(
    player: Player,
    waveLabel: string,
    enemiesAlive: number,
    remaining: number,
    elite: Enemy | null,
  ): void {
    const w = WEAPONS[player.weaponId];
    this.waveText.setText(waveLabel);
    this.coreText.setText(`CORE ${runState.coreHp}/${runState.coreMaxHp}`);
    this.hpText.setText(`HP ${runState.playerHp}/${runState.playerMaxHp}`);
    const reload = player.isReloading ? ' [RELOAD]' : '';
    const mag = w.magazine + runState.ammoReserveBonus;
    this.weaponText.setText(
      `${w.name}  ${player.ammo[player.weaponId]}/${mag}${reload}`,
    );
    this.salvageText.setText(`SALVAGE ${runState.salvage} · HOSTILES ${enemiesAlive}+${remaining}`);
    this.coreText.setColor(runState.coreHp / runState.coreMaxHp < 0.35 ? '#ff3b5c' : '#7dffb3');
    this.hpText.setColor(runState.playerHp / runState.playerMaxHp < 0.35 ? '#ff3b5c' : '#e8f0f7');

    const hints = combatControlHints(this.scene);
    if (hints !== this.lastHints) {
      this.lastHints = hints;
      this.hintsText.setText(hints);
    }

    if (elite && elite.active) {
      this.eliteRoot.setVisible(true);
      const pct = Math.max(0, elite.hp / elite.maxHp);
      this.eliteBarFill.width = 420 * pct;
      this.eliteLabel.setText(`CHAPTER ELITE — ${elite.def.name}`);
    } else {
      this.eliteRoot.setVisible(false);
    }
  }

  flash(message: string, scene: Phaser.Scene, color = '#e8b84a'): void {
    const bar = scene.add
      .rectangle(GAME_WIDTH / 2, 108, 0, 36, 0x070b12, 0.75)
      .setDepth(DEPTH.hud + 1)
      .setScrollFactor(0);
    scene.tweens.add({
      targets: bar,
      width: 520,
      duration: 220,
      ease: 'Cubic.easeOut',
    });
    const t = scene.add
      .text(GAME_WIDTH / 2, 120, message, {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '26px',
        color,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud + 2)
      .setScrollFactor(0)
      .setAlpha(0);
    scene.tweens.add({
      targets: t,
      alpha: 1,
      y: 108,
      duration: 250,
      yoyo: true,
      hold: 1100,
      onComplete: () => {
        t.destroy();
        bar.destroy();
      },
    });
  }
}
