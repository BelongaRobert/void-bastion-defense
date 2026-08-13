/** Shared palette — void navy / sickly green / arterial red / cold steel */
export const Colors = {
  voidNavy: 0x070b12,
  voidNavyMid: 0x0f1826,
  steel: 0x8fa3b8,
  steelDark: 0x3a4a5c,
  biolume: 0x7dffb3,
  biolumeDim: 0x2a6b4f,
  arterial: 0xc41e3a,
  arterialBright: 0xff3b5c,
  warning: 0xe8b84a,
  text: 0xe8f0f7,
  textDim: 0x8fa3b8,
  core: 0x4de1c1,
  antagonist: 0x9b5cff,
} as const;

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const DEPTH = {
  floor: 0,
  blood: 1,
  hardpoint: 5,
  enemy: 10,
  player: 20,
  bullet: 25,
  gore: 30,
  core: 15,
  hud: 100,
  dialogue: 200,
} as const;
