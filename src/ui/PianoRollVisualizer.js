/**
 * MIDI Piano Roll & Falling Note Waterfall Visualizer (Canvas 2D)
 * Renders notes cascading downward onto the virtual piano keys in real-time.
 */

export class PianoRollVisualizer {
  constructor(canvasElement, { minNote = 48, maxNote = 84 } = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.notes = [];
    this.minNote = minNote;
    this.maxNote = maxNote;
    this.currentPlayTimeSec = 0;
    this.lookAheadSec = 2.5; // Seconds of upcoming notes visible on screen
  }

  setNotes(notes, explicitMin = null, explicitMax = null) {
    this.notes = notes || [];
    if (explicitMin !== null && explicitMax !== null) {
      this.minNote = explicitMin;
      this.maxNote = explicitMax;
    } else if (this.notes.length > 0) {
      const minMidi = Math.min(...this.notes.map(n => n.midiNote));
      const maxMidi = Math.max(...this.notes.map(n => n.midiNote));
      // Pad to nearest full octave with safety clamps
      this.minNote = Math.max(21, Math.min(48, Math.floor((minMidi - 1) / 12) * 12));
      this.maxNote = Math.min(108, Math.max(84, Math.ceil((maxMidi + 2) / 12) * 12));
    } else {
      this.minNote = 48;
      this.maxNote = 84;
    }
    this.render();
  }

  updatePlaybackPosition(timeSec) {
    this.currentPlayTimeSec = timeSec;
    this.render();
  }

  _isBlackKey(midiNote) {
    const n = midiNote % 12;
    return n === 1 || n === 3 || n === 6 || n === 8 || n === 10;
  }

  _getNoteX(midiNote, width) {
    const totalKeys = (this.maxNote - this.minNote) + 1;
    const keyWidth = width / totalKeys;
    const index = midiNote - this.minNote;
    return index * keyWidth;
  }

  render() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Subtle background grid lanes for each key
    const totalKeys = (this.maxNote - this.minNote) + 1;
    const keyWidth = width / totalKeys;

    for (let note = this.minNote; note <= this.maxNote; note++) {
      const x = this._getNoteX(note, width);
      const isBlack = this._isBlackKey(note);
      ctx.fillStyle = isBlack ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(x, 0, keyWidth, height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Strike baseline at the bottom
    const baselineY = height - 4;
    ctx.strokeStyle = 'rgba(243, 156, 18, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, baselineY);
    ctx.lineTo(width, baselineY);
    ctx.stroke();

    if (!this.notes || this.notes.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MIDI Piano Roll (Import .mid or select a preset)', width / 2, height / 2);
      return;
    }

    // Render falling note bars
    const visibleStart = this.currentPlayTimeSec - 0.5;
    const visibleEnd = this.currentPlayTimeSec + this.lookAheadSec;

    const visibleNotes = this.notes.filter(n => n.endTime >= visibleStart && n.startTime <= visibleEnd);

    visibleNotes.forEach(n => {
      const x = this._getNoteX(n.midiNote, width);
      const noteW = Math.max(3, keyWidth - 2);

      // Y calculations: When n.startTime == currentPlayTimeSec, it hits baselineY
      const timeUntilHit = n.startTime - this.currentPlayTimeSec;
      const durationHeight = (n.duration / this.lookAheadSec) * height;
      const bottomY = baselineY - (timeUntilHit / this.lookAheadSec) * height;
      const topY = bottomY - durationHeight;

      const isHitting = this.currentPlayTimeSec >= n.startTime && this.currentPlayTimeSec <= n.endTime;
      const isBlack = this._isBlackKey(n.midiNote);

      ctx.save();
      if (isHitting) {
        ctx.fillStyle = isBlack ? '#f59e0b' : '#38bdf8';
        ctx.shadowColor = isBlack ? 'rgba(245, 158, 11, 0.8)' : 'rgba(56, 189, 248, 0.8)';
        ctx.shadowBlur = 12;
      } else {
        ctx.fillStyle = isBlack ? 'rgba(245, 158, 11, 0.65)' : 'rgba(56, 189, 248, 0.65)';
      }

      ctx.beginPath();
      // Draw rounded rectangle for note block
      const r = 3;
      const blockY = Math.max(0, topY);
      const blockH = Math.min(height, bottomY - topY);
      if (blockH > 1) {
        ctx.roundRect(x + 1, blockY, noteW, blockH, r);
        ctx.fill();

        ctx.strokeStyle = isHitting ? '#ffffff' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    });
  }
}
