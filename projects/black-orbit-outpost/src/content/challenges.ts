export interface ChallengeDef {
  id: string;
  name: string;
  description: string;
  /** Extra Orbit Marks multiplier on act clear */
  marksMult: number;
  enemyHpMult?: number;
  enemySpeedMult?: number;
  coreBleed?: boolean;
  /** Requires act 1 cleared to appear */
  requiresAct1?: boolean;
}

export const CHALLENGES: ChallengeDef[] = [
  {
    id: 'fog',
    name: 'Fog',
    description: 'Enemies move 25% faster. Harder to kite.',
    marksMult: 1.35,
    enemySpeedMult: 1.25,
  },
  {
    id: 'double_runners',
    name: 'Double Runners',
    description: 'Enemy HP +20%. More pressure to the core.',
    marksMult: 1.35,
    enemyHpMult: 1.2,
  },
  {
    id: 'core_bleed',
    name: 'Core Bleed',
    description: 'Start each run at 70% core integrity.',
    marksMult: 1.5,
    coreBleed: true,
    requiresAct1: true,
  },
];

export function getAvailableChallenges(act1Cleared: boolean): ChallengeDef[] {
  return CHALLENGES.filter((c) => !c.requiresAct1 || act1Cleared);
}
