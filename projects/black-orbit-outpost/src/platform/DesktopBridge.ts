/** Thin bridge to Electron / Steam stubs exposed via preload. */

export type SteamBridge = {
  unlockAchievement?: (id: string) => Promise<void> | void;
  setRichPresence?: (key: string, value: string) => Promise<void> | void;
  writeCloud?: (name: string, data: string) => Promise<void> | void;
  readCloud?: (name: string) => Promise<string | null> | string | null;
  isSteam?: boolean;
  appId?: number | null;
};

export type DesktopBridge = {
  isElectron?: boolean;
  platform?: string;
  isDeckLikely?: boolean;
};

declare global {
  interface Window {
    steamAPI?: SteamBridge;
    booDesktop?: DesktopBridge;
  }
}

export function isElectron(): boolean {
  return !!window.booDesktop?.isElectron;
}

export function isDeckLikely(): boolean {
  if (window.booDesktop?.isDeckLikely) return true;
  // Steam Deck native HUD is often 1280×800; also catch common scaled window sizes.
  const w = window.innerWidth;
  const h = window.innerHeight;
  return (w === 1280 && h === 800) || (w === 1280 && h === 720 && isElectron());
}

export function setRichPresence(status: string): void {
  try {
    void window.steamAPI?.setRichPresence?.('status', status);
  } catch {
    /* standalone */
  }
}
