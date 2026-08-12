export type SpeakerId = 'protagonist' | 'antagonist' | 'system';

export interface DialogueLine {
  speaker: SpeakerId;
  name: string;
  text: string;
  /** Portrait tint / key placeholder */
  portrait: 'hero' | 'villain' | 'radio';
}

export interface StoryBeat {
  id: string;
  lines: DialogueLine[];
}

export const ACT1_INTRO: StoryBeat = {
  id: 'act1_intro',
  lines: [
    {
      speaker: 'system',
      name: 'ORBIT RELAY',
      text: 'Dockyard seal compromised. Core integrity critical. You are the last operable defender.',
      portrait: 'radio',
    },
    {
      speaker: 'protagonist',
      name: 'DEFENDER',
      text: "Then I hold the line. Lights are dying out here — something's moving in the dark.",
      portrait: 'hero',
    },
    {
      speaker: 'antagonist',
      name: '???',
      text: 'Hold all you like. The orbit already woke. Your outpost is just… meat in a can.',
      portrait: 'villain',
    },
    {
      speaker: 'protagonist',
      name: 'DEFENDER',
      text: "Come find out. I've still got shells.",
      portrait: 'hero',
    },
  ],
};

export const ACT1_WAVE2_REST: StoryBeat = {
  id: 'act1_rest1',
  lines: [
    {
      speaker: 'antagonist',
      name: '???',
      text: 'Pretty gunfire. The Dockmaster will enjoy chewing through it.',
      portrait: 'villain',
    },
    {
      speaker: 'protagonist',
      name: 'DEFENDER',
      text: "Keep talking. I'm planting steel between you and my core.",
      portrait: 'hero',
    },
  ],
};
