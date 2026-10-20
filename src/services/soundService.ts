/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * High-definition luxury acoustic audio generator matching Luckyly's visual identity:
 * A shimmering celestial harmonic chime, deep metallic gold resonance, and subtle warm sparkle.
 * 
 * Works 100% reliably in all modern browsers without external asset dependencies or CORS issues,
 * and seamlessly supports custom external audio URLs if provided.
 */

class SoundService {
  private audioCtx: AudioContext | null = null;
  private customAudio: HTMLAudioElement | null = null;
  // Section 16: Sound must be OFF by default; users may explicitly enable it
  private isMuted: boolean = true;
  private hasUnlocked: boolean = false;

  constructor() {
    // Check localStorage for saved sound preference. Only enable if explicitly set to 'false'
    try {
      const savedMute = localStorage.getItem('luckyly_sound_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      } else {
        this.isMuted = true; // Off by default for first-time visitors
      }
    } catch {
      this.isMuted = true;
    }
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('luckyly_sound_muted', String(this.isMuted));
    } catch {
      // ignore
    }
    return this.isMuted;
  }

  private initAudioContext(): AudioContext | null {
    if (this.audioCtx) return this.audioCtx;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    } catch {
      // AudioContext not supported
    }
    return this.audioCtx;
  }

  /**
   * Set custom audio URL if user provides an external file or recording
   */
  public setCustomAudioUrl(url: string) {
    try {
      this.customAudio = new Audio(url);
      this.customAudio.preload = 'auto';
    } catch {
      // ignore
    }
  }

  /**
   * Play the signature Luckyly Brand Opening Chime
   */
  public async playOpeningSound(force: boolean = false): Promise<void> {
    if (this.isMuted && !force) return;

    // If custom audio was provided and ready
    if (this.customAudio) {
      try {
        this.customAudio.currentTime = 0;
        await this.customAudio.play();
        return;
      } catch {
        // Fallback to Web Audio synthesis if autoplay was restricted or custom failed
      }
    }

    const ctx = this.initAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        return;
      }
    }

    const now = ctx.currentTime;

    // Master gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.35, now + 0.08);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
    masterGain.connect(ctx.destination);

    // Warm deep metallic sub-resonance (Gold plate chime)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(196.00, now); // G3
    subGain.gain.setValueAtTime(0.3, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    subOsc.connect(subGain);
    subGain.connect(masterGain);
    subOsc.start(now);
    subOsc.stop(now + 2.0);

    // High crystalline celestial bells (F#6, A6, C#7, E7 sparkle)
    const frequencies = [740, 880, 1109, 1318, 1760];
    const delays = [0.0, 0.06, 0.14, 0.22, 0.32];

    frequencies.forEach((freq, idx) => {
      const startTime = now + delays[idx];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      // Slight upward pitch slide for magical sparkle
      osc.frequency.exponentialRampToValueAtTime(freq * 1.015, startTime + 1.8);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.22 - idx * 0.03, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 2.4);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + 2.5);
    });
  }

  /**
   * Play interactive UI button chime for waitlist join or questionnaire
   */
  public playInteractionChime(): void {
    if (this.isMuted) return;
    const ctx = this.initAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.15); // A5

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.65);
  }

  /**
   * Signature Luckyly Nessa Avatar interaction chime (plays unmuted celestial chime)
   */
  public playNessaChime(): void {
    this.playOpeningSound(true).catch(() => {});
  }

  /**
   * Attach first-interaction listener to handle browser autoplay policies.
   * Section 16: Never play sound unexpectedly unless explicitly unmuted by the user.
   */
  public attachAutoplayUnlock(): void {
    if (this.hasUnlocked) return;

    const unlockHandler = () => {
      if (!this.hasUnlocked) {
        this.hasUnlocked = true;
        if (!this.isMuted) {
          this.playOpeningSound();
        }
      }
      window.removeEventListener('click', unlockHandler);
      window.removeEventListener('touchstart', unlockHandler);
      window.removeEventListener('keydown', unlockHandler);
    };

    window.addEventListener('click', unlockHandler, { once: true });
    window.addEventListener('touchstart', unlockHandler, { once: true });
    window.addEventListener('keydown', unlockHandler, { once: true });
  }
}

export const soundService = new SoundService();
