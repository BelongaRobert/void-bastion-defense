import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, Colors } from '../theme';
import { BootScene } from '../scenes/BootScene';
import { MenuScene } from '../scenes/MenuScene';
import { ActSelectScene } from '../scenes/ActSelectScene';
import { MetaScene } from '../scenes/MetaScene';
import { CombatScene } from '../scenes/CombatScene';
import { RestScene } from '../scenes/RestScene';
import { ShopScene } from '../scenes/ShopScene';
import { ResultsScene } from '../scenes/ResultsScene';

export function createGame(parent: string): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: Colors.voidNavy,
    pixelArt: false,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    input: {
      gamepad: true,
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [
      BootScene,
      MenuScene,
      ActSelectScene,
      MetaScene,
      CombatScene,
      RestScene,
      ShopScene,
      ResultsScene,
    ],
  });
}
