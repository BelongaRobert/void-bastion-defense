import type { WaveDef, WaveSpawn } from '../content/waves';
import type { EnemyId } from '../content/enemies';
import { GAME_HEIGHT, GAME_WIDTH } from '../theme';
import type { EnemyGroup } from './Enemy';

interface PendingSpawn {
  type: EnemyId;
  at: number;
}

export class EnemyDirector {
  private queue: PendingSpawn[] = [];
  private started = false;
  private doneQueueing = false;
  private wave!: WaveDef;

  begin(wave: WaveDef): void {
    this.wave = wave;
    this.queue = [];
    this.started = true;
    this.doneQueueing = false;
    const now = performance.now();
    for (const group of wave.spawns) {
      this.enqueueGroup(group, now);
    }
    this.doneQueueing = true;
  }

  private enqueueGroup(group: WaveSpawn, now: number): void {
    const base = now + (group.delayMs ?? 0);
    const interval = group.intervalMs ?? 800;
    for (let i = 0; i < group.count; i++) {
      this.queue.push({ type: group.type, at: base + i * interval });
    }
  }

  update(enemies: EnemyGroup): void {
    if (!this.started) return;
    const now = performance.now();
    while (this.queue.length && this.queue[0].at <= now) {
      const next = this.queue.shift()!;
      const edge = this.randomEdge();
      enemies.spawnAt(next.type, edge.x, edge.y);
    }
  }

  isFinishedSpawning(): boolean {
    return this.doneQueueing && this.queue.length === 0;
  }

  remainingToSpawn(): number {
    return this.queue.length;
  }

  getLabel(): string {
    return this.wave?.label ?? '';
  }

  private randomEdge(): { x: number; y: number } {
    const side = Math.floor(Math.random() * 4);
    const pad = 30;
    switch (side) {
      case 0:
        return { x: Math.random() * GAME_WIDTH, y: -pad };
      case 1:
        return { x: GAME_WIDTH + pad, y: Math.random() * GAME_HEIGHT };
      case 2:
        return { x: Math.random() * GAME_WIDTH, y: GAME_HEIGHT + pad };
      default:
        return { x: -pad, y: Math.random() * GAME_HEIGHT };
    }
  }
}
