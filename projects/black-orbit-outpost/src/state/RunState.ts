import type { AchievementId } from '../meta/Achievements';
import type { SettingsState } from './SettingsState';
import { createDefaultSettings } from './SettingsState';

export interface RunState {
  act: number;
  wave: number;
  salvage: number;
  coreHp: number;
  coreMaxHp: number;
  playerHp: number;
  playerMaxHp: number;
  hardpointsPlaced: number;
  maxHardpoints: number;
  hasAutogunNest: boolean;
  autogunNestPos: { x: number; y: number } | null;
  damageBonus: number;
  nestDamageBonus: number;
  ammoReserveBonus: number;
  challengeId: string | null;
  enemyHpMult: number;
  enemySpeedMult: number;
  spawnMult: number;
  coreBleed: boolean;
  /** Track if any kill happened this run (achievements) */
  gotFirstKill: boolean;
  /** Core HP ratio at act end for perfect_core */
  startCoreMax: number;
}

export type UnlockId =
  | 'core_plating'
  | 'medbay'
  | 'hardpoint_slot'
  | 'hollow_tips'
  | 'nest_firmware'
  | 'starting_salvage';

export interface MetaState {
  orbitMarks: number;
  act1Cleared: boolean;
  act2Cleared: boolean;
  act3Cleared: boolean;
  runsStarted: number;
  bestAct1Wave: number;
  bestAct2Wave: number;
  bestAct3Wave: number;
  unlocked: UnlockId[];
  achievements: AchievementId[];
  settings: SettingsState;
}

export function createInitialRun(): RunState {
  return {
    act: 1,
    wave: 1,
    salvage: 50,
    coreHp: 1000,
    coreMaxHp: 1000,
    playerHp: 100,
    playerMaxHp: 100,
    hardpointsPlaced: 0,
    maxHardpoints: 2,
    hasAutogunNest: false,
    autogunNestPos: null,
    damageBonus: 0,
    nestDamageBonus: 0,
    ammoReserveBonus: 0,
    challengeId: null,
    enemyHpMult: 1,
    enemySpeedMult: 1,
    spawnMult: 1,
    coreBleed: false,
    gotFirstKill: false,
    startCoreMax: 1000,
  };
}

export function createInitialMeta(): MetaState {
  return {
    orbitMarks: 0,
    act1Cleared: false,
    act2Cleared: false,
    act3Cleared: false,
    runsStarted: 0,
    bestAct1Wave: 0,
    bestAct2Wave: 0,
    bestAct3Wave: 0,
    unlocked: [],
    achievements: [],
    settings: createDefaultSettings(),
  };
}

export const runState: RunState = createInitialRun();
export const metaState: MetaState = createInitialMeta();

export function resetRun(): void {
  Object.assign(runState, createInitialRun());
}

export function applyMeta(data: MetaState): void {
  Object.assign(metaState, {
    ...createInitialMeta(),
    ...data,
    unlocked: data.unlocked ? [...data.unlocked] : [],
    achievements: data.achievements ? [...data.achievements] : [],
    settings: { ...createDefaultSettings(), ...(data.settings ?? {}) },
  });
}

export function applyRun(data: RunState): void {
  Object.assign(runState, {
    ...createInitialRun(),
    ...data,
    autogunNestPos: data.autogunNestPos ? { ...data.autogunNestPos } : null,
  });
}

export function applyMetaUnlocksToRun(): void {
  const u = new Set(metaState.unlocked);
  if (u.has('core_plating')) {
    runState.coreMaxHp += 200;
    runState.coreHp = runState.coreMaxHp;
  }
  if (u.has('medbay')) {
    runState.playerMaxHp += 25;
    runState.playerHp = runState.playerMaxHp;
  }
  if (u.has('hardpoint_slot')) {
    runState.maxHardpoints = 3;
  }
  if (u.has('hollow_tips')) {
    runState.damageBonus += 2;
  }
  if (u.has('nest_firmware')) {
    runState.nestDamageBonus += 3;
  }
  if (u.has('starting_salvage')) {
    runState.salvage += 40;
  }
  if (runState.coreBleed) {
    runState.coreHp = Math.floor(runState.coreMaxHp * 0.7);
  }
  runState.startCoreMax = runState.coreMaxHp;
}
