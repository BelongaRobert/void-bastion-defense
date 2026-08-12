export type EnemyId = 'shambler' | 'runner' | 'spitter';

export interface EnemyDef {
  id: EnemyId;
  name: string;
  hp: number;
  speed: number;
  radius: number;
  damage: number;
  attackRateMs: number;
  color: number;
  salvage: number;
  ranged?: boolean;
  projectileSpeed?: number;
  preferCore?: boolean;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  shambler: {
    id: 'shambler',
    name: 'Shambler',
    hp: 36,
    speed: 55,
    radius: 16,
    damage: 8,
    attackRateMs: 900,
    color: 0x5a7a4a,
    salvage: 4,
    preferCore: true,
  },
  runner: {
    id: 'runner',
    name: 'Runner',
    hp: 18,
    speed: 130,
    radius: 12,
    damage: 6,
    attackRateMs: 700,
    color: 0xc41e3a,
    salvage: 6,
    preferCore: false,
  },
  spitter: {
    id: 'spitter',
    name: 'Spitter',
    hp: 22,
    speed: 70,
    radius: 14,
    damage: 10,
    attackRateMs: 1400,
    color: 0x7dffb3,
    salvage: 7,
    ranged: true,
    projectileSpeed: 260,
    preferCore: true,
  },
};
