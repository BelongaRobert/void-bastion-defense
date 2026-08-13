import type Phaser from 'phaser';

/** Human-readable control strip for HUD / menus. */
export function combatControlHints(scene: Phaser.Scene): string {
  const pad = scene.input.gamepad?.total ? scene.input.gamepad.getPad(0) : null;
  if (pad) {
    return 'LS move · RS aim · RT fire · Y reload · A dash · LB/RB weapons · A confirm';
  }
  return 'WASD move · Mouse aim · Click fire · 1/2 weapons · R reload · Shift dash';
}

export function menuControlHints(usingPad: boolean): string {
  if (usingPad) {
    return 'D-Pad / face buttons select · A confirm · B back';
  }
  return 'Number keys select · SPACE confirm · ESC back';
}
