/**
 * PianoRangeManager
 * Manages piano keyboard range modes ('88', '61', '49', '37', 'autofit'),
 * octave jumps, and auto-scrolling to active notes.
 */

export class PianoRangeManager {
  constructor(keyboardContainer, onRangeChanged = null) {
    this.container = keyboardContainer;
    this.onRangeChanged = onRangeChanged;
    this.currentMinNote = 21; // A0
    this.currentMaxNote = 108; // C8
    this.rangeMode = 'autofit';
  }

  calculateRange(mode, activeNotes = []) {
    this.rangeMode = mode;
    if (mode === '88') {
      this.currentMinNote = 21;
      this.currentMaxNote = 108;
    } else if (mode === '61') {
      this.currentMinNote = 36; // C2
      this.currentMaxNote = 96; // C7
    } else if (mode === '49') {
      this.currentMinNote = 36; // C2
      this.currentMaxNote = 84; // C6
    } else if (mode === '37') {
      this.currentMinNote = 48; // C3
      this.currentMaxNote = 84; // C6
    } else if (mode === 'autofit') {
      if (activeNotes && activeNotes.length > 0) {
        const minMidi = Math.min(...activeNotes.map(n => n.midiNote));
        const maxMidi = Math.max(...activeNotes.map(n => n.midiNote));
        this.currentMinNote = Math.max(21, Math.floor((minMidi - 2) / 12) * 12);
        this.currentMaxNote = Math.min(108, Math.ceil((maxMidi + 3) / 12) * 12);
      } else {
        this.currentMinNote = 36;
        this.currentMaxNote = 96;
      }
    }

    if (typeof this.onRangeChanged === 'function') {
      this.onRangeChanged(this.currentMinNote, this.currentMaxNote, this.rangeMode);
    }
    return { minNote: this.currentMinNote, maxNote: this.currentMaxNote };
  }

  scrollToNote(midiNote) {
    if (!this.container) return;
    const el = this.container.querySelector(`.piano-key[data-note="${midiNote}"]`);
    if (el) {
      const elOffset = el.offsetLeft;
      const containerWidth = this.container.clientWidth;
      const targetScroll = Math.max(0, elOffset - containerWidth / 2 + el.clientWidth / 2);
      this.container.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  }

  scrollByOffset(deltaX) {
    if (this.container) {
      this.container.scrollBy({ left: deltaX, behavior: 'smooth' });
    }
  }
}
