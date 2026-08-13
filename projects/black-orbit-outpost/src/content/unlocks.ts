import type { UnlockId } from '../state/RunState';
import { metaState } from '../state/RunState';

export interface UnlockDef {
  id: UnlockId;
  name: string;
  description: string;
  cost: number;
  requiresAct1?: boolean;
}

export const UNLOCKS: UnlockDef[] = [
  {
    id: 'core_plating',
    name: 'Core Plating',
    description: '+200 max core HP each run',
    cost: 20,
  },
  {
    id: 'medbay',
    name: 'Field Medbay',
    description: '+25 max player HP each run',
    cost: 20,
  },
  {
    id: 'starting_salvage',
    name: 'Scrap Stash',
    description: '+40 starting salvage',
    cost: 15,
  },
  {
    id: 'hollow_tips',
    name: 'Hollow Tips',
    description: '+2 weapon damage each run',
    cost: 30,
    requiresAct1: true,
  },
  {
    id: 'nest_firmware',
    name: 'Nest Firmware',
    description: '+3 Autogun Nest damage each run',
    cost: 25,
    requiresAct1: true,
  },
  {
    id: 'hardpoint_slot',
    name: 'Extra Hardpoint',
    description: '3 hardpoint slots (from 2)',
    cost: 40,
    requiresAct1: true,
  },
];

export function isUnlocked(id: UnlockId): boolean {
  return metaState.unlocked.includes(id);
}

export function canPurchase(def: UnlockDef): string | null {
  if (isUnlocked(def.id)) return 'Already owned';
  if (def.requiresAct1 && !metaState.act1Cleared) return 'Clear Act 1 first';
  if (metaState.orbitMarks < def.cost) return 'Not enough Orbit Marks';
  return null;
}

export function purchaseUnlock(def: UnlockDef): boolean {
  if (canPurchase(def)) return false;
  metaState.orbitMarks -= def.cost;
  metaState.unlocked.push(def.id);
  return true;
}
