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

/** Antagonist identity locked: Nyx — the voice that woke the orbit. */
export const ANTAGONIST_NAME = 'NYX';

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
      name: ANTAGONIST_NAME,
      text: 'Hold all you like. I already woke the orbit. Your outpost is just… meat in a can.',
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
      name: ANTAGONIST_NAME,
      text: 'Pretty gunfire. The Dockmaster will enjoy chewing through it.',
      portrait: 'villain',
    },
    {
      speaker: 'protagonist',
      name: 'DEFENDER',
      text: "Keep talking, Nyx. I'm planting steel between you and my core.",
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
      name: ANTAGONIST_NAME,
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
      name: ANTAGONIST_NAME,
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
      name: ANTAGONIST_NAME,
      text: 'One carcass. Cold Storage still sleeps hungry. Keep walking, little can of meat.',
      portrait: 'villain',
    },
    {
      speaker: 'system',
      name: 'ORBIT RELAY',
      text: 'Act 1 complete. Orbit Marks awarded. Cold Storage seal unlocked.',
      portrait: 'radio',
    },
  ],
};

export const ACT2_INTRO: StoryBeat = {
  id: 'act2_intro',
  lines: [
    {
      speaker: 'system',
      name: 'ORBIT RELAY',
      text: 'Cold Storage online. Freezer fog. Reflections that move wrong. Core transferred to vault node.',
      portrait: 'radio',
    },
    {
      speaker: 'protagonist',
      name: 'DEFENDER',
      text: "Temperature's dropping. Breath fogs. Something's watching from the ice.",
      portrait: 'hero',
    },
    {
      speaker: 'antagonist',
      name: ANTAGONIST_NAME,
      text: 'Welcome to my pantry. The Cold Vault keeps the best cuts. Try not to spoil.',
      portrait: 'villain',
    },
  ],
};

export const ACT2_MID: StoryBeat = {
  id: 'act2_mid',
  lines: [
    {
      speaker: 'antagonist',
      name: ANTAGONIST_NAME,
      text: 'Hear the compressors? That is the Vault dreaming. It dreams in teeth.',
      portrait: 'villain',
    },
    {
      speaker: 'protagonist',
      name: 'DEFENDER',
      text: "Then I'll wake it with hot lead. Stay on the line, Relay.",
      portrait: 'hero',
    },
  ],
};

export const ACT2_PRE_ELITE: StoryBeat = {
  id: 'act2_pre_elite',
  lines: [
    {
      speaker: 'system',
      name: 'ORBIT RELAY',
      text: 'Massive cold signature — Chapter Elite: Cold Vault. Ambush packs likely.',
      portrait: 'radio',
    },
    {
      speaker: 'antagonist',
      name: ANTAGONIST_NAME,
      text: 'Open wide, Vault. Dinner is still warm.',
      portrait: 'villain',
    },
    {
      speaker: 'protagonist',
      name: 'DEFENDER',
      text: "Nyx — when this thing falls, I'm coming for your frequency next.",
      portrait: 'hero',
    },
  ],
};

export const ACT2_CLEAR: StoryBeat = {
  id: 'act2_clear',
  lines: [
    {
      speaker: 'protagonist',
      name: 'DEFENDER',
      text: 'Vault is ice and ruin. Fog clearing. Two acts. Still standing.',
      portrait: 'hero',
    },
    {
      speaker: 'antagonist',
      name: ANTAGONIST_NAME,
      text: 'Cute. Black Orbit still waits outside the plates. The Waker has your name.',
      portrait: 'villain',
    },
    {
      speaker: 'system',
      name: 'ORBIT RELAY',
      text: 'Act 2 complete. Act 3 — Black Orbit — sealed for M4.',
      portrait: 'radio',
    },
  ],
};
