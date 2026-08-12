import type { StoryBeat } from '../data/story/act1';
import { ACT1_INTRO, ACT1_WAVE2_REST } from '../data/story/act1';

/** Maps trigger ids → story beats (expand per act later). */
export class StoryDirector {
  getBeat(triggerId: string): StoryBeat | null {
    switch (triggerId) {
      case 'act1_intro':
        return ACT1_INTRO;
      case 'act1_rest1':
        return ACT1_WAVE2_REST;
      default:
        return null;
    }
  }
}

export const storyDirector = new StoryDirector();
