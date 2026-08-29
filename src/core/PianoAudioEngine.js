/**
 * Polyphonic Acoustic Grand Piano Audio Synthesizer (Web Audio API)
 * Simulates hammer strike transients, multi-harmonic string resonance,
 * dynamic filter damping, and velocity-sensitive decay envelopes.
 */

export class PianoAudioEngine {
  constructor(audioCtx, destinationNode) {
    this.audioCtx = audioCtx;
    this.destinationNode = destinationNode;
    this.volume = 0.85;
    this.sustainPedal = false;
    this.activeVoices = new Map(); // midiNote -> array of active voice objects
  }

  setContext(audioCtx, destinationNode) {
    this.audioCtx = audioCtx;
    this.destinationNode = destinationNode;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, parseFloat(vol) || 0));
  }

  setSustain(sustain) {
    this.sustainPedal = !!sustain;
    if (!this.sustainPedal) {
      // Release notes that were held solely by sustain pedal
      const now = this.audioCtx ? this.audioCtx.currentTime : 0;
      this.activeVoices.forEach((voices, note) => {
        voices.forEach(voice => {
          if (voice.pendingRelease) {
            this._terminateVoice(voice, now);
          }
        });
      });
    }
  }

  static midiToFreq(midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  static noteNameToMidi(noteName) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const regex = /^([A-G][#b]?)(-?\d+)$/i;
    const match = String(noteName).trim().match(regex);
    if (!match) return 60; // Default C4

    let step = match[1].toUpperCase();
    if (step === 'DB') step = 'C#';
    if (step === 'EB') step = 'D#';
    if (step === 'GB') step = 'F#';
    if (step === 'AB') step = 'G#';
    if (step === 'BB') step = 'A#';

    const octave = parseInt(match[2], 10);
    const noteIndex = notes.indexOf(step);
    if (noteIndex === -1) return 60;
    return (octave + 1) * 12 + noteIndex;
  }

  static midiToNoteName(midiNote) {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    const name = names[midiNote % 12];
    return `${name}${octave}`;
  }

  /**
   * Triggers a polyphonic acoustic piano note
   * @param {number} midiNote - MIDI note number (21 = A0, 108 = C8)
   * @param {number} velocity - 0.0 to 1.0 (or 0 to 127)
   * @param {number} duration - Note duration in seconds (optional)
   * @param {number} startTime - Web Audio scheduling time (optional)
   */
  playNote(midiNote, velocity = 0.8, duration = 0, startTime = null) {
    if (!this.audioCtx) return null;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const ctx = this.audioCtx;
    const now = startTime !== null && startTime >= ctx.currentTime ? startTime : ctx.currentTime;
    const vel = velocity > 1 ? Math.min(1, velocity / 127) : Math.max(0.05, Math.min(1, velocity));
    const freq = PianoAudioEngine.midiToFreq(midiNote);

    // Dynamic voice gain scaled by volume and velocity curve
    const voiceGain = ctx.createGain();
    const peakGain = Math.pow(vel, 1.4) * 0.40 * this.volume;

    // Filter modeling piano soundboard resonance (dampens higher frequencies faster)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const cutoffFreq = Math.min(16000, Math.max(400, freq * (3.5 + vel * 4.0)));
    filter.frequency.setValueAtTime(cutoffFreq, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 1.5), now + 1.8);
    filter.Q.setValueAtTime(1.2, now);

    // Fundamental string oscillator (Triangle + Sine blend for warm wooden resonance)
    const oscFundamental = ctx.createOscillator();
    oscFundamental.type = 'triangle';
    oscFundamental.frequency.setValueAtTime(freq, now);

    // Harmonic overtone oscillator (Sine with slight detune for rich chorus feel)
    const oscHarmonic = ctx.createOscillator();
    oscHarmonic.type = 'sine';
    oscHarmonic.frequency.setValueAtTime(freq * 2.001, now);
    const harmonicGain = ctx.createGain();
    harmonicGain.gain.setValueAtTime(0.25 * peakGain, now);

    // Hammer attack transient (brief noise click)
    const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.015), ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.003));
    }
    const hammerSource = ctx.createBufferSource();
    hammerSource.buffer = noiseBuffer;
    const hammerGain = ctx.createGain();
    hammerGain.gain.setValueAtTime(0.12 * vel * this.volume, now);

    // ADSR Envelope: Fast attack (3ms), decay towards sustain, natural ring out
    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.linearRampToValueAtTime(peakGain, now + 0.004);
    
    // Natural acoustic decay time based on pitch (lower notes ring longer)
    const decayDuration = Math.max(1.0, 4.5 - (midiNote / 127) * 2.5);
    voiceGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peakGain * 0.25), now + 0.4);
    voiceGain.gain.exponentialRampToValueAtTime(0.00001, now + decayDuration);

    // Node connections
    oscFundamental.connect(voiceGain);
    oscHarmonic.connect(harmonicGain);
    harmonicGain.connect(voiceGain);
    hammerSource.connect(hammerGain);
    hammerGain.connect(filter);

    voiceGain.connect(filter);
    filter.connect(this.destinationNode || ctx.destination);

    // Start nodes
    oscFundamental.start(now);
    oscHarmonic.start(now);
    hammerSource.start(now);

    const voice = {
      midiNote,
      startTime: now,
      nodes: [oscFundamental, oscHarmonic, hammerSource, voiceGain, filter, harmonicGain, hammerGain],
      voiceGain,
      pendingRelease: false
    };

    if (!this.activeVoices.has(midiNote)) {
      this.activeVoices.set(midiNote, []);
    }
    this.activeVoices.get(midiNote).push(voice);

    // If explicit duration given, schedule release
    if (duration > 0) {
      this.stopNote(midiNote, now + duration);
    }

    // Auto-cleanup after decay duration
    setTimeout(() => {
      this._removeVoice(midiNote, voice);
    }, (decayDuration + 0.5) * 1000);

    return voice;
  }

  /**
   * Releases a note with realistic damper felt decay
   */
  stopNote(midiNote, releaseTime = null) {
    const voices = this.activeVoices.get(midiNote);
    if (!voices || voices.length === 0) return;

    const ctx = this.audioCtx;
    const now = releaseTime !== null && ctx && releaseTime >= ctx.currentTime ? releaseTime : (ctx ? ctx.currentTime : 0);

    voices.forEach(voice => {
      if (this.sustainPedal) {
        voice.pendingRelease = true;
      } else {
        this._terminateVoice(voice, now);
      }
    });
  }

  _terminateVoice(voice, time) {
    try {
      if (voice.voiceGain && this.audioCtx) {
        voice.voiceGain.gain.cancelScheduledValues(time);
        voice.voiceGain.gain.setValueAtTime(voice.voiceGain.gain.value, time);
        voice.voiceGain.gain.exponentialRampToValueAtTime(0.00001, time + 0.08); // Dampen in 80ms
      }
      setTimeout(() => {
        this._removeVoice(voice.midiNote, voice);
      }, 100);
    } catch (e) {}
  }

  _removeVoice(midiNote, voice) {
    voice.nodes.forEach(n => {
      try { if (n.stop) n.stop(); } catch (e) {}
      try { if (n.disconnect) n.disconnect(); } catch (e) {}
    });
    const voices = this.activeVoices.get(midiNote);
    if (voices) {
      const idx = voices.indexOf(voice);
      if (idx !== -1) voices.splice(idx, 1);
      if (voices.length === 0) this.activeVoices.delete(midiNote);
    }
  }

  stopAll() {
    const now = this.audioCtx ? this.audioCtx.currentTime : 0;
    this.activeVoices.forEach(voices => {
      voices.forEach(v => this._terminateVoice(v, now));
    });
    this.activeVoices.clear();
  }
}
