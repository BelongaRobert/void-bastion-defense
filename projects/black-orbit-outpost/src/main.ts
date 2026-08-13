import '@fontsource/orbitron/500.css';
import '@fontsource/orbitron/700.css';
import '@fontsource/share-tech-mono/400.css';
import { createGame } from './game/GameApp';
import { audioBus } from './audio/AudioBus';

const parent = document.getElementById('game');
if (!parent) {
  throw new Error('#game root missing');
}

const unlock = () => audioBus.unlock();
window.addEventListener('pointerdown', unlock, { once: true });
window.addEventListener('keydown', unlock, { once: true });

createGame('game');
