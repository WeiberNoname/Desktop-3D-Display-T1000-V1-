/**
 * Dynamic Piano Grand Staff Score Renderer (Canvas 2D)
 * Renders classical Grand Staff (Treble Clef 𝄞 + Bass Clef 𝄢 connected with a piano brace),
 * automatic Middle-C split across staves, ledger lines, accidentals, and a glowing synchronized playback cursor.
 */

export class MusicScoreRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.scoreData = null;
    this.currentPlayTimeSec = 0;
    this.activeMeasureIndex = 0;
    this.activeNoteElements = [];
    this.scrollOffsetX = 0;

    this.lineSpacing = 7;
    this.trebleTopY = 24;
    this.bassTopY = 82;
    this.measureWidth = 145;
    this.noteLayouts = []; // [{ note, x, y, isRest, measureIndex, staffType }]

    this.onSeekRequest = null; // (timeSec) => void
    this._initCanvasEvents();
  }

  _initCanvasEvents() {
    if (!this.canvas) return;

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left + this.scrollOffsetX;

      // Find closest note or measure
      if (this.noteLayouts.length > 0) {
        let closest = this.noteLayouts[0];
        let minDiff = Math.abs(this.noteLayouts[0].x - clickX);
        for (let i = 1; i < this.noteLayouts.length; i++) {
          const diff = Math.abs(this.noteLayouts[i].x - clickX);
          if (diff < minDiff) {
            minDiff = diff;
            closest = this.noteLayouts[i];
          }
        }
        if (closest && this.onSeekRequest) {
          this.onSeekRequest(closest.note.startTime);
        }
      }
    });
  }

  setScore(scoreData) {
    this.scoreData = scoreData;
    this._calculateLayout();
    this.render();
  }

  updatePlaybackPosition(timeSec, activeMeasureIndex, activeNotes = []) {
    this.currentPlayTimeSec = timeSec;
    this.activeMeasureIndex = activeMeasureIndex;
    this.activeNoteElements = activeNotes;
    this.render();
  }

  _calculateLayout() {
    if (!this.scoreData || !this.scoreData.measures) return;

    this.noteLayouts = [];
    let currentX = 60; // Left margin for Clefs & Time signature

    this.scoreData.measures.forEach((m, mIdx) => {
      const measureStartX = currentX;
      const noteCount = m.notes.length;
      const spacing = noteCount > 0 ? Math.max(30, (this.measureWidth - 20) / noteCount) : this.measureWidth;

      m.notes.forEach((note, nIdx) => {
        const noteX = measureStartX + 15 + nIdx * spacing;
        let noteY = this.trebleTopY + this.lineSpacing * 2;
        let staffType = 'treble';

        if (!note.isRest) {
          if (note.midiNote >= 60) {
            // Treble Staff (C4 and above)
            staffType = 'treble';
            noteY = this._getTreblePitchY(note.step, note.octave);
          } else {
            // Bass Staff (B3 and below)
            staffType = 'bass';
            noteY = this._getBassPitchY(note.step, note.octave);
          }
        } else {
          // Rest position on treble staff
          noteY = this.trebleTopY + this.lineSpacing * 2;
        }

        const layoutItem = {
          note,
          x: noteX,
          y: noteY,
          measureIndex: mIdx,
          isRest: note.isRest,
          staffType
        };
        this.noteLayouts.push(layoutItem);
      });

      currentX += Math.max(this.measureWidth, noteCount * 32 + 25);
    });

    this.totalScoreWidth = currentX + 50;
  }

  _getTreblePitchY(step, octave) {
    // Treble Clef: Bottom line (Line 1) = E4 at y = trebleTopY + 4 * lineSpacing
    const stepOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const refStep = 'E';
    const refOctave = 4;
    const refIndex = refOctave * 7 + stepOrder.indexOf(refStep);
    const targetIndex = octave * 7 + stepOrder.indexOf(step);
    const diatonicDiff = targetIndex - refIndex;

    const bottomLineY = this.trebleTopY + 4 * this.lineSpacing;
    return bottomLineY - diatonicDiff * (this.lineSpacing / 2);
  }

  _getBassPitchY(step, octave) {
    // Bass Clef: Bottom line (Line 1) = G2 at y = bassTopY + 4 * lineSpacing
    const stepOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const refStep = 'G';
    const refOctave = 2;
    const refIndex = refOctave * 7 + stepOrder.indexOf(refStep);
    const targetIndex = octave * 7 + stepOrder.indexOf(step);
    const diatonicDiff = targetIndex - refIndex;

    const bottomLineY = this.bassTopY + 4 * this.lineSpacing;
    return bottomLineY - diatonicDiff * (this.lineSpacing / 2);
  }

  render() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Dynamic horizontal smooth auto-scrolling to follow cursor
    let cursorX = 60;
    if (this.scoreData && this.scoreData.totalDurationSec > 0 && this.noteLayouts.length > 0) {
      const activeLayout = this.noteLayouts.find(nl => this.currentPlayTimeSec >= nl.note.startTime && this.currentPlayTimeSec <= nl.note.endTime);
      if (activeLayout) {
        const duration = Math.max(0.01, activeLayout.note.endTime - activeLayout.note.startTime);
        const progress = Math.max(0, Math.min(1, (this.currentPlayTimeSec - activeLayout.note.startTime) / duration));
        cursorX = activeLayout.x + progress * 24;
      } else {
        const ratio = Math.min(1, this.currentPlayTimeSec / this.scoreData.totalDurationSec);
        cursorX = 60 + ratio * (this.totalScoreWidth - 80);
      }
    }

    // Smooth camera scroll follow
    const targetScroll = Math.max(0, cursorX - width * 0.35);
    this.scrollOffsetX += (targetScroll - this.scrollOffsetX) * 0.25;

    ctx.save();
    ctx.translate(-this.scrollOffsetX, 0);

    if (!this.scoreData) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No Sheet Music Loaded. Import .musicxml or select a preset.', width / 2 + this.scrollOffsetX, height / 2);
      ctx.restore();
      return;
    }

    const renderWidth = Math.max(width + this.scrollOffsetX + 100, this.totalScoreWidth || 600);

    // 1. Draw Grand Staff Connecting Brace (Left border joining Treble & Bass)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(15, this.trebleTopY);
    ctx.lineTo(15, this.bassTopY + 4 * this.lineSpacing);
    ctx.stroke();

    // 2. Draw 5 Staff Lines for Treble Staff (Right Hand)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.0;
    for (let i = 0; i < 5; i++) {
      const y = this.trebleTopY + i * this.lineSpacing;
      ctx.beginPath();
      ctx.moveTo(15, y);
      ctx.lineTo(renderWidth, y);
      ctx.stroke();
    }

    // 3. Draw 5 Staff Lines for Bass Staff (Left Hand)
    for (let i = 0; i < 5; i++) {
      const y = this.bassTopY + i * this.lineSpacing;
      ctx.beginPath();
      ctx.moveTo(15, y);
      ctx.lineTo(renderWidth, y);
      ctx.stroke();
    }

    // 4. Draw Clef Glyphs
    // Treble Clef 𝄞 on Top Staff
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 28px serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('𝄞', 20, this.trebleTopY + this.lineSpacing * 2.2);

    // Bass Clef 𝄢 on Bottom Staff
    ctx.font = 'bold 22px serif';
    ctx.fillText('𝄢', 20, this.bassTopY + this.lineSpacing * 1.8);

    // 5. Draw Time Signature (4/4 or 3/4) on Both Staves
    const timeSig = this.scoreData.timeSignature || { beats: 4, beatType: 4 };
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    // Treble time sig
    ctx.fillText(`${timeSig.beats}`, 46, this.trebleTopY + this.lineSpacing * 1.2);
    ctx.fillText(`${timeSig.beatType}`, 46, this.trebleTopY + this.lineSpacing * 3.2);
    // Bass time sig
    ctx.fillText(`${timeSig.beats}`, 46, this.bassTopY + this.lineSpacing * 1.2);
    ctx.fillText(`${timeSig.beatType}`, 46, this.bassTopY + this.lineSpacing * 3.2);

    // 6. Draw Measures & Barlines across both staves
    let currentMeasureX = 60;
    this.scoreData.measures.forEach((m, mIdx) => {
      const noteCount = m.notes.length;
      const mWidth = Math.max(this.measureWidth, noteCount * 32 + 25);
      const barlineX = currentMeasureX + mWidth;

      // Active measure highlight background
      if (mIdx === this.activeMeasureIndex) {
        ctx.fillStyle = 'rgba(243, 156, 18, 0.08)';
        ctx.fillRect(currentMeasureX, this.trebleTopY - 8, mWidth, (this.bassTopY + 4 * this.lineSpacing) - this.trebleTopY + 16);
      }

      // Bar line connecting both staves
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(barlineX, this.trebleTopY);
      ctx.lineTo(barlineX, this.bassTopY + 4 * this.lineSpacing);
      ctx.stroke();

      // Measure number badge
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${m.number}`, currentMeasureX + 6, this.trebleTopY - 6);

      currentMeasureX += mWidth;
    });

    // 7. Draw Notes, Ledger Lines, and Stems
    this.noteLayouts.forEach((layout) => {
      const { note, x, y, isRest, staffType } = layout;
      const isCurrentlyRinging = this.currentPlayTimeSec >= note.startTime && this.currentPlayTimeSec <= note.endTime;

      if (isRest) {
        ctx.fillStyle = isCurrentlyRinging ? '#f39c12' : '#94a3b8';
        ctx.font = '18px serif';
        ctx.textAlign = 'center';
        ctx.fillText('𝄽', x, this.trebleTopY + this.lineSpacing * 2.2);
        return;
      }

      // Ledger lines handling
      if (staffType === 'treble') {
        const bottomLineY = this.trebleTopY + 4 * this.lineSpacing;
        // Low notes under treble staff (e.g. Middle C4 at y = bottomLineY + lineSpacing)
        if (y >= bottomLineY + this.lineSpacing - 1) {
          for (let ly = bottomLineY + this.lineSpacing; ly <= y + 1; ly += this.lineSpacing) {
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(x - 8, ly);
            ctx.lineTo(x + 8, ly);
            ctx.stroke();
          }
        }
        // High notes above treble staff (A5 and above)
        if (y <= this.trebleTopY - this.lineSpacing + 1) {
          for (let ly = this.trebleTopY - this.lineSpacing; ly >= y - 1; ly -= this.lineSpacing) {
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(x - 8, ly);
            ctx.lineTo(x + 8, ly);
            ctx.stroke();
          }
        }
      } else {
        // Bass staff ledger lines
        const bassBottomLineY = this.bassTopY + 4 * this.lineSpacing;
        if (y >= bassBottomLineY + this.lineSpacing - 1) {
          for (let ly = bassBottomLineY + this.lineSpacing; ly <= y + 1; ly += this.lineSpacing) {
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(x - 8, ly);
            ctx.lineTo(x + 8, ly);
            ctx.stroke();
          }
        }
        if (y <= this.bassTopY - this.lineSpacing + 1) {
          for (let ly = this.bassTopY - this.lineSpacing; ly >= y - 1; ly -= this.lineSpacing) {
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(x - 8, ly);
            ctx.lineTo(x + 8, ly);
            ctx.stroke();
          }
        }
      }

      // Accidental (# / b)
      if (note.alter !== 0) {
        ctx.fillStyle = isCurrentlyRinging ? '#f39c12' : '#cbd5e1';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(note.alter > 0 ? '♯' : '♭', x - 6, y + 3.5);
      }

      // Notehead
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.25);

      const isHollow = note.type === 'half' || note.type === 'whole';
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 3.8, 0, 0, Math.PI * 2);

      if (isCurrentlyRinging) {
        ctx.fillStyle = '#f39c12';
        ctx.shadowColor = '#f39c12';
        ctx.shadowBlur = 10;
      } else {
        ctx.fillStyle = isHollow ? '#0f172a' : '#f8fafc';
      }

      if (isHollow) {
        ctx.fill();
        ctx.strokeStyle = isCurrentlyRinging ? '#f39c12' : '#f8fafc';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      } else {
        ctx.fill();
      }
      ctx.restore();

      // Stem (unless whole note)
      if (note.type !== 'whole') {
        const staffMidY = staffType === 'treble' ? (this.trebleTopY + this.lineSpacing * 2) : (this.bassTopY + this.lineSpacing * 2);
        const stemUp = y > staffMidY;
        ctx.strokeStyle = isCurrentlyRinging ? '#f39c12' : '#f8fafc';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        if (stemUp) {
          ctx.moveTo(x + 4.5, y);
          ctx.lineTo(x + 4.5, y - 20);
        } else {
          ctx.moveTo(x - 4.5, y);
          ctx.lineTo(x - 4.5, y + 20);
        }
        ctx.stroke();
      }

      // Note name label
      ctx.fillStyle = isCurrentlyRinging ? '#f39c12' : '#64748b';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      const labelY = staffType === 'treble' ? (this.trebleTopY + 4 * this.lineSpacing + 13) : (this.bassTopY + 4 * this.lineSpacing + 13);
      ctx.fillText(note.noteName, x, labelY);
    });

    // 8. Dynamic Glowing Synchronized Playback Cursor across Grand Staff
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(6, 182, 212, 0.85)';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(cursorX, this.trebleTopY - 10);
    ctx.lineTo(cursorX, this.bassTopY + 4 * this.lineSpacing + 14);
    ctx.stroke();

    // Cursor top pointer badge
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.moveTo(cursorX - 4, this.trebleTopY - 10);
    ctx.lineTo(cursorX + 4, this.trebleTopY - 10);
    ctx.lineTo(cursorX, this.trebleTopY - 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
