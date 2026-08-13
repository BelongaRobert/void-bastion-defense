export type AchievementId =
  | 'first_blood'
  | 'dockmaster_down'
  | 'cold_vault_down'
  | 'orbit_waker_down'
  | 'campaign_clear'
  | 'marks_100'
  | 'challenge_clear'
  | 'perfect_core';

export interface AchievementDef {
  id: AchievementId;
  name: string;
  description: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_blood', name: 'First Blood', description: 'Kill your first hostile' },
  { id: 'dockmaster_down', name: 'Yard Cleared', description: 'Defeat The Dockmaster' },
  { id: 'cold_vault_down', name: 'Thawed', description: 'Defeat Cold Vault' },
  { id: 'orbit_waker_down', name: 'Signal Cut', description: 'Defeat Orbit Waker' },
  { id: 'campaign_clear', name: 'Outpost Holds', description: 'Clear Acts 1–3' },
  { id: 'marks_100', name: 'Orbit Bank', description: 'Hold 100 Orbit Marks' },
  { id: 'challenge_clear', name: 'Hard Mode', description: 'Clear an act with a challenge on' },
  { id: 'perfect_core', name: 'Untouched Core', description: 'Clear an act with core above 80%' },
];

import '../platform/DesktopBridge';

export class AchievementService {
  private unlocked = new Set<AchievementId>();

  load(ids: string[]): void {
    this.unlocked = new Set(ids.filter((id) => ACHIEVEMENTS.some((a) => a.id === id)) as AchievementId[]);
  }

  listUnlocked(): AchievementId[] {
    return [...this.unlocked];
  }

  has(id: AchievementId): boolean {
    return this.unlocked.has(id);
  }

  unlock(id: AchievementId): boolean {
    if (this.unlocked.has(id)) return false;
    this.unlocked.add(id);
    // Steam stub — no-op unless Electron bridge present
    try {
      void window.steamAPI?.unlockAchievement?.(id);
    } catch {
      /* standalone */
    }
    console.info(`[Achievement] ${id}`);
    return true;
  }
}

export const achievementService = new AchievementService();
