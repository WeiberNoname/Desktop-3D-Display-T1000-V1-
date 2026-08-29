/**
 * Procedural Web Audio API Sound Synthesizer & Manager
 * Provides 3 real-time synthesized sound generators:
 * 1. Snow Atmosphere (❄️): Winter wind breeze + soft crystalline chimes
 * 2. Sakura Breeze Melody (🌸): Japanese pentatonic koto arpeggio + spring ambient breeze
 * 3. Simple Drum Melody (🥁): 16-step rhythmic drum groove (Kick, Snare, Hi-Hat) + cheerful synth lead
 */

export class SoundManager {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.isMuted = false;
    this.masterVolume = 0.8;

    // Track states
    this.tracks = {
      snow: { isPlaying: false, volume: 0.7, gainNode: null, nodes: [] },
      sakura: { isPlaying: false, volume: 0.7, gainNode: null, timerId: null, nodes: [] },
      drum: { isPlaying: false, volume: 0.7, gainNode: null, timerId: null, currentStep: 0, nodes: [] }
    };

    this.onStateChangeCallbacks = new Set();
  }

  _initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;
      this.audioCtx = new AudioContextClass();

      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);

      // Create individual track gain nodes
      Object.keys(this.tracks).forEach(trackKey => {
        const gainNode = this.audioCtx.createGain();
        gainNode.gain.setValueAtTime(this.tracks[trackKey].volume, this.audioCtx.currentTime);
        gainNode.connect(this.masterGain);
        this.tracks[trackKey].gainNode = gainNode;
      });
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return true;
  }

  getAudioContext() {
    this._initContext();
    return this.audioCtx;
  }

  getMasterGain() {
    this._initContext();
    return this.masterGain;
  }

  resumeAudioContext() {
    if (!this.audioCtx) {
      this._initContext();
    } else if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  syncAtmosphere(settings) {
    if (!settings) return;
    const isMuted = settings.soundMuted === true;
    this.setMuted(isMuted);

    if (settings.soundMasterVolume !== undefined) {
      this.setMasterVolume(settings.soundMasterVolume);
    }
    if (settings.soundSnowVolume !== undefined) {
      this.setTrackVolume('snow', settings.soundSnowVolume);
    }
    if (settings.soundSakuraVolume !== undefined) {
      this.setTrackVolume('sakura', settings.soundSakuraVolume);
    }
    if (settings.soundDrumVolume !== undefined) {
      this.setTrackVolume('drum', settings.soundDrumVolume);
    }

    if (isMuted) return;

    // Sakura atmosphere auto-play check
    const shouldPlaySakura = (settings.sakuraRain !== false) && (settings.soundSakuraSync !== false);
    if (shouldPlaySakura) {
      if (!this.tracks.sakura.isPlaying) {
        this.playSakura();
        this.tracks.sakura.autoStarted = true;
      }
    } else if (this.tracks.sakura.autoStarted && this.tracks.sakura.isPlaying) {
      this.stopSakura();
      this.tracks.sakura.autoStarted = false;
    }

    // Snow atmosphere auto-play check
    const shouldPlaySnow = (settings.snowFall === true) && (settings.soundSnowSync !== false);
    if (shouldPlaySnow) {
      if (!this.tracks.snow.isPlaying) {
        this.playSnow();
        this.tracks.snow.autoStarted = true;
      }
    } else if (this.tracks.snow.autoStarted && this.tracks.snow.isPlaying) {
      this.stopSnow();
      this.tracks.snow.autoStarted = false;
    }
  }

  // --- Mascot Interaction SFX ---
  playInteractionSfx() {
    if (this.isMuted || !this._initContext()) return;
    try {
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.12); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880.00, now); // A5
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // D6

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.20, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.25);
      osc2.stop(now + 0.25);
    } catch (e) {}
  }

  playBounceSfx(intensity = 1.0) {
    if (this.isMuted || !this._initContext()) return;
    try {
      const ctx = this.audioCtx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.09);

      const vol = Math.min(0.25, Math.max(0.03, 0.12 * intensity));
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.11);
    } catch (e) {}
  }

  // --- Master Controls ---
  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, parseFloat(val) || 0));
    if (this.masterGain && this.audioCtx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.audioCtx.currentTime, 0.05);
    }
  }

  setMuted(muted) {
    this.isMuted = !!muted;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVolume, this.audioCtx.currentTime, 0.05);
    }
    this._notifyStateChange();
  }

  setTrackVolume(trackKey, val) {
    if (!this.tracks[trackKey]) return;
    const clamped = Math.max(0, Math.min(1, parseFloat(val) || 0));
    this.tracks[trackKey].volume = clamped;
    if (this.tracks[trackKey].gainNode && this.audioCtx) {
      this.tracks[trackKey].gainNode.gain.setTargetAtTime(clamped, this.audioCtx.currentTime, 0.05);
    }
  }

  isPlaying(trackKey) {
    return this.tracks[trackKey] ? this.tracks[trackKey].isPlaying : false;
  }

  onStateChange(cb) {
    if (typeof cb === 'function') {
      this.onStateChangeCallbacks.add(cb);
    }
  }

  _notifyStateChange() {
    this.onStateChangeCallbacks.forEach(cb => {
      try { cb(this.getSnapshot()); } catch (e) { console.error('Sound state change callback error:', e); }
    });
  }

  getSnapshot() {
    return {
      isMuted: this.isMuted,
      masterVolume: this.masterVolume,
      snowPlaying: this.tracks.snow.isPlaying,
      snowVolume: this.tracks.snow.volume,
      sakuraPlaying: this.tracks.sakura.isPlaying,
      sakuraVolume: this.tracks.sakura.volume,
      drumPlaying: this.tracks.drum.isPlaying,
      drumVolume: this.tracks.drum.volume
    };
  }

  // --- Track 1: Snow Atmosphere (❄️) ---
  playSnow(isManual = true) {
    if (!this._initContext()) return;
    if (this.tracks.snow.isPlaying) return;

    this.tracks.snow.isPlaying = true;
    if (isManual) this.tracks.snow.autoStarted = false;
    const ctx = this.audioCtx;
    const trackGain = this.tracks.snow.gainNode;

    // 1. Procedural Pink/Brown Wind Noise
    const bufferSize = ctx.sampleRate * 3;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Lowpass wind filter
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.setValueAtTime(320, ctx.currentTime);
    windFilter.Q.setValueAtTime(2.5, ctx.currentTime);

    // LFO wind gust modulation
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.18, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(160, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(windFilter.frequency);

    noiseSource.connect(windFilter);
    windFilter.connect(trackGain);

    noiseSource.start();
    lfo.start();

    // 2. Periodic soft crystalline ice pings (simulating sparkling snowflakes)
    const chimeFreqs = [1318.51, 1567.98, 1760.00, 2093.00, 2637.02, 3135.96]; // E6, G6, A6, C7, E7, G7
    const playChime = () => {
      if (!this.tracks.snow.isPlaying) return;
      try {
        const osc = ctx.createOscillator();
        const chimeGain = ctx.createGain();
        const freq = chimeFreqs[Math.floor(Math.random() * chimeFreqs.length)];

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        const now = ctx.currentTime;
        chimeGain.gain.setValueAtTime(0, now);
        chimeGain.gain.linearRampToValueAtTime(0.06, now + 0.04);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

        osc.connect(chimeGain);
        chimeGain.connect(trackGain);

        osc.start(now);
        osc.stop(now + 1.65);
      } catch (e) {}

      if (this.tracks.snow.isPlaying) {
        const nextDelay = 800 + Math.random() * 1600;
        this.tracks.snow.chimeTimerId = setTimeout(playChime, nextDelay);
      }
    };

    this.tracks.snow.chimeTimerId = setTimeout(playChime, 600);
    this.tracks.snow.nodes = [noiseSource, lfo, windFilter, lfoGain];
    this._notifyStateChange();
  }

  stopSnow() {
    if (!this.tracks.snow.isPlaying) return;
    this.tracks.snow.isPlaying = false;
    if (this.tracks.snow.chimeTimerId) {
      clearTimeout(this.tracks.snow.chimeTimerId);
      this.tracks.snow.chimeTimerId = null;
    }
    this.tracks.snow.nodes.forEach(n => {
      try { if (n.stop) n.stop(); } catch (e) {}
      try { if (n.disconnect) n.disconnect(); } catch (e) {}
    });
    this.tracks.snow.nodes = [];
    this._notifyStateChange();
  }

  toggleSnow() {
    if (this.tracks.snow.isPlaying) this.stopSnow();
    else this.playSnow();
  }

  // --- Track 2: Sakura Spring Melody (🌸) ---
  playSakura(isManual = true) {
    if (!this._initContext()) return;
    if (this.tracks.sakura.isPlaying) return;

    this.tracks.sakura.isPlaying = true;
    if (isManual) this.tracks.sakura.autoStarted = false;
    const ctx = this.audioCtx;
    const trackGain = this.tracks.sakura.gainNode;

    // Japanese Hirajoshi/Insen Pentatonic Scale (A4, B4, C5, E5, F5, A5, B5, C6)
    const scale = [440.00, 493.88, 523.25, 659.25, 698.46, 880.00, 987.77, 1046.50];
    const melodyPattern = [
      0, 2, 3, 4, 3, 2, 0, 1,
      0, 2, 3, 5, 4, 3, 2, 0,
      3, 4, 5, 7, 5, 4, 3, 2,
      0, 1, 0, 2, 0, 3, 2, 0
    ];

    let noteIdx = 0;
    const stepInterval = 280; // ms per note

    const playKotoNote = (freq) => {
      const now = ctx.currentTime;
      // Dual oscillator for rich plucked acoustic string harmonic
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const noteGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2.002, now); // Slight harmonic overtone

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2800, now);
      filter.frequency.exponentialRampToValueAtTime(450, now + 0.9);

      // Plucked envelope: fast attack (5ms), exponential decay (1.2s)
      noteGain.gain.setValueAtTime(0, now);
      noteGain.gain.linearRampToValueAtTime(0.18, now + 0.008);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(trackGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.25);
      osc2.stop(now + 1.25);
    };

    const stepSakura = () => {
      if (!this.tracks.sakura.isPlaying) return;
      const noteOffset = melodyPattern[noteIdx % melodyPattern.length];
      const freq = scale[noteOffset % scale.length];
      playKotoNote(freq);
      noteIdx++;
      if (this.tracks.sakura.isPlaying) {
        this.tracks.sakura.timerId = setTimeout(stepSakura, stepInterval);
      }
    };

    stepSakura();
    this._notifyStateChange();
  }

  stopSakura() {
    if (!this.tracks.sakura.isPlaying) return;
    this.tracks.sakura.isPlaying = false;
    if (this.tracks.sakura.timerId) {
      clearTimeout(this.tracks.sakura.timerId);
      this.tracks.sakura.timerId = null;
    }
    this._notifyStateChange();
  }

  toggleSakura() {
    if (this.tracks.sakura.isPlaying) this.stopSakura();
    else this.playSakura();
  }

  // --- Track 3: Simple Drum Melody (🥁) ---
  playDrum() {
    if (!this._initContext()) return;
    if (this.tracks.drum.isPlaying) return;

    this.tracks.drum.isPlaying = true;
    const ctx = this.audioCtx;
    const trackGain = this.tracks.drum.gainNode;

    // 16-Step Rhythmic Pattern
    const kickSteps = [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0];
    const snareSteps = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0];
    const hatSteps =   [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1];
    const melodySteps = [
      523.25, 0, 659.25, 0, 783.99, 659.25, 0, 523.25,
      587.33, 0, 659.25, 783.99, 880.00, 0, 783.99, 659.25
    ];

    let step = 0;
    const bpm = 120;
    const stepDuration = (60 / bpm) / 4; // 125ms per 16th note

    const playKick = (time) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(32, time + 0.12);

      gain.gain.setValueAtTime(0.35, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

      osc.connect(gain);
      gain.connect(trackGain);
      osc.start(time);
      osc.stop(time + 0.19);
    };

    const playSnare = (time) => {
      // Noise burst for snap
      const bufferSize = ctx.sampleRate * 0.12;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(900, time);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(trackGain);
      noise.start(time);

      // Body tone
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(190, time);
      osc.frequency.exponentialRampToValueAtTime(60, time + 0.08);
      oscGain.gain.setValueAtTime(0.2, time);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

      osc.connect(oscGain);
      oscGain.connect(trackGain);
      osc.start(time);
      osc.stop(time + 0.09);
    };

    const playHat = (time, isAccent = false) => {
      const bufferSize = ctx.sampleRate * 0.05;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(6500, time);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(isAccent ? 0.15 : 0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + (isAccent ? 0.08 : 0.04));

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(trackGain);
      noise.start(time);
    };

    const playMelodyNote = (freq, time) => {
      if (!freq) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, time);
      filter.frequency.exponentialRampToValueAtTime(700, time + stepDuration * 0.9);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.12, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, time + stepDuration * 0.9);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(trackGain);

      osc.start(time);
      osc.stop(time + stepDuration);
    };

    const stepDrum = () => {
      if (!this.tracks.drum.isPlaying) return;
      const now = ctx.currentTime;
      const stepIdx = step % 16;

      if (kickSteps[stepIdx]) playKick(now);
      if (snareSteps[stepIdx]) playSnare(now);
      if (hatSteps[stepIdx]) playHat(now, stepIdx === 15);
      if (melodySteps[stepIdx]) playMelodyNote(melodySteps[stepIdx], now);

      step++;
      if (this.tracks.drum.isPlaying) {
        this.tracks.drum.timerId = setTimeout(stepDrum, stepDuration * 1000);
      }
    };

    stepDrum();
    this._notifyStateChange();
  }

  stopDrum() {
    if (!this.tracks.drum.isPlaying) return;
    this.tracks.drum.isPlaying = false;
    if (this.tracks.drum.timerId) {
      clearTimeout(this.tracks.drum.timerId);
      this.tracks.drum.timerId = null;
    }
    this._notifyStateChange();
  }

  toggleDrum() {
    if (this.tracks.drum.isPlaying) this.stopDrum();
    else this.playDrum();
  }

  stopAll() {
    this.stopSnow();
    this.stopSakura();
    this.stopDrum();
  }
}

// Global Singleton Instance
export const soundManager = new SoundManager();
