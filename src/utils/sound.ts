// Web Audio API Synthesizer for Minecraft-style sound effects + Reliable Chinese TTS Voice Reader

class SoundManager {
  private ctx: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speakTimer: ReturnType<typeof setTimeout> | null = null;
  private stateListeners = new Set<(speaking: boolean) => void>();

  public soundEnabled = true;
  public voiceEnabled = true;
  public isSpeaking = false;

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

  private getContext(): AudioContext | null {
    if (!this.soundEnabled) return null;
    if (!this.ctx && typeof window !== 'undefined') {
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

  // Classic Minecraft button click
  playClick() {
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

  // Fallback browser speechSynthesis with Chrome cancel/GC bug fixes
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
      }, 80);
    } catch {
      this.setSpeaking(false);
    }
  }

  // Speak Chinese text for 2nd grader (Primary: Server WAV TTS stream; Fallback: Browser SpeechSynthesis)
  speak(text: string, force = false) {
    if ((!this.voiceEnabled && !force) || typeof window === 'undefined') {
      return;
    }

    const cleanText = this.cleanSpeechText(text);
    if (!cleanText) return;

    this.stopSpeak();
    this.setSpeaking(true);

    const audioUrl = `/api/tts?text=${encodeURIComponent(cleanText)}`;
    const audio = new Audio(audioUrl);
    this.currentAudio = audio;

    audio.onended = () => {
      if (this.currentAudio === audio) {
        this.currentAudio = null;
        this.setSpeaking(false);
      }
    };

    audio.onerror = () => {
      if (this.currentAudio === audio) {
        this.currentAudio = null;
        // Fallback to browser Web Speech API if backend /api/tts fails
        this.speakWithBrowserTTS(cleanText);
      }
    };

    audio.play().catch(() => {
      // If autoplay policy or network blocked HTML5 audio, try browser speechSynthesis
      if (this.currentAudio === audio) {
        this.currentAudio = null;
        this.speakWithBrowserTTS(cleanText);
      }
    });
  }

  stopSpeak() {
    if (this.speakTimer) {
      clearTimeout(this.speakTimer);
      this.speakTimer = null;
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
      this.currentAudio = null;
    }
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
