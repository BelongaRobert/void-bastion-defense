export type WeaponId = 'smg' | 'shotgun';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  damage: number;
  fireRateMs: number;
  reloadMs: number;
  magazine: number;
  bulletSpeed: number;
  spreadDeg: number;
  pellets: number;
  color: number;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  smg: {
    id: 'smg',
    name: 'SMG',
    damage: 9,
    fireRateMs: 85,
    reloadMs: 1300,
    magazine: 32,
    bulletSpeed: 860,
    spreadDeg: 5,
    pellets: 1,
    color: 0x7dffb3,
  },
  shotgun: {
    id: 'shotgun',
    name: 'Pump Shotgun',
    damage: 14,
    fireRateMs: 520,
    reloadMs: 1700,
    magazine: 6,
    bulletSpeed: 720,
    spreadDeg: 16,
    pellets: 7,
    color: 0xe8b84a,
  },
};
