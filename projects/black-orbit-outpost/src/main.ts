import { createGame } from './game/GameApp';

const parent = document.getElementById('game');
if (!parent) {
  throw new Error('#game root missing');
}

createGame('game');
