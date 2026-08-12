import {
  applyMeta,
  applyRun,
  createInitialMeta,
  createInitialRun,
  metaState,
  runState,
  type MetaState,
  type RunState,
} from './RunState';

const SAVE_KEY = 'boo_save_v1';

export interface SaveBlob {
  version: 1;
  meta: MetaState;
  run: RunState | null;
  updatedAt: number;
}

export class SaveService {
  load(): SaveBlob {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        return {
          version: 1,
          meta: createInitialMeta(),
          run: null,
          updatedAt: Date.now(),
        };
      }
      const parsed = JSON.parse(raw) as SaveBlob;
      if (parsed.version !== 1) throw new Error('bad version');
      applyMeta({ ...createInitialMeta(), ...parsed.meta });
      if (parsed.run) applyRun({ ...createInitialRun(), ...parsed.run });
      return parsed;
    } catch {
      return {
        version: 1,
        meta: createInitialMeta(),
        run: null,
        updatedAt: Date.now(),
      };
    }
  }

  hasContinue(): boolean {
    const blob = this.readRaw();
    return !!blob?.run && (blob.run.coreHp ?? 0) > 0 && (blob.run.playerHp ?? 0) > 0;
  }

  saveRun(): void {
    const blob: SaveBlob = {
      version: 1,
      meta: { ...metaState },
      run: { ...runState, autogunNestPos: runState.autogunNestPos ? { ...runState.autogunNestPos } : null },
      updatedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(blob));
  }

  saveMetaOnly(): void {
    const existing = this.readRaw();
    const blob: SaveBlob = {
      version: 1,
      meta: { ...metaState },
      run: existing?.run ?? null,
      updatedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(blob));
  }

  clearRun(): void {
    const blob: SaveBlob = {
      version: 1,
      meta: { ...metaState },
      run: null,
      updatedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(blob));
  }

  private readRaw(): SaveBlob | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SaveBlob;
    } catch {
      return null;
    }
  }
}

export const saveService = new SaveService();
