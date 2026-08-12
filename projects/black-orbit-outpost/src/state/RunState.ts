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
}

export function createInitialRun(): RunState {
  return {
    act: 1,
    wave: 1,
    salvage: 40,
    coreHp: 1000,
    coreMaxHp: 1000,
    playerHp: 100,
    playerMaxHp: 100,
    hardpointsPlaced: 0,
    maxHardpoints: 2,
    hasAutogunNest: false,
    autogunNestPos: null,
  };
}

/** Mutable singleton for M1 — later replaced by proper service */
export const runState: RunState = createInitialRun();

export function resetRun(): void {
  Object.assign(runState, createInitialRun());
}
