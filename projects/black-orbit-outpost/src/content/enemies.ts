export type EnemyId =
  | 'shambler'
  | 'runner'
  | 'spitter'
  | 'bloater'
  | 'dockmaster'
  | 'armored'
  | 'stalker'
  | 'burster'
  | 'coldvault';

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
  isElite?: boolean;
  summonIntervalMs?: number;
  summonType?: EnemyId;
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
  bloater: {
    id: 'bloater',
    name: 'Bloater',
    hp: 70,
    speed: 40,
    radius: 22,
    damage: 14,
    attackRateMs: 1100,
    color: 0x8b6b2e,
    salvage: 12,
    preferCore: true,
  },
  dockmaster: {
    id: 'dockmaster',
    name: 'The Dockmaster',
    hp: 900,
    speed: 48,
    radius: 36,
    damage: 22,
    attackRateMs: 850,
    color: 0x9b5cff,
    salvage: 120,
    preferCore: true,
    isElite: true,
    summonIntervalMs: 4500,
    summonType: 'shambler',
  },
  armored: {
    id: 'armored',
    name: 'Armored Dead',
    hp: 95,
    speed: 42,
    radius: 18,
    damage: 12,
    attackRateMs: 950,
    color: 0x6a7a8a,
    salvage: 10,
    preferCore: true,
  },
  stalker: {
    id: 'stalker',
    name: 'Stalker',
    hp: 28,
    speed: 145,
    radius: 13,
    damage: 11,
    attackRateMs: 650,
    color: 0xb0d4ff,
    salvage: 9,
    preferCore: false,
  },
  burster: {
    id: 'burster',
    name: 'Burster',
    hp: 40,
    speed: 85,
    radius: 15,
    damage: 16,
    attackRateMs: 1200,
    color: 0xd4a017,
    salvage: 11,
    preferCore: true,
  },
  coldvault: {
    id: 'coldvault',
    name: 'Cold Vault',
    hp: 1100,
    speed: 40,
    radius: 40,
    damage: 26,
    attackRateMs: 900,
    color: 0x7eb6ff,
    salvage: 150,
    preferCore: true,
    isElite: true,
    summonIntervalMs: 4000,
    summonType: 'stalker',
  },
};
