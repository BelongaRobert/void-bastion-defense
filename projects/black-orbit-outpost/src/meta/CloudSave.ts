import type { SaveBlob } from '../state/SaveService';

/**
 * Steam Cloud stub — mirrors local saves when App ID / bridge exists.
 * Until steamworks is wired, this only logs and keeps an in-memory mirror.
 */
class CloudSaveService {
  private mirror: string | null = null;

  async push(blob: SaveBlob): Promise<void> {
    const payload = JSON.stringify(blob);
    this.mirror = payload;
    try {
      const api = window.steamAPI as
        | { writeCloud?: (name: string, data: string) => Promise<void> | void; appId?: number | null }
        | undefined;
      if (api?.writeCloud && api.appId) {
        await api.writeCloud('boo_save_v1.json', payload);
      }
    } catch (err) {
      console.warn('[CloudSave] push failed', err);
    }
  }

  async pull(): Promise<SaveBlob | null> {
    try {
      const api = window.steamAPI as
        | { readCloud?: (name: string) => Promise<string | null> | string | null; appId?: number | null }
        | undefined;
      if (api?.readCloud && api.appId) {
        const raw = await api.readCloud('boo_save_v1.json');
        if (raw) return JSON.parse(raw) as SaveBlob;
      }
    } catch (err) {
      console.warn('[CloudSave] pull failed', err);
    }
    if (this.mirror) {
      try {
        return JSON.parse(this.mirror) as SaveBlob;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export const cloudSave = new CloudSaveService();
