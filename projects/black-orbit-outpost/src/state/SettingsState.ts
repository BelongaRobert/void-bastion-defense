export interface SettingsState {
  gore: boolean;
  screenShake: boolean;
  aimAssist: boolean;
  dialogueSpeed: 'slow' | 'normal' | 'fast';
  /** Deck / couch readability */
  uiScale: 'normal' | 'large';
  /** 0–1 master SFX placeholder */
  sfxVolume: number;
}

export function createDefaultSettings(): SettingsState {
  return {
    gore: true,
    screenShake: true,
    aimAssist: true,
    dialogueSpeed: 'normal',
    uiScale: 'normal',
    sfxVolume: 0.8,
  };
}

/** Multiplier for HUD / menu type when Deck UI scale is Large. */
export function uiFontScale(): number {
  return settingsState.uiScale === 'large' ? 1.15 : 1;
}

export const settingsState: SettingsState = createDefaultSettings();

export function applySettings(data: Partial<SettingsState>): void {
  Object.assign(settingsState, createDefaultSettings(), data);
}

export function dialogueAdvanceMs(): number {
  switch (settingsState.dialogueSpeed) {
    case 'slow':
      return 320;
    case 'fast':
      return 80;
    default:
      return 180;
  }
}

export function dialogueOpenLockMs(): number {
  switch (settingsState.dialogueSpeed) {
    case 'slow':
      return 400;
    case 'fast':
      return 120;
    default:
      return 250;
  }
}
