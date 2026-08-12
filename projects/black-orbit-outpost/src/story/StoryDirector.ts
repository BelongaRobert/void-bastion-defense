import type { StoryBeat } from '../content/story/act1';
import {
  ACT1_CLEAR,
  ACT1_INTRO,
  ACT1_MID,
  ACT1_PRE_ELITE,
  ACT1_REST1,
  ACT2_CLEAR,
  ACT2_INTRO,
  ACT2_MID,
  ACT2_PRE_ELITE,
} from '../content/story/act1';

/** Maps trigger ids → story beats. */
export class StoryDirector {
  getBeat(triggerId: string): StoryBeat | null {
    const map: Record<string, StoryBeat> = {
      act1_intro: ACT1_INTRO,
      act1_rest1: ACT1_REST1,
      act1_mid: ACT1_MID,
      act1_pre_elite: ACT1_PRE_ELITE,
      act1_clear: ACT1_CLEAR,
      act2_intro: ACT2_INTRO,
      act2_mid: ACT2_MID,
      act2_pre_elite: ACT2_PRE_ELITE,
      act2_clear: ACT2_CLEAR,
    };
    return map[triggerId] ?? null;
  }

  restBeatForWave(act: number, waveJustCleared: number): string | null {
    if (act === 1) {
      if (waveJustCleared === 1) return 'act1_rest1';
      if (waveJustCleared === 4) return 'act1_mid';
      if (waveJustCleared === 7) return 'act1_pre_elite';
    }
    if (act === 2) {
      if (waveJustCleared === 4) return 'act2_mid';
      if (waveJustCleared === 7) return 'act2_pre_elite';
    }
    return null;
  }

  introForAct(act: number): string {
    return act === 2 ? 'act2_intro' : 'act1_intro';
  }

  clearForAct(act: number): string {
    return act === 2 ? 'act2_clear' : 'act1_clear';
  }
}

export const storyDirector = new StoryDirector();
