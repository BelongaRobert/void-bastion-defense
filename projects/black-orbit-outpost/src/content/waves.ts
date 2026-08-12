import type { EnemyId } from './enemies';

export interface WaveSpawn {
  type: EnemyId;
  count: number;
  delayMs?: number;
  intervalMs?: number;
}

export interface WaveDef {
  id: string;
  act: number;
  wave: number;
  label: string;
  spawns: WaveSpawn[];
  elite?: EnemyId;
  eliteDelayMs?: number;
}

/** Act 1 — Dockyard Dark */
export const ACT1_WAVES: WaveDef[] = [
  {
    id: 'a1w1',
    act: 1,
    wave: 1,
    label: 'Dockyard Dark — Wave 1',
    spawns: [
      { type: 'shambler', count: 8, intervalMs: 700 },
      { type: 'runner', count: 3, delayMs: 4000, intervalMs: 900 },
    ],
  },
  {
    id: 'a1w2',
    act: 1,
    wave: 2,
    label: 'Dockyard Dark — Wave 2',
    spawns: [
      { type: 'shambler', count: 10, intervalMs: 600 },
      { type: 'runner', count: 6, delayMs: 2500, intervalMs: 700 },
      { type: 'spitter', count: 2, delayMs: 6000, intervalMs: 1200 },
    ],
  },
  {
    id: 'a1w3',
    act: 1,
    wave: 3,
    label: 'Dockyard Dark — Wave 3',
    spawns: [
      { type: 'shambler', count: 12, intervalMs: 500 },
      { type: 'runner', count: 8, delayMs: 2000, intervalMs: 550 },
      { type: 'spitter', count: 4, delayMs: 4500, intervalMs: 1000 },
    ],
  },
  {
    id: 'a1w4',
    act: 1,
    wave: 4,
    label: 'Dockyard Dark — Wave 4',
    spawns: [
      { type: 'shambler', count: 10, intervalMs: 500 },
      { type: 'bloater', count: 2, delayMs: 3000, intervalMs: 1800 },
      { type: 'runner', count: 6, delayMs: 2000, intervalMs: 600 },
      { type: 'spitter', count: 3, delayMs: 5000, intervalMs: 1100 },
    ],
  },
  {
    id: 'a1w5',
    act: 1,
    wave: 5,
    label: 'Dockyard Dark — Wave 5',
    spawns: [
      { type: 'shambler', count: 14, intervalMs: 450 },
      { type: 'runner', count: 10, delayMs: 1500, intervalMs: 500 },
      { type: 'spitter', count: 5, delayMs: 4000, intervalMs: 900 },
      { type: 'bloater', count: 3, delayMs: 6000, intervalMs: 1600 },
    ],
  },
  {
    id: 'a1w6',
    act: 1,
    wave: 6,
    label: 'Dockyard Dark — Wave 6',
    spawns: [
      { type: 'runner', count: 12, intervalMs: 400 },
      { type: 'shambler', count: 12, delayMs: 1000, intervalMs: 450 },
      { type: 'spitter', count: 6, delayMs: 3500, intervalMs: 800 },
      { type: 'bloater', count: 3, delayMs: 5000, intervalMs: 1400 },
    ],
  },
  {
    id: 'a1w7',
    act: 1,
    wave: 7,
    label: 'Dockyard Dark — Wave 7',
    spawns: [
      { type: 'shambler', count: 16, intervalMs: 400 },
      { type: 'runner', count: 12, delayMs: 1200, intervalMs: 450 },
      { type: 'spitter', count: 7, delayMs: 3000, intervalMs: 750 },
      { type: 'bloater', count: 4, delayMs: 4500, intervalMs: 1200 },
    ],
  },
  {
    id: 'a1w8',
    act: 1,
    wave: 8,
    label: 'CHAPTER ELITE — The Dockmaster',
    elite: 'dockmaster',
    eliteDelayMs: 2500,
    spawns: [
      { type: 'shambler', count: 14, intervalMs: 500 },
      { type: 'runner', count: 10, delayMs: 1500, intervalMs: 500 },
      { type: 'spitter', count: 6, delayMs: 4000, intervalMs: 900 },
      { type: 'bloater', count: 3, delayMs: 6000, intervalMs: 1500 },
      { type: 'shambler', count: 8, delayMs: 14000, intervalMs: 700 },
      { type: 'runner', count: 6, delayMs: 16000, intervalMs: 650 },
    ],
  },
];

/** Act 2 — Cold Storage */
export const ACT2_WAVES: WaveDef[] = [
  {
    id: 'a2w1',
    act: 2,
    wave: 1,
    label: 'Cold Storage — Wave 1',
    spawns: [
      { type: 'armored', count: 6, intervalMs: 800 },
      { type: 'runner', count: 4, delayMs: 3000, intervalMs: 700 },
    ],
  },
  {
    id: 'a2w2',
    act: 2,
    wave: 2,
    label: 'Cold Storage — Wave 2',
    spawns: [
      { type: 'armored', count: 8, intervalMs: 700 },
      { type: 'stalker', count: 4, delayMs: 2500, intervalMs: 650 },
      { type: 'spitter', count: 3, delayMs: 5000, intervalMs: 1000 },
    ],
  },
  {
    id: 'a2w3',
    act: 2,
    wave: 3,
    label: 'Cold Storage — Wave 3',
    spawns: [
      { type: 'armored', count: 8, intervalMs: 650 },
      { type: 'stalker', count: 6, delayMs: 2000, intervalMs: 550 },
      { type: 'burster', count: 3, delayMs: 4500, intervalMs: 1200 },
    ],
  },
  {
    id: 'a2w4',
    act: 2,
    wave: 4,
    label: 'Cold Storage — Wave 4',
    spawns: [
      { type: 'shambler', count: 8, intervalMs: 500 },
      { type: 'armored', count: 6, delayMs: 1500, intervalMs: 700 },
      { type: 'stalker', count: 6, delayMs: 3000, intervalMs: 500 },
      { type: 'burster', count: 4, delayMs: 5500, intervalMs: 1100 },
    ],
  },
  {
    id: 'a2w5',
    act: 2,
    wave: 5,
    label: 'Cold Storage — Wave 5',
    spawns: [
      { type: 'armored', count: 10, intervalMs: 550 },
      { type: 'stalker', count: 8, delayMs: 1200, intervalMs: 450 },
      { type: 'burster', count: 5, delayMs: 4000, intervalMs: 900 },
      { type: 'spitter', count: 4, delayMs: 6000, intervalMs: 800 },
    ],
  },
  {
    id: 'a2w6',
    act: 2,
    wave: 6,
    label: 'Cold Storage — Wave 6',
    spawns: [
      { type: 'stalker', count: 12, intervalMs: 400 },
      { type: 'armored', count: 8, delayMs: 1000, intervalMs: 550 },
      { type: 'burster', count: 6, delayMs: 3500, intervalMs: 850 },
      { type: 'bloater', count: 3, delayMs: 7000, intervalMs: 1400 },
    ],
  },
  {
    id: 'a2w7',
    act: 2,
    wave: 7,
    label: 'Cold Storage — Wave 7',
    spawns: [
      { type: 'armored', count: 12, intervalMs: 450 },
      { type: 'stalker', count: 10, delayMs: 1000, intervalMs: 400 },
      { type: 'burster', count: 7, delayMs: 3000, intervalMs: 750 },
      { type: 'spitter', count: 5, delayMs: 5000, intervalMs: 700 },
    ],
  },
  {
    id: 'a2w8',
    act: 2,
    wave: 8,
    label: 'CHAPTER ELITE — Cold Vault',
    elite: 'coldvault',
    eliteDelayMs: 2200,
    spawns: [
      { type: 'armored', count: 10, intervalMs: 500 },
      { type: 'stalker', count: 10, delayMs: 1200, intervalMs: 450 },
      { type: 'burster', count: 6, delayMs: 3500, intervalMs: 900 },
      { type: 'spitter', count: 5, delayMs: 5000, intervalMs: 800 },
      { type: 'stalker', count: 8, delayMs: 13000, intervalMs: 500 },
      { type: 'armored', count: 6, delayMs: 15000, intervalMs: 700 },
    ],
  },
];

export const ACT_MAX_WAVE = 8;
export const SHOP_AFTER_WAVES = new Set([3, 6]);

export function getWavesForAct(act: number): WaveDef[] {
  return act === 2 ? ACT2_WAVES : ACT1_WAVES;
}

export function getCurrentWaveDef(act: number, wave: number): WaveDef | undefined {
  return getWavesForAct(act)[wave - 1];
}

/** @deprecated use ACT_MAX_WAVE */
export const ACT1_MAX_WAVE = ACT_MAX_WAVE;
export const M1_MAX_WAVE = ACT_MAX_WAVE;
