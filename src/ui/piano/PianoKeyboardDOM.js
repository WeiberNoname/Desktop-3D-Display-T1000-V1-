/**
 * PianoKeyboardDOM
 * Manages virtual piano keyboard rendering, responsive key geometry,
 * and key visual press/release active states.
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export class PianoKeyboardDOM {
  constructor(containerElement, onNoteTrigger = null) {
    this.container = containerElement;
    this.onNoteTrigger = onNoteTrigger;
    this.activeKeyElements = new Map();
  }

  /**
   * Generates the virtual piano keyboard HTML elements for the specified MIDI note range.
   * @param {number} minNote - Starting MIDI note (e.g. 21 for A0)
   * @param {number} maxNote - Ending MIDI note (e.g. 108 for C8)
   */
  render(minNote = 21, maxNote = 108) {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.activeKeyElements.clear();

    const whiteKeys = [];
    const blackKeys = [];

    // Count white keys in range
    for (let note = minNote; note <= maxNote; note++) {
      const noteInOctave = note % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(noteInOctave);
      if (!isBlack) {
        whiteKeys.push(note);
      } else {
        blackKeys.push(note);
      }
    }

    const totalWhite = whiteKeys.length || 1;
    const whiteWidthPercent = 100 / totalWhite;

    // Render White Keys
    whiteKeys.forEach((note, whiteIndex) => {
      const keyEl = document.createElement('div');
      const octave = Math.floor(note / 12) - 1;
      const noteName = NOTE_NAMES[note % 12];
      const isC = noteName === 'C';

      keyEl.className = `piano-key piano-key-white ${isC ? 'piano-key-c' : ''}`;
      keyEl.dataset.note = note;
      keyEl.style.width = `${whiteWidthPercent}%`;
      keyEl.style.left = `${whiteIndex * whiteWidthPercent}%`;

      const label = document.createElement('span');
      label.className = 'piano-key-label';
      label.textContent = isC ? `C${octave}` : '';
      keyEl.appendChild(label);

      this.bindKeyEvents(keyEl, note);
      this.container.appendChild(keyEl);
      this.activeKeyElements.set(note, keyEl);
    });

    // Render Black Keys
    let currentWhiteIndex = 0;
    for (let note = minNote; note <= maxNote; note++) {
      const noteInOctave = note % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(noteInOctave);

      if (!isBlack) {
        currentWhiteIndex++;
      } else {
        const keyEl = document.createElement('div');
        keyEl.className = 'piano-key piano-key-black';
        keyEl.dataset.note = note;
        keyEl.style.width = `${whiteWidthPercent * 0.65}%`;
        keyEl.style.left = `${(currentWhiteIndex - 0.325) * whiteWidthPercent}%`;

        this.bindKeyEvents(keyEl, note);
        this.container.appendChild(keyEl);
        this.activeKeyElements.set(note, keyEl);
      }
    }
  }

  bindKeyEvents(keyEl, note) {
    const trigger = (e) => {
      e.preventDefault();
      this.setKeyPressed(note, true);
      if (typeof this.onNoteTrigger === 'function') {
        this.onNoteTrigger(note, 0.85);
      }
    };
    const release = (e) => {
      e.preventDefault();
      this.setKeyPressed(note, false);
    };

    keyEl.addEventListener('mousedown', trigger);
    keyEl.addEventListener('mouseup', release);
    keyEl.addEventListener('mouseleave', release);
    keyEl.addEventListener('touchstart', trigger, { passive: false });
    keyEl.addEventListener('touchend', release, { passive: false });
  }

  /**
   * Sets visual pressed highlight state on a key.
   * @param {number} note - MIDI note number
   * @param {boolean} pressed - True if pressed
   */
  setKeyPressed(note, pressed) {
    const keyEl = this.activeKeyElements.get(note);
    if (keyEl) {
      if (pressed) {
        keyEl.classList.add('active');
      } else {
        keyEl.classList.remove('active');
      }
    }
  }

  clearAllKeys() {
    this.activeKeyElements.forEach(keyEl => {
      keyEl.classList.remove('active');
    });
  }
}
