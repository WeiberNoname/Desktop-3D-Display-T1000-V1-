/**
 * PianoPlaybackController
 * Manages MIDI and MusicXML playback engines, transport controls (Play/Pause/Stop/Seek),
 * tempo scaling, volume, sustain pedal, and UI timeline synchronization.
 */

import { eventBus } from '../../managers/EventBus.js';

export class PianoPlaybackController {
  constructor(deps = {}) {
    this.pianoAudio = deps.pianoAudio;
    this.midiEngine = deps.midiEngine;
    this.xmlEngine = deps.xmlEngine;
    this.t = deps.t;

    this.activeMode = 'midi'; // 'midi' | 'xml'
    this.onNoteTrigger = deps.onNoteTrigger || null;
    this.onTimeUpdate = deps.onTimeUpdate || null;
    this.onPlaybackEnd = deps.onPlaybackEnd || null;

    this.setupEngineHooks();
  }

  setupEngineHooks() {
    this.midiEngine.onNoteTrigger = (activeNotes, currentSec) => {
      if (typeof this.onNoteTrigger === 'function') {
        this.onNoteTrigger(activeNotes, currentSec);
      }
    };
    this.midiEngine.onTimeUpdate = (curSec, totalSec) => {
      if (typeof this.onTimeUpdate === 'function') {
        this.onTimeUpdate(curSec, totalSec);
      }
    };
    this.midiEngine.onPlaybackEnd = () => {
      if (typeof this.onPlaybackEnd === 'function') {
        this.onPlaybackEnd();
      }
      eventBus.emit('audio:playbackChanged', { isPlaying: false, mode: 'midi' });
    };

    this.xmlEngine.onNoteTrigger = (activeNotes, currentSec, activeMeasureIndex) => {
      if (typeof this.onNoteTrigger === 'function') {
        this.onNoteTrigger(activeNotes, currentSec, activeMeasureIndex);
      }
    };
    this.xmlEngine.onTimeUpdate = (curSec, totalSec) => {
      if (typeof this.onTimeUpdate === 'function') {
        this.onTimeUpdate(curSec, totalSec);
      }
    };
    this.xmlEngine.onPlaybackEnd = () => {
      if (typeof this.onPlaybackEnd === 'function') {
        this.onPlaybackEnd();
      }
      eventBus.emit('audio:playbackChanged', { isPlaying: false, mode: 'xml' });
    };
  }

  getActiveEngine() {
    return this.activeMode === 'midi' ? this.midiEngine : this.xmlEngine;
  }

  togglePlay(audioCtx, masterGain) {
    const engine = this.getActiveEngine();
    if (engine.isPlaying) {
      engine.pause();
      eventBus.emit('audio:playbackChanged', { isPlaying: false, mode: this.activeMode });
      return false;
    } else {
      if (audioCtx && typeof this.pianoAudio.setContext === 'function') {
        this.pianoAudio.setContext(audioCtx, masterGain);
      }
      engine.play(this.pianoAudio);
      eventBus.emit('audio:playbackChanged', { isPlaying: true, mode: this.activeMode });
      return true;
    }
  }

  stop() {
    const engine = this.getActiveEngine();
    engine.stop();
    eventBus.emit('audio:playbackChanged', { isPlaying: false, mode: this.activeMode });
  }

  seek(timeSec) {
    const engine = this.getActiveEngine();
    engine.seek(timeSec);
  }

  setTempo(mult) {
    this.midiEngine.setTempoMultiplier(mult);
    this.xmlEngine.setTempoMultiplier(mult);
  }

  setLoop(looping) {
    this.midiEngine.isLooping = looping;
    this.xmlEngine.isLooping = looping;
  }

  setSustain(sustain) {
    this.pianoAudio.setSustain(sustain);
  }

  setVolume(vol) {
    this.pianoAudio.setVolume(vol);
  }
}
