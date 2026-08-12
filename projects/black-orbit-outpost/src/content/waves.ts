import type { EnemyId } from './enemies';

export interface WaveSpawn {
  type: EnemyId;
  count: number;
  /** Delay before this group starts spawning (ms) */
  delayMs?: number;
  /** Gap between individual spawns in the group (ms) */
  intervalMs?: number;
}

export interface WaveDef {
  id: string;
  act: number;
  wave: number;
  label: string;
  spawns: WaveSpawn[];
}

/** M1 vertical slice: Act 1 waves 1–3 */
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
];

export const M1_MAX_WAVE = 3;
