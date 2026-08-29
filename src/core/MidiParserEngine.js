/**
 * Standard MIDI File (SMF 0 & 1) Binary Parser & Real-Time Playback Sequencer
 * Parses binary .mid / .midi ArrayBuffers into structured, timestamped note events,
 * and provides high-precision scheduling, timeline seeking, and tempo scaling.
 */

export class MidiParserEngine {
  constructor() {
    this.format = 0;
    this.trackCount = 0;
    this.ticksPerQuarter = 480;
    this.tempoBPM = 120;
    this.totalDurationSec = 0;
    this.notes = []; // [{ midiNote, noteName, startTime, duration, endTime, velocity, channel, track }]
    this.tracks = [];
    this.tempoEvents = []; // [{ tick, timeSec, microsecondsPerQuarter, bpm }]

    // Playback state
    this.isPlaying = false;
    this.currentTimeSec = 0;
    this.tempoMultiplier = 1.0;
    this.isLooping = false;
    this.lastFrameTimestamp = 0;
    this.animationFrameId = null;

    this.onNoteTrigger = null; // (activeNoteEvents, currentPositionSec) => void
    this.onPlaybackEnd = null;
    this.onTimeUpdate = null; // (currentTimeSec, totalDurationSec) => void
  }

  /**
   * Parses binary MIDI ArrayBuffer
   * @param {ArrayBuffer|Uint8Array} buffer
   */
  parse(buffer) {
    const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let offset = 0;

    // 1. Validate Header Chunk "MThd" (0x4D 0x54 0x68 0x64)
    if (data.length < 14) throw new Error('Invalid MIDI file: Too small');
    const headerChunk = this._readString(data, offset, 4);
    offset += 4;
    if (headerChunk !== 'MThd') throw new Error(`Invalid MIDI header: Expected MThd, got ${headerChunk}`);

    const headerLength = this._readUint32(data, offset);
    offset += 4;
    this.format = this._readUint16(data, offset);
    offset += 2;
    this.trackCount = this._readUint16(data, offset);
    offset += 2;
    this.ticksPerQuarter = this._readUint16(data, offset);
    offset += 2;

    if (!this.ticksPerQuarter || (this.ticksPerQuarter & 0x8000)) {
      this.ticksPerQuarter = 480;
    }

    // Skip any extra header bytes if length > 6
    if (headerLength > 6) {
      offset += (headerLength - 6);
    }

    this.tracks = [];
    this.notes = [];
    this.tempoEvents = [{ tick: 0, timeSec: 0, microsecondsPerQuarter: 500000, bpm: 120 }];

    // 2. Parse Track Chunks "MTrk" (0x4D 0x54 0x72 0x6B)
    for (let t = 0; t < this.trackCount && offset < data.length; t++) {
      if (offset + 8 > data.length) break;
      const trackChunk = this._readString(data, offset, 4);
      offset += 4;
      const trackLength = this._readUint32(data, offset);
      offset += 4;

      if (trackChunk !== 'MTrk') {
        offset += trackLength; // Skip non-track chunks
        continue;
      }

      const trackDataEnd = Math.min(data.length, offset + trackLength);
      const trackEvents = [];
      let currentTick = 0;
      let runningStatus = 0;

      while (offset < trackDataEnd) {
        const { value: deltaTick, bytesRead: deltaBytes } = this._readVarLength(data, offset);
        offset += deltaBytes;
        currentTick += deltaTick;

        if (offset >= trackDataEnd) break;

        let statusByte = data[offset];
        if (statusByte >= 0x80) {
          offset++;
          if (statusByte < 0xF0) {
            runningStatus = statusByte; // Running status is ONLY set for channel voice messages (0x80..0xEF)
          } else if (statusByte < 0xF8) {
            runningStatus = 0; // System common messages clear running status
          }
        } else if (runningStatus >= 0x80 && runningStatus < 0xF0) {
          statusByte = runningStatus; // Use running status
        } else {
          // Unrecognized / corrupt byte, skip
          offset++;
          continue;
        }

        const eventType = statusByte & 0xF0;
        const channel = statusByte & 0x0F;

        if (statusByte === 0xFF) {
          // Meta Event: 0xFF <metaType> <length-VLQ> <data>
          if (offset >= trackDataEnd) break;
          const metaType = data[offset++];
          const { value: metaLength, bytesRead: metaLenBytes } = this._readVarLength(data, offset);
          offset += metaLenBytes;

          if (metaType === 0x51 && metaLength >= 3 && offset + 3 <= trackDataEnd) {
            // Set Tempo (microseconds per quarter)
            const mpqn = (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2];
            const bpm = mpqn > 0 ? Math.round(60000000 / mpqn) : 120;
            this.tempoEvents.push({ tick: currentTick, microsecondsPerQuarter: mpqn, bpm });
          }
          offset += metaLength;
        } else if (statusByte === 0xF0 || statusByte === 0xF7) {
          // SysEx Event: 0xF0/0xF7 <length-VLQ> <data>
          const { value: sysexLength, bytesRead: sysexLenBytes } = this._readVarLength(data, offset);
          offset += sysexLenBytes + sysexLength;
        } else if (eventType === 0x90 || eventType === 0x80) {
          // Note On (0x90) / Note Off (0x80)
          if (offset + 1 >= trackDataEnd) break;
          const noteNumber = data[offset++];
          const velocity = data[offset++];
          const isNoteOn = eventType === 0x90 && velocity > 0;

          trackEvents.push({
            tick: currentTick,
            type: isNoteOn ? 'noteOn' : 'noteOff',
            note: noteNumber,
            velocity: isNoteOn ? velocity : 0,
            channel,
            track: t
          });
        } else if (eventType === 0xA0 || eventType === 0xB0 || eventType === 0xE0) {
          // Polyphonic Pressure (0xA0), Control Change (0xB0), Pitch Bend (0xE0) (2 data bytes)
          offset += 2;
        } else if (eventType === 0xC0 || eventType === 0xD0) {
          // Program Change (0xC0), Channel Pressure (0xD0) (1 data byte)
          offset += 1;
        } else {
          // Unknown MIDI event, advance 1 byte
          offset++;
        }
      }

      this.tracks.push(trackEvents);
    }

    // 3. Sort tempo events by tick and calculate time in seconds
    this.tempoEvents.sort((a, b) => a.tick - b.tick);
    let cumulativeTime = 0;
    for (let i = 0; i < this.tempoEvents.length; i++) {
      const prev = i > 0 ? this.tempoEvents[i - 1] : { tick: 0, microsecondsPerQuarter: 500000 };
      const tickDelta = this.tempoEvents[i].tick - prev.tick;
      const secondsPerTick = (prev.microsecondsPerQuarter / 1000000) / this.ticksPerQuarter;
      cumulativeTime += tickDelta * secondsPerTick;
      this.tempoEvents[i].timeSec = cumulativeTime;
    }

    if (this.tempoEvents.length > 0) {
      this.tempoBPM = this.tempoEvents[0].bpm;
    }

    // 4. Pair NoteOn and NoteOff events into complete duration notes
    const activeNotes = new Map(); // key: channel_note -> { tick, velocity, track }

    this.tracks.forEach((trackEvents) => {
      trackEvents.forEach(evt => {
        const key = `${evt.channel}_${evt.note}`;
        if (evt.type === 'noteOn') {
          activeNotes.set(key, {
            tick: evt.tick,
            note: evt.note,
            velocity: evt.velocity,
            track: evt.track,
            channel: evt.channel
          });
        } else if (evt.type === 'noteOff' && activeNotes.has(key)) {
          const startEvt = activeNotes.get(key);
          activeNotes.delete(key);

          const startTime = this._tickToSeconds(startEvt.tick);
          const endTime = this._tickToSeconds(evt.tick);
          const duration = Math.max(0.06, endTime - startTime);

          this.notes.push({
            midiNote: startEvt.note,
            noteName: this._midiToNoteName(startEvt.note),
            startTime,
            endTime: startTime + duration,
            duration,
            velocity: startEvt.velocity,
            channel: startEvt.channel,
            track: startEvt.track
          });
        }
      });
    });

    // Close any dangling notes
    activeNotes.forEach((startEvt) => {
      const startTime = this._tickToSeconds(startEvt.tick);
      const duration = 0.5;
      this.notes.push({
        midiNote: startEvt.note,
        noteName: this._midiToNoteName(startEvt.note),
        startTime,
        endTime: startTime + duration,
        duration,
        velocity: startEvt.velocity,
        channel: startEvt.channel,
        track: startEvt.track
      });
    });

    // Sort notes chronologically
    this.notes.sort((a, b) => a.startTime - b.startTime || a.midiNote - b.midiNote);

    // Calculate total duration
    this.totalDurationSec = this.notes.length > 0 ? Math.max(...this.notes.map(n => n.endTime)) + 1.0 : 0;
    return this.notes;
  }

  _tickToSeconds(tick) {
    if (this.tempoEvents.length === 0) {
      return (tick / this.ticksPerQuarter) * 0.5;
    }

    let tempoIdx = 0;
    for (let i = 0; i < this.tempoEvents.length; i++) {
      if (tick >= this.tempoEvents[i].tick) {
        tempoIdx = i;
      } else {
        break;
      }
    }

    const tempo = this.tempoEvents[tempoIdx];
    const tickOffset = tick - tempo.tick;
    const secondsPerTick = (tempo.microsecondsPerQuarter / 1000000) / this.ticksPerQuarter;
    return tempo.timeSec + tickOffset * secondsPerTick;
  }

  _readString(data, offset, length) {
    let str = '';
    for (let i = 0; i < length; i++) str += String.fromCharCode(data[offset + i]);
    return str;
  }

  _readUint32(data, offset) {
    return (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
  }

  _readUint16(data, offset) {
    return (data[offset] << 8) | data[offset + 1];
  }

  _readVarLength(data, offset) {
    let value = 0;
    let bytesRead = 0;
    while (bytesRead < 4 && offset + bytesRead < data.length) {
      const byte = data[offset + bytesRead];
      bytesRead++;
      value = (value << 7) | (byte & 0x7F);
      if (!(byte & 0x80)) break;
    }
    return { value, bytesRead };
  }

  _midiToNoteName(midiNote) {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    return `${names[midiNote % 12]}${octave}`;
  }

  // --- Real-time Playback Controls ---
  play(pianoAudioEngine) {
    if (this.isPlaying) return;
    if (this.notes.length === 0) return;

    this.isPlaying = true;
    this.lastFrameTimestamp = performance.now();

    const loop = (timestamp) => {
      if (!this.isPlaying) return;

      const deltaMs = timestamp - this.lastFrameTimestamp;
      this.lastFrameTimestamp = timestamp;

      const prevTime = this.currentTimeSec;
      this.currentTimeSec += (deltaMs / 1000) * this.tempoMultiplier;

      // Find notes triggered within this frame window [prevTime, currentTimeSec]
      const notesToTrigger = this.notes.filter(n => n.startTime >= prevTime && n.startTime < this.currentTimeSec);

      if (notesToTrigger.length > 0 && pianoAudioEngine) {
        notesToTrigger.forEach(n => {
          pianoAudioEngine.playNote(n.midiNote, n.velocity / 127, n.duration / this.tempoMultiplier);
        });
      }

      // Currently active ringing notes
      const activeNotes = this.notes.filter(n => this.currentTimeSec >= n.startTime && this.currentTimeSec <= n.endTime);

      if (this.onNoteTrigger) {
        this.onNoteTrigger(activeNotes, this.currentTimeSec, notesToTrigger);
      }

      if (this.onTimeUpdate) {
        this.onTimeUpdate(this.currentTimeSec, this.totalDurationSec);
      }

      // Check for playback finish
      if (this.currentTimeSec >= this.totalDurationSec) {
        if (this.isLooping) {
          this.currentTimeSec = 0;
          this.lastFrameTimestamp = performance.now();
          this.animationFrameId = requestAnimationFrame(loop);
        } else {
          this.stop();
          if (this.onPlaybackEnd) this.onPlaybackEnd();
        }
      } else {
        this.animationFrameId = requestAnimationFrame(loop);
      }
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  pause() {
    this.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  stop() {
    this.isPlaying = false;
    this.currentTimeSec = 0;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.onNoteTrigger) {
      this.onNoteTrigger([], 0, []);
    }
    if (this.onTimeUpdate) {
      this.onTimeUpdate(0, this.totalDurationSec);
    }
  }

  seek(timeInSec) {
    this.currentTimeSec = Math.max(0, Math.min(this.totalDurationSec, parseFloat(timeInSec) || 0));
    const activeNotes = this.notes.filter(n => this.currentTimeSec >= n.startTime && this.currentTimeSec <= n.endTime);
    if (this.onNoteTrigger) {
      this.onNoteTrigger(activeNotes, this.currentTimeSec, []);
    }
    if (this.onTimeUpdate) {
      this.onTimeUpdate(this.currentTimeSec, this.totalDurationSec);
    }
  }

  setTempoMultiplier(multiplier) {
    this.tempoMultiplier = Math.max(0.25, Math.min(3.0, parseFloat(multiplier) || 1.0));
  }

  /**
   * Generates built-in classical MIDI pieces programmatically
   */
  static getPresetMidi(presetName) {
    const presets = {
      fur_elise: [
        // Beethoven: Für Elise (Main Motif)
        { note: 76, dur: 0.25 }, { note: 75, dur: 0.25 }, { note: 76, dur: 0.25 }, { note: 75, dur: 0.25 }, { note: 76, dur: 0.25 },
        { note: 71, dur: 0.25 }, { note: 74, dur: 0.25 }, { note: 72, dur: 0.25 }, { note: 69, dur: 0.60 },
        // Bass arpeggio + Right Hand
        { note: 45, dur: 0.3 }, { note: 52, dur: 0.3 }, { note: 57, dur: 0.3 }, { note: 60, dur: 0.3 }, { note: 64, dur: 0.3 }, { note: 69, dur: 0.3 }, { note: 71, dur: 0.60 },
        { note: 40, dur: 0.3 }, { note: 52, dur: 0.3 }, { note: 56, dur: 0.3 }, { note: 64, dur: 0.3 }, { note: 68, dur: 0.3 }, { note: 71, dur: 0.3 }, { note: 72, dur: 0.60 },
        { note: 45, dur: 0.3 }, { note: 52, dur: 0.3 }, { note: 57, dur: 0.3 }, { note: 64, dur: 0.3 }, { note: 76, dur: 0.25 }, { note: 75, dur: 0.25 }, { note: 76, dur: 0.25 }, { note: 75, dur: 0.25 }, { note: 76, dur: 0.25 },
        { note: 71, dur: 0.25 }, { note: 74, dur: 0.25 }, { note: 72, dur: 0.25 }, { note: 69, dur: 0.80 }
      ],
      bach_minuet: [
        // Bach: Minuet in G Major
        { note: 67, dur: 0.5 }, { note: 60, dur: 0.25 }, { note: 62, dur: 0.25 }, { note: 64, dur: 0.25 }, { note: 65, dur: 0.25 },
        { note: 67, dur: 0.5 }, { note: 60, dur: 0.5 }, { note: 60, dur: 0.5 },
        { note: 69, dur: 0.5 }, { note: 65, dur: 0.25 }, { note: 67, dur: 0.25 }, { note: 69, dur: 0.25 }, { note: 71, dur: 0.25 },
        { note: 72, dur: 0.5 }, { note: 60, dur: 0.5 }, { note: 60, dur: 0.5 },
        { note: 65, dur: 0.5 }, { note: 67, dur: 0.25 }, { note: 65, dur: 0.25 }, { note: 64, dur: 0.25 }, { note: 62, dur: 0.25 },
        { note: 64, dur: 0.5 }, { note: 65, dur: 0.25 }, { note: 64, dur: 0.25 }, { note: 62, dur: 0.25 }, { note: 60, dur: 0.25 },
        { note: 59, dur: 0.5 }, { note: 60, dur: 0.25 }, { note: 62, dur: 0.25 }, { note: 64, dur: 0.25 }, { note: 59, dur: 0.25 },
        { note: 60, dur: 1.0 }
      ]
    };

    const pattern = presets[presetName] || presets.fur_elise;
    let curTime = 0.2;
    const notes = pattern.map((p, idx) => {
      const n = {
        midiNote: p.note,
        noteName: MidiParserEngine.prototype._midiToNoteName(p.note),
        startTime: curTime,
        endTime: curTime + p.dur,
        duration: p.dur,
        velocity: 90 + (idx % 3) * 10,
        channel: 0,
        track: 0
      };
      curTime += p.dur;
      return n;
    });

    const engine = new MidiParserEngine();
    engine.notes = notes;
    engine.totalDurationSec = curTime + 0.8;
    return engine;
  }
}
