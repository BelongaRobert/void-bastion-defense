import { settingsState } from '../state/SettingsState';

/**
 * Procedural Web Audio SFX — no asset pack required.
 * Quiet cosmic dread: short noise bursts, soft tones, no chiptune spam.
 */
class AudioBusImpl {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientOsc: OscillatorNode[] = [];
  private lastShot = 0;
  private ambientOn = false;

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = settingsState.sfxVolume;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      if (this.master) this.master.gain.value = settingsState.sfxVolume;
      return this.ctx;
    } catch {
      return null;
    }
  }

  setVolume(v: number): void {
    settingsState.sfxVolume = PhaserMathClamp(v, 0, 1);
    if (this.master) this.master.gain.value = settingsState.sfxVolume;
    if (this.ambientGain) {
      // Preserve relative ambient level roughly
      this.ambientGain.gain.value = Math.max(0.01, this.ambientGain.gain.value) *
        (settingsState.sfxVolume / Math.max(0.01, settingsState.sfxVolume || 0.8));
      this.ambientGain.gain.value = 0.028 * settingsState.sfxVolume;
    }
  }

  unlock(): void {
    this.ensure();
  }

  shoot(kind: 'smg' | 'shotgun'): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    if (kind === 'smg' && now - this.lastShot < 0.04) return;
    this.lastShot = now;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = kind === 'shotgun' ? 900 : 2200;
    osc.type = 'square';
    osc.frequency.setValueAtTime(kind === 'shotgun' ? 90 : 180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + (kind === 'shotgun' ? 0.12 : 0.05));
    gain.gain.setValueAtTime(kind === 'shotgun' ? 0.22 : 0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (kind === 'shotgun' ? 0.18 : 0.06));
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.2);

    if (kind === 'shotgun') this.noiseBurst(0.12, 0.18, 600);
  }

  emptyClick(): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 140;
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  reload(): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 220 + i * 40;
      const t = now + i * 0.05;
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + 0.08);
    }
  }

  hit(): void {
    this.noiseBurst(0.04, 0.07, 1400);
  }

  dash(): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  eliteStinger(): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    const freqs = [55, 82, 110];
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(now);
      osc.stop(now + 0.95);
    }
  }

  coreAlarm(): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(330, now + 0.12);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  ui(): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 520;
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  waveClear(): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const master = this.master;
    const now = ctx.currentTime;
    [330, 415, 520].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      const t = now + i * 0.08;
      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  }

  /** Quiet cosmic drone under menus / combat. */
  startAmbient(intensity: 'menu' | 'combat' | 'elite' = 'menu'): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    this.stopAmbient();
    this.ambientOn = true;
    this.ambientGain = ctx.createGain();
    const level = intensity === 'elite' ? 0.045 : intensity === 'combat' ? 0.032 : 0.022;
    this.ambientGain.gain.value = level * settingsState.sfxVolume;
    this.ambientGain.connect(this.master);

    const base = intensity === 'elite' ? 46 : intensity === 'combat' ? 55 : 62;
    const freqs = [base, base * 1.5, base * 2.02];
    this.ambientOsc = [];
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      g.gain.value = f === base ? 0.7 : 0.28;
      osc.connect(g);
      g.connect(this.ambientGain);
      osc.start();
      this.ambientOsc.push(osc);
    }
  }

  stopAmbient(): void {
    for (const osc of this.ambientOsc) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        /* already stopped */
      }
    }
    this.ambientOsc = [];
    try {
      this.ambientGain?.disconnect();
    } catch {
      /* */
    }
    this.ambientGain = null;
    this.ambientOn = false;
  }

  setAmbientIntensity(intensity: 'menu' | 'combat' | 'elite'): void {
    if (!this.ambientOn) {
      this.startAmbient(intensity);
      return;
    }
    if (!this.ambientGain) return;
    const level = intensity === 'elite' ? 0.045 : intensity === 'combat' ? 0.032 : 0.022;
    this.ambientGain.gain.value = level * settingsState.sfxVolume;
  }

  private noiseBurst(duration: number, volume: number, cutoff: number): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = cutoff;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(now);
  }
}

function PhaserMathClamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export const audioBus = new AudioBusImpl();
