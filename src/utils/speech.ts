/**
 * ClassGo - High Performance Vietnamese Text-To-Speech (TTS) Engine
 * Powered by Web Speech API with centralized voice lifecycle management.
 * 
 * Strict Language Safety Rules:
 * 1. isVoiceVietnamese() strictly validates voice.lang ('vi-VN' or 'vi-*'). Never uses voice name substrings.
 * 2. If NO Vietnamese voice is found on the device, speech MUST NOT run, MUST NOT fallback to foreign languages.
 * 3. Settings UI only exposes valid Vietnamese voices and automatically clears invalid/foreign saved voiceURIs.
 * 4. All speech requests enforce Vietnamese voice assignment before synth.speak().
 */

export interface SpeechOptions {
  enabled?: boolean;
  rate?: number;
  pitch?: number;
  volume?: number;
  template?: string;
  voiceUri?: string;
  announceCount?: boolean;
}

export type SpeechState = 'idle' | 'speaking' | 'paused' | 'error';

/**
 * Normalizes and cleans Vietnamese student names for crystal-clear TTS pronunciation.
 * Handles:
 * - Order prefixes like "01. ", "STT 12: ", "1/ "
 * - Parentheses with gender or notes like "(Nam)", "(Nữ)", "(Tổ 1)"
 * - Excessive spaces, tabs, newlines
 * - Unicode NFC normalization
 */
export function cleanVietnameseName(rawName: string): string {
  if (!rawName) return '';

  let cleaned = rawName.normalize('NFC').trim();

  // 1. Remove STT / Index prefixes (e.g. "01. ", "1/ ", "STT 05: ", "No. 3 - ")
  cleaned = cleaned.replace(/^(stt\s*[:.-]?\s*\d+|no\s*[:.-]?\s*\d+|\d+\s*[:./\-)]\s*)/i, '');

  // 2. Remove parenthetical gender or notes at the end (e.g. "(Nam)", "(Nữ)", "[Vắng]")
  cleaned = cleaned.replace(/\s*[\(\[\{](nam|nữ|nu|vắng|vang|tổ\s*\d+|nhóm\s*\d+)[\)\]\}]\s*/gi, '');

  // 3. Remove unwanted special symbols while keeping letters, spaces and standard Vietnamese diacritics
  cleaned = cleaned.replace(/[^\p{L}\p{M}\s'-]/gu, ' ');

  // 4. Collapse multiple spaces and trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned || rawName.trim();
}

/**
 * Helper to check if a SpeechSynthesisVoice is genuinely Vietnamese.
 * STRICT RULE: Only relies on voice.lang. Voice name is NEVER used to determine language.
 */
export function isVoiceVietnamese(voice: SpeechSynthesisVoice): boolean {
  if (!voice || !voice.lang) return false;
  const lang = voice.lang.toLowerCase().replace(/_/g, '-');
  return lang === 'vi-vn' || lang.startsWith('vi-');
}

class SpeechEngine {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isSupported: boolean = false;
  private isEnabled: boolean = true;
  private rate: number = 0.95; // Default natural speaking rate
  private pitch: number = 1.0;
  private volume: number = 1.0;
  private template: string = 'Xin mời bạn {name} lên bảng!';
  private voiceUri: string = '';
  private announceCount: boolean = false;

  // Active utterance reference set to prevent Chrome's Garbage Collection bug
  private activeUtterances: Set<SpeechSynthesisUtterance> = new Set();
  private stateListeners: Set<(state: SpeechState, text: string) => void> = new Set();
  private voicesListeners: Set<(voices: SpeechSynthesisVoice[]) => void> = new Set();
  private currentState: SpeechState = 'idle';
  private currentText: string = '';
  private keepAliveInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.isSupported = true;
      this.initVoices();
    }
  }

  private initVoices() {
    if (!this.synth) return;

    const populate = () => {
      try {
        const list = this.synth!.getVoices();
        if (list && list.length > 0) {
          this.voices = list;
          this.voicesListeners.forEach((listener) => {
            try {
              listener(this.voices);
            } catch {
              // ignore
            }
          });
        }
      } catch (e) {
        console.warn('ClassGo TTS: Error getting voices', e);
      }
    };

    // Immediate attempt
    populate();

    // Centralized event listener - only registered once
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => populate();
    } else if (typeof window !== 'undefined') {
      window.addEventListener('load', () => populate());
    }
  }

  public isAvailable(): boolean {
    return this.isSupported;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.synth && this.voices.length === 0) {
      try {
        this.voices = this.synth.getVoices();
      } catch {
        // ignore
      }
    }
    return this.voices;
  }

  public getVietnameseVoices(): SpeechSynthesisVoice[] {
    return this.getVoices().filter(isVoiceVietnamese);
  }

  public hasVietnameseVoice(): boolean {
    return this.getVietnameseVoices().length > 0;
  }

  /**
   * Find the most optimal Vietnamese voice available on the user's OS/Browser.
   * Strict Rules:
   * 1. Only selects from voices where isVoiceVietnamese(voice) is true.
   * 2. If no Vietnamese voice exists, returns null.
   * 3. If user selected a voiceUri, only uses it if that voice is genuinely Vietnamese.
   * 4. Prioritizes lang === 'vi-vn'.
   * 5. If multiple vi-vn voices exist, prefers Microsoft Natural or Google voices.
   * 6. Returns null if no Vietnamese voice is found.
   */
  public getBestVietnameseVoice(): SpeechSynthesisVoice | null {
    const viVoices = this.getVietnameseVoices();
    if (viVoices.length === 0) return null;

    // 1. If user selected a specific voice, ensure it's still a valid Vietnamese voice
    if (this.voiceUri) {
      const matched = viVoices.find((v) => v.voiceURI === this.voiceUri);
      if (matched) return matched;
    }

    // 2. Prioritize exact 'vi-VN' matches
    const viVNExact = viVoices.filter((v) => (v.lang || '').toLowerCase().replace(/_/g, '-') === 'vi-vn');
    const searchPool = viVNExact.length > 0 ? viVNExact : viVoices;

    // 3. Among valid Vietnamese voices, prefer Microsoft Natural / Neural
    const microsoft = searchPool.find(
      (v) => v.name.toLowerCase().includes('microsoft') || v.name.toLowerCase().includes('natural')
    );
    if (microsoft) return microsoft;

    // 4. Then prefer Google Vietnamese
    const google = searchPool.find((v) => v.name.toLowerCase().includes('google'));
    if (google) return google;

    // 5. Fallback to the first validated Vietnamese voice
    return searchPool[0];
  }

  public subscribe(listener: (state: SpeechState, text: string) => void) {
    this.stateListeners.add(listener);
    listener(this.currentState, this.currentText);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  public subscribeVoices(listener: (voices: SpeechSynthesisVoice[]) => void) {
    this.voicesListeners.add(listener);
    if (this.voices.length > 0) {
      listener(this.voices);
    }
    return () => {
      this.voicesListeners.delete(listener);
    };
  }

  private notifyState(state: SpeechState, text: string = '') {
    this.currentState = state;
    this.currentText = text;
    this.stateListeners.forEach((fn) => {
      try {
        fn(state, text);
      } catch {
        // ignore
      }
    });
  }

  public updateConfig(options: SpeechOptions) {
    if (options.enabled !== undefined) this.isEnabled = options.enabled;
    if (options.rate !== undefined) this.rate = options.rate;
    if (options.pitch !== undefined) this.pitch = options.pitch;
    if (options.volume !== undefined) this.volume = options.volume;
    if (options.template !== undefined) this.template = options.template;
    if (options.voiceUri !== undefined) {
      // Validate that the new voiceUri belongs to a Vietnamese voice; if not, reset to empty
      if (options.voiceUri) {
        const viVoices = this.getVietnameseVoices();
        const isValidVi = viVoices.some((v) => v.voiceURI === options.voiceUri);
        this.voiceUri = isValidVi ? options.voiceUri : '';
      } else {
        this.voiceUri = '';
      }
    }
    if (options.announceCount !== undefined) this.announceCount = options.announceCount;
  }

  /**
   * Unlock audio / speech synthesis on user gesture.
   */
  public unlock() {
    if (!this.synth) return;
    try {
      if (this.synth.paused) {
        this.synth.resume();
      }
    } catch {
      // ignore
    }
  }

  /**
   * Cancel and halt any current speaking utterance safely.
   */
  public stop() {
    if (!this.synth) return;
    try {
      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = null;
      }
      this.synth.cancel();
      this.activeUtterances.clear();
      this.notifyState('idle', '');
    } catch {
      // ignore
    }
  }

  /**
   * Core speaking method with full Vietnamese voice enforcement, Chrome GC protection, and audio resumption.
   * MANDATORY: If no Vietnamese voice is available, NO speech is executed and an error is notified.
   */
  public speakText(text: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.isEnabled || !text || !text.trim()) {
        resolve(false);
        return;
      }

      if (!this.synth) {
        this.notifyState('error', 'Trình duyệt không hỗ trợ Web Speech API');
        resolve(false);
        return;
      }

      // STRICT CHECK: Must find a genuine Vietnamese voice
      const bestVoice = this.getBestVietnameseVoice();
      if (!bestVoice) {
        this.notifyState(
          'error',
          'Không tìm thấy giọng đọc tiếng Việt trên thiết bị.'
        );
        resolve(false);
        return;
      }

      try {
        // 1. Cancel previous utterance cleanly
        this.stop();

        // 2. Unlock if paused
        if (this.synth.paused) {
          this.synth.resume();
        }

        const cleanText = text.trim();
        const utterance = new SpeechSynthesisUtterance(cleanText);

        // Standard Vietnamese locale & voice binding
        utterance.lang = 'vi-VN';
        utterance.voice = bestVoice;
        utterance.rate = Math.max(0.7, Math.min(1.4, this.rate || 0.95));
        utterance.pitch = Math.max(0.7, Math.min(1.3, this.pitch || 1.0));
        utterance.volume = Math.max(0.1, Math.min(1.0, this.volume !== undefined ? this.volume : 1.0));

        // Store reference in Set to prevent Chrome Garbage Collection mid-speech
        this.activeUtterances.add(utterance);

        // Keep-alive timer for long sentences on Chromium
        this.keepAliveInterval = setInterval(() => {
          if (this.synth && this.synth.speaking && !this.synth.paused) {
            this.synth.pause();
            this.synth.resume();
          }
        }, 8000);

        utterance.onstart = () => {
          this.notifyState('speaking', cleanText);
        };

        utterance.onend = () => {
          if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
          }
          this.activeUtterances.delete(utterance);
          this.notifyState('idle', '');
          resolve(true);
        };

        utterance.onerror = (event) => {
          if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
          }
          this.activeUtterances.delete(utterance);
          // 'canceled' or 'interrupted' happens on rapid spins - that is expected behavior
          if (event.error !== 'canceled' && event.error !== 'interrupted') {
            console.warn('ClassGo TTS error:', event.error);
            this.notifyState('error', `Không thể phát âm: ${event.error}`);
          } else {
            this.notifyState('idle', '');
          }
          resolve(false);
        };

        // Trigger speak strictly with Vietnamese voice bound
        this.synth.speak(utterance);

        // Immediate resume check
        if (this.synth.paused) {
          this.synth.resume();
        }
      } catch (err) {
        console.warn('ClassGo TTS speak failed:', err);
        this.notifyState('error', 'Lỗi khởi chạy bộ đọc giọng nói');
        resolve(false);
      }
    });
  }

  /**
   * Formats and speaks a selected student's name smoothly.
   */
  public speakStudent(name: string, callCount?: number, overrideText?: string) {
    if (!this.isEnabled) return;

    const normalizedName = cleanVietnameseName(name);
    if (!normalizedName && !overrideText) return;

    let textToSpeak = overrideText;
    if (!textToSpeak) {
      textToSpeak = this.template.replace(/\{name\}/g, normalizedName);
      if (this.announceCount && callCount !== undefined && callCount > 0) {
        textToSpeak += ` Đây là lần thứ ${callCount} bạn lên bảng.`;
      }
    }

    this.speakText(textToSpeak);
  }

  /**
   * Speaks multiple student names smoothly for group calls.
   */
  public speakMultipleStudents(names: string[]) {
    if (!this.isEnabled || !names || names.length === 0) return;

    const cleanedNames = names.map(cleanVietnameseName).filter(Boolean);
    if (cleanedNames.length === 0) return;

    if (cleanedNames.length === 1) {
      this.speakStudent(cleanedNames[0]);
      return;
    }

    const last = cleanedNames[cleanedNames.length - 1];
    const initial = cleanedNames.slice(0, -1).join(', ');
    const text = `Xin mời các bạn: ${initial} và ${last} lên bảng!`;
    this.speakText(text);
  }

  /**
   * Sample voice test for teacher in Settings.
   */
  public testSampleVoice(customName?: string) {
    const name = cleanVietnameseName(customName || 'Nguyễn Văn An');
    const text = `Xin mời bạn ${name} lên bảng!`;
    this.speakText(text);
  }
}

export const speechEngine = new SpeechEngine();
