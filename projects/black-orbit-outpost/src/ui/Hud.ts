import Phaser from 'phaser';
import { WEAPONS } from '../data/weapons';
import type { Player } from '../combat/Player';
import { DEPTH, GAME_WIDTH } from '../theme';
import { runState } from '../state/RunState';

export class Hud {
  private waveText: Phaser.GameObjects.Text;
  private coreText: Phaser.GameObjects.Text;
  private hpText: Phaser.GameObjects.Text;
  private weaponText: Phaser.GameObjects.Text;
  private salvageText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.waveText = scene.add.text(24, 16, '', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '16px',
      color: '#e8b84a',
    });
    this.coreText = scene.add.text(24, 42, '', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize: '14px',
      color: '#7dffb3',
    });
    this.hpText = scene.add.text(24, 64, '', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize: '14px',
      color: '#e8f0f7',
    });
    this.weaponText = scene.add
      .text(GAME_WIDTH - 24, 16, '', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '14px',
        color: '#e8f0f7',
        align: 'right',
      })
      .setOrigin(1, 0);
    this.salvageText = scene.add
      .text(GAME_WIDTH - 24, 42, '', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '14px',
        color: '#e8b84a',
        align: 'right',
      })
      .setOrigin(1, 0);

    scene.add
      .text(
        GAME_WIDTH / 2,
        16,
        'WASD move · Mouse aim · Click fire · 1/2 weapons · R reload · Shift dash',
        {
          fontFamily: '"Share Tech Mono", monospace',
          fontSize: '11px',
          color: '#8fa3b8',
        },
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);

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

  update(player: Player, waveLabel: string, enemiesAlive: number, remaining: number): void {
    const w = WEAPONS[player.weaponId];
    this.waveText.setText(waveLabel);
    this.coreText.setText(`CORE ${runState.coreHp}/${runState.coreMaxHp}`);
    this.hpText.setText(`HP ${runState.playerHp}/${runState.playerMaxHp}`);
    const reload = player.isReloading ? ' [RELOAD]' : '';
    this.weaponText.setText(
      `${w.name}  ${player.ammo[player.weaponId]}/${w.magazine}${reload}`,
    );
    this.salvageText.setText(`SALVAGE ${runState.salvage} · HOSTILES ${enemiesAlive}+${remaining}`);
    this.coreText.setColor(runState.coreHp / runState.coreMaxHp < 0.35 ? '#ff3b5c' : '#7dffb3');
    this.hpText.setColor(runState.playerHp / runState.playerMaxHp < 0.35 ? '#ff3b5c' : '#e8f0f7');
  }

  flash(message: string, scene: Phaser.Scene): void {
    const t = scene.add
      .text(GAME_WIDTH / 2, 120, message, {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '28px',
        color: '#e8b84a',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud + 1)
      .setScrollFactor(0)
      .setAlpha(0);
    scene.tweens.add({
      targets: t,
      alpha: 1,
      y: 100,
      duration: 250,
      yoyo: true,
      hold: 900,
      onComplete: () => t.destroy(),
    });
  }
}
