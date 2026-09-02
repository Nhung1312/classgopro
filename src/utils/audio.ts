/**
 * Web Audio API based Sound Synthesizer for classroom lucky spin
 * Safe against autoplay restrictions & requires zero external assets.
 */
import { BgmStyle } from '../types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isEnabled: boolean = true;
  private volume: number = 0.7;
  private bgmInterval: number | null = null;
  private isBgmPlaying: boolean = false;
  private bgmStyle: BgmStyle = 'SUSPENSE_GAME';

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stopBGM();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  /**
   * Crisp mechanical click/tick for name flipping
   */
  public playTick(pitchMultiplier: number = 1.0) {
    if (!this.isEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freq = 650 * pitchMultiplier;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(this.volume * 0.22, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // Ignore audio failure gracefully
    }
  }

  /**
   * Whoosh sound when starting the spin
   */
  public playWhoosh() {
    if (!this.isEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.25);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.45);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(this.volume * 0.32, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.46);
    } catch {
      // ignore
    }
  }

  /**
   * Countdown pip / suspense tick
   */
  public playPip(isHigh: boolean = false) {
    if (!this.isEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isHigh ? 880 : 440, now);

      gain.gain.setValueAtTime(this.volume * 0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // ignore
    }
  }

  /**
   * Dramatic reveal hit / brass impact
   */
  public playImpact() {
    if (!this.isEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Low punch
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);

      gain.gain.setValueAtTime(this.volume * 0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch {
      // ignore
    }
  }

  /**
   * Classroom Timer Alarm / Digital Chime
   */
  public playTimerAlarm() {
    if (!this.isEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const chords = [
        { freq: 880, time: 0 },
        { freq: 1108.73, time: 0.12 },
        { freq: 1318.51, time: 0.24 },
        { freq: 1760, time: 0.36 },
        { freq: 880, time: 0.6 },
        { freq: 1318.51, time: 0.72 },
        { freq: 1760, time: 0.84 },
      ];

      chords.forEach((c) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(c.freq, now + c.time);
        gain.gain.setValueAtTime(0, now + c.time);
        gain.gain.linearRampToValueAtTime(this.volume * 0.35, now + c.time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + c.time + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + c.time);
        osc.stop(now + c.time + 0.25);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Quick positive feedback chime for save / export actions
   */
  public playSuccess() {
    if (!this.isEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(this.volume * 0.3, now + idx * 0.08 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.26);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Modern uplifting victory fanfare (majestic chord progression)
   */
  public playVictoryFanfare() {
    if (!this.isEnabled) return;
    this.stopBGM();
    try {
      this.initContext();
      if (!this.ctx) return;

      this.playImpact();

      const now = this.ctx.currentTime;
      // Arpeggio notes: C5, E5, G5, C6 (523.25, 659.25, 783.99, 1046.50)
      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.15 },
        { freq: 659.25, time: 0.12, dur: 0.15 },
        { freq: 783.99, time: 0.24, dur: 0.2 },
        { freq: 1046.50, time: 0.38, dur: 0.6 },
        { freq: 1318.51, time: 0.50, dur: 0.7 }, // E6 top sparkle
      ];

      notes.forEach((n) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.freq, now + n.time);

        const startTime = now + n.time;
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(this.volume * 0.32, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + n.dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + n.dur + 0.05);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Suspense BGM Generator
   */
  public startBGM(style: BgmStyle = 'SUSPENSE_GAME', customVolume: number = 0.5) {
    if (!this.isEnabled || style === 'OFF') return;
    this.stopBGM();
    this.initContext();
    if (!this.ctx) return;

    this.isBgmPlaying = true;
    this.bgmStyle = style;
    const vol = this.volume * customVolume;

    let step = 0;
    const bpm = style === 'DRUMROLL' ? 140 : style === 'CYBER' ? 128 : 110;
    const intervalMs = Math.round((60 / bpm / 2) * 1000); // 1/8 note intervals

    this.bgmInterval = window.setInterval(() => {
      if (!this.ctx || !this.isBgmPlaying) return;
      const now = this.ctx.currentTime;

      if (style === 'SUSPENSE_GAME') {
        // Ai Là Triệu Phú / Heartbeat Tension
        // Low heartbeat thud on 0 and 2, suspense high metallic tick on odd steps
        if (step % 2 === 0) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(75, now);
          osc.frequency.exponentialRampToValueAtTime(38, now + 0.14);
          gain.gain.setValueAtTime(vol * 0.35, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.16);
        } else {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(800 + (step % 8) * 40, now);
          gain.gain.setValueAtTime(vol * 0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.07);
        }
      } else if (style === 'DRUMROLL') {
        // Realistic accelerating snare roll
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const jitter = (Math.random() - 0.5) * 40;
        osc.frequency.setValueAtTime(190 + jitter, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);

        const dyn = Math.min(1.0, 0.2 + (step / 30) * 0.6);
        gain.gain.setValueAtTime(vol * 0.25 * dyn, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
      } else if (style === 'CYBER') {
        // Cyber suspense arpeggio
        const synthNotes = [220, 261.63, 329.63, 392.00, 440, 523.25, 659.25, 523.25];
        const freq = synthNotes[step % synthNotes.length];

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(vol * 0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      }

      step++;
    }, intervalMs);
  }

  public stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmInterval !== null) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  /**
   * Sweet magical chime when awarding bonus stars
   */
  public playStarSound() {
    if (!this.isEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [1046.5, 1318.51, 1567.98, 2093.0]; // C6, E6, G6, C7
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);

        gain.gain.setValueAtTime(this.volume * 0.28, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.3);
      });
    } catch {
      // ignore
    }
  }

  public previewBGM(style: BgmStyle) {
    this.startBGM(style, 0.6);
    setTimeout(() => {
      this.stopBGM();
    }, 2800);
  }
}

export const soundEngine = new SoundEngine();

