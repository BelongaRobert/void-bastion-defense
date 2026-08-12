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
  /** Run-only shop buffs */
  damageBonus: number;
  nestDamageBonus: number;
  ammoReserveBonus: number;
}

export interface MetaState {
  orbitMarks: number;
  act1Cleared: boolean;
  runsStarted: number;
  bestAct1Wave: number;
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
  };
}

export function createInitialMeta(): MetaState {
  return {
    orbitMarks: 0,
    act1Cleared: false,
    runsStarted: 0,
    bestAct1Wave: 0,
  };
}

export const runState: RunState = createInitialRun();
export const metaState: MetaState = createInitialMeta();

export function resetRun(): void {
  Object.assign(runState, createInitialRun());
}

export function applyMeta(data: MetaState): void {
  Object.assign(metaState, data);
}

export function applyRun(data: RunState): void {
  Object.assign(runState, data);
}
