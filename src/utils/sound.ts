// Web Audio API Synthesizer for Minecraft-style sound effects + Microsoft Edge Neural TTS Reader (iPad Safari compatible)

const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

class SoundManager {
  private ctx: AudioContext | null = null;
  private sharedAudio: HTMLAudioElement | null = null;
  private currentBlobUrl: string | null = null;
  private currentSourceNode: AudioBufferSourceNode | null = null;
  private abortController: AbortController | null = null;
  private speakSeq = 0;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speakTimer: ReturnType<typeof setTimeout> | null = null;
  private stateListeners = new Set<(speaking: boolean) => void>();
  private unlocked = false;

  public soundEnabled = true;
  public voiceEnabled = true;
  public isSpeaking = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockHandler = () => {
        this.unlockAudio();
      };
      window.addEventListener('touchstart', unlockHandler, { passive: true });
      window.addEventListener('pointerdown', unlockHandler, { passive: true });
      window.addEventListener('click', unlockHandler, { passive: true });
      window.addEventListener('keydown', unlockHandler, { passive: true });
    }
  }

  private setSpeaking(val: boolean) {
    this.isSpeaking = val;
    this.stateListeners.forEach((fn) => fn(val));
  }

  public onSpeakingChange(fn: (speaking: boolean) => void): () => void {
    this.stateListeners.add(fn);
    return () => {
      this.stateListeners.delete(fn);
    };
  }

  private getRawContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getContext(): AudioContext | null {
    if (!this.soundEnabled) return null;
    return this.getRawContext();
  }

  private getSharedAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (!this.sharedAudio) {
      this.sharedAudio = new Audio();
      this.sharedAudio.preload = 'auto';
      this.sharedAudio.setAttribute('playsinline', 'true');
      this.sharedAudio.setAttribute('webkit-playsinline', 'true');
    }
    return this.sharedAudio;
  }

  // Unlock both Web Audio API and HTMLAudioElement on first user gesture (required by iPadOS/iOS Safari)
  public unlockAudio() {
    const ctx = this.getRawContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (this.unlocked) return;
    this.unlocked = true;

    if (ctx) {
      try {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      } catch {
        // ignore
      }
    }

    const audio = this.getSharedAudio();
    if (audio && !this.isSpeaking) {
      try {
        audio.muted = true;
        audio.src = SILENT_WAV_DATA_URI;
        const p = audio.play();
        if (p) {
          p.then(() => {
            audio.pause();
            audio.muted = false;
            audio.currentTime = 0;
          }).catch(() => {
            audio.muted = false;
            this.unlocked = false;
          });
        }
      } catch {
        audio.muted = false;
      }
    }
  }

  // Classic Minecraft button click
  playClick() {
    this.unlockAudio();
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.055);
  }

  // Block placement thud/pop
  playPlaceBlock() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240 + Math.random() * 80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.085);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  }

  // Block break crunch
  playBreakBlock() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(75, ctx.currentTime + 0.11);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.11);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  // Minecraft XP orb ding!
  playXpOrb() {
    const ctx = this.getContext();
    if (!ctx) return;
    const notes = [784, 987.77, 1174.66, 1567.98];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const start = ctx.currentTime + idx * 0.07;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.008, start + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.23);
    });
  }

  // Loot Chest Open + Level up fanfare
  playChestFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = ctx.currentTime + i * 0.09;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.22, start);
      gain.gain.exponentialRampToValueAtTime(0.008, start + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.46);
    });
  }

  // Cute pet happy sound
  playPetHappy() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.14);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.26);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.27);
  }

  // Clean emojis so TTS engine reads smoothly
  private cleanSpeechText(raw: string): string {
    return raw
      .replace(
        /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F2FF}]/gu,
        ''
      )
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Fallback browser speechSynthesis with Chrome/Safari fixes
  private speakWithBrowserTTS(cleanText: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.setSpeaking(false);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      this.speakTimer = setTimeout(() => {
        const utter = new SpeechSynthesisUtterance(cleanText);
        this.currentUtterance = utter; // Prevent V8 garbage collection
        utter.lang = 'zh-CN';
        utter.rate = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const zhVoice =
          voices.find((v) => v.lang === 'zh-CN' && v.name.includes('Tingting')) ||
          voices.find((v) => v.lang === 'zh-CN') ||
          voices.find((v) => v.lang.startsWith('zh'));
        if (zhVoice) {
          utter.voice = zhVoice;
        }

        utter.onstart = () => this.setSpeaking(true);
        utter.onend = () => this.setSpeaking(false);
        utter.onerror = () => this.setSpeaking(false);

        window.speechSynthesis.speak(utter);
      }, 60);
    } catch {
      this.setSpeaking(false);
    }
  }

  // Speak Chinese text using Microsoft Edge Neural TTS via /api/tts
  // Uses Web Audio API (AudioContext) primary output so iPad Safari plays reliably even after async homework grading
  async speak(text: string, force = false) {
    if ((!this.voiceEnabled && !force) || typeof window === 'undefined') {
      return;
    }

    const cleanText = this.cleanSpeechText(text);
    if (!cleanText) return;

    this.unlockAudio();
    this.stopSpeak();

    const seq = ++this.speakSeq;
    const controller = new AbortController();
    this.abortController = controller;
    this.setSpeaking(true);

    const audioUrl = `/api/tts?text=${encodeURIComponent(cleanText)}`;

    try {
      const response = await fetch(audioUrl, { signal: controller.signal });
      if (seq !== this.speakSeq) return;
      if (!response.ok) {
        throw new Error(`TTS HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      if (seq !== this.speakSeq || arrayBuffer.byteLength === 0) return;

      // Primary playback: Web Audio API (AudioContext) - bypasses iOS Safari async gesture blockage
      const ctx = this.getRawContext();
      if (ctx) {
        try {
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
          if (seq !== this.speakSeq) return;

          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          this.currentSourceNode = source;

          source.onended = () => {
            if (this.currentSourceNode === source) {
              this.currentSourceNode = null;
              this.setSpeaking(false);
            }
          };

          source.start(0);
          return;
        } catch {
          // If Web Audio decode fails, fall through to persistent HTMLAudioElement
        }
      }

      // Secondary playback: Persistent unlocked HTMLAudioElement with Blob URL
      if (seq !== this.speakSeq) return;
      const audio = this.getSharedAudio();
      if (!audio) {
        this.speakWithBrowserTTS(cleanText);
        return;
      }

      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const blobUrl = URL.createObjectURL(blob);
      this.currentBlobUrl = blobUrl;

      audio.muted = false;
      audio.src = blobUrl;
      audio.onended = () => {
        if (seq === this.speakSeq) {
          this.cleanupBlobUrl();
          this.setSpeaking(false);
        }
      };
      audio.onerror = () => {
        if (seq === this.speakSeq) {
          this.cleanupBlobUrl();
          this.speakWithBrowserTTS(cleanText);
        }
      };

      await audio.play();
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      if (seq === this.speakSeq) {
        this.speakWithBrowserTTS(cleanText);
      }
    }
  }

  private cleanupBlobUrl() {
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
  }

  stopSpeak() {
    this.speakSeq++;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.speakTimer) {
      clearTimeout(this.speakTimer);
      this.speakTimer = null;
    }
    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.onended = null;
        this.currentSourceNode.stop();
        this.currentSourceNode.disconnect();
      } catch {
        // ignore
      }
      this.currentSourceNode = null;
    }
    if (this.sharedAudio) {
      try {
        this.sharedAudio.onended = null;
        this.sharedAudio.onerror = null;
        this.sharedAudio.pause();
      } catch {
        // ignore
      }
    }
    this.cleanupBlobUrl();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    this.currentUtterance = null;
    this.setSpeaking(false);
  }
}

export const sound = new SoundManager();
