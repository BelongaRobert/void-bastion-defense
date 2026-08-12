import type { StoryBeat } from '../content/story/act1';
import {
  ACT1_CLEAR,
  ACT1_INTRO,
  ACT1_MID,
  ACT1_PRE_ELITE,
  ACT1_REST1,
} from '../content/story/act1';

/** Maps trigger ids → story beats. */
export class StoryDirector {
  getBeat(triggerId: string): StoryBeat | null {
    switch (triggerId) {
      case 'act1_intro':
        return ACT1_INTRO;
      case 'act1_rest1':
        return ACT1_REST1;
      case 'act1_mid':
        return ACT1_MID;
      case 'act1_pre_elite':
        return ACT1_PRE_ELITE;
      case 'act1_clear':
        return ACT1_CLEAR;
      default:
        return null;
    }
  }

  /** Rest-screen beat after clearing a given wave number */
  restBeatForWave(waveJustCleared: number): string | null {
    if (waveJustCleared === 1) return 'act1_rest1';
    if (waveJustCleared === 4) return 'act1_mid';
    if (waveJustCleared === 7) return 'act1_pre_elite';
    return null;
  }
}

export const storyDirector = new StoryDirector();
