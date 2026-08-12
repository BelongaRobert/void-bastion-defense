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
    damage: 8,
    fireRateMs: 90,
    reloadMs: 1400,
    magazine: 30,
    bulletSpeed: 820,
    spreadDeg: 6,
    pellets: 1,
    color: 0x7dffb3,
  },
  shotgun: {
    id: 'shotgun',
    name: 'Pump Shotgun',
    damage: 12,
    fireRateMs: 550,
    reloadMs: 1800,
    magazine: 6,
    bulletSpeed: 700,
    spreadDeg: 18,
    pellets: 6,
    color: 0xe8b84a,
  },
};
