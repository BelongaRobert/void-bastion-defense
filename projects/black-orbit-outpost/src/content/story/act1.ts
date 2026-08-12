export type SpeakerId = 'protagonist' | 'antagonist' | 'system';

export interface DialogueLine {
  speaker: SpeakerId;
  name: string;
  text: string;
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

export const ACT1_REST1: StoryBeat = {
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

export const ACT1_MID: StoryBeat = {
  id: 'act1_mid',
  lines: [
    {
      speaker: 'system',
      name: 'ORBIT RELAY',
      text: 'Thermal bloom on Dock C. Something heavy is waking in the cargo lock.',
      portrait: 'radio',
    },
    {
      speaker: 'protagonist',
      name: 'DEFENDER',
      text: "I hear it. Floor plates are singing. That's not a shambler.",
      portrait: 'hero',
    },
    {
      speaker: 'antagonist',
      name: '???',
      text: 'He used to run this yard. Now he runs you. Smile when he arrives.',
      portrait: 'villain',
    },
  ],
};

export const ACT1_PRE_ELITE: StoryBeat = {
  id: 'act1_pre_elite',
  lines: [
    {
      speaker: 'antagonist',
      name: '???',
      text: 'Dockmaster — open the bay. Show them what the orbit feeds.',
      portrait: 'villain',
    },
    {
      speaker: 'system',
      name: 'ORBIT RELAY',
      text: 'WARNING: Chapter Elite signature. Supporting hostiles inbound with primary.',
      portrait: 'radio',
    },
    {
      speaker: 'protagonist',
      name: 'DEFENDER',
      text: "Elite plus a wave. Fine. Core stays lit — or I die under it.",
      portrait: 'hero',
    },
  ],
};

export const ACT1_CLEAR: StoryBeat = {
  id: 'act1_clear',
  lines: [
    {
      speaker: 'protagonist',
      name: 'DEFENDER',
      text: "Dockmaster's down. Yard's quiet… for a breath.",
      portrait: 'hero',
    },
    {
      speaker: 'antagonist',
      name: '???',
      text: 'One carcass. Cold Storage still sleeps hungry. Keep walking, little can of meat.',
      portrait: 'villain',
    },
    {
      speaker: 'system',
      name: 'ORBIT RELAY',
      text: 'Act 1 complete. Orbit Marks awarded. Act 2 — Cold Storage — sealed pending unlock.',
      portrait: 'radio',
    },
  ],
};
