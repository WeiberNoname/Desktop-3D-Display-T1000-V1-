/**
 * MusicXML (.musicxml, .xml) Score Parser & Synchronized Dynamic Playback Engine
 * Parses W3C MusicXML DOM, extracts grand staff / measure structures,
 * calculates musical notes with accidentals, rests, and notehead coordinates,
 * and synchronizes audio playback with dynamic visual sheet tracking.
 */

export class MusicXmlEngine {
  constructor() {
    this.title = 'Untitled Score';
    this.composer = 'Unknown Composer';
    this.bpm = 120;
    this.divisions = 4;
    this.timeSignature = { beats: 4, beatType: 4 };
    this.keySignature = { fifths: 0, mode: 'major' };
    this.measures = []; // [{ number, clef, timeSig, keySig, notes: [] }]
    this.playableNotes = []; // [{ midiNote, noteName, startTime, duration, velocity, measureIndex, noteIndex }]
    this.totalDurationSec = 0;

    // Playback state
    this.isPlaying = false;
    this.currentTimeSec = 0;
    this.tempoMultiplier = 1.0;
    this.isLooping = false;
    this.lastFrameTimestamp = 0;
    this.animationFrameId = null;

    this.onNoteTrigger = null; // (activeNotes, currentTimeSec, activeMeasureIndex, currentCursorRatio) => void
    this.onPlaybackEnd = null;
    this.onTimeUpdate = null;
  }

  /**
   * Parses raw MusicXML text/string
   * @param {string} xmlString
   */
  parse(xmlString) {
    if (typeof DOMParser !== 'undefined') {
      return this._parseWithDOM(xmlString);
    } else {
      return this._parseWithRegex(xmlString);
    }
  }

  _parseWithDOM(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error(`MusicXML XML Parsing error: ${parserError.textContent.slice(0, 100)}`);
    }

    // Score Metadata
    const workTitle = xmlDoc.querySelector('work > work-title') || xmlDoc.querySelector('movement-title');
    if (workTitle) this.title = workTitle.textContent.trim();

    const composerEl = xmlDoc.querySelector('identification > creator[type="composer"]');
    if (composerEl) this.composer = composerEl.textContent.trim();

    // Default divisions
    const divisionsEl = xmlDoc.querySelector('divisions');
    if (divisionsEl) {
      this.divisions = parseInt(divisionsEl.textContent, 10) || 4;
    }

    // Default sound tempo
    const soundEl = xmlDoc.querySelector('sound[tempo]');
    if (soundEl) {
      this.bpm = parseFloat(soundEl.getAttribute('tempo')) || 120;
    }

    this.measures = [];
    this.playableNotes = [];

    const measureElements = xmlDoc.querySelectorAll('part > measure');
    let currentDivisionAccumulator = 0;
    let currentClef = { sign: 'G', line: 2 };
    let currentTimeSig = { beats: 4, beatType: 4 };
    let currentKeySig = { fifths: 0, mode: 'major' };

    measureElements.forEach((mElem, mIdx) => {
      const mNum = mElem.getAttribute('number') || (mIdx + 1);

      // Attributes inside measure
      const clefSign = mElem.querySelector('attributes > clef > sign');
      const clefLine = mElem.querySelector('attributes > clef > line');
      if (clefSign) {
        currentClef = {
          sign: clefSign.textContent.trim().toUpperCase(),
          line: clefLine ? parseInt(clefLine.textContent, 10) : 2
        };
      }

      const beatsEl = mElem.querySelector('attributes > time > beats');
      const beatTypeEl = mElem.querySelector('attributes > time > beat-type');
      if (beatsEl && beatTypeEl) {
        currentTimeSig = {
          beats: parseInt(beatsEl.textContent, 10) || 4,
          beatType: parseInt(beatTypeEl.textContent, 10) || 4
        };
      }

      const fifthsEl = mElem.querySelector('attributes > key > fifths');
      if (fifthsEl) {
        currentKeySig = {
          fifths: parseInt(fifthsEl.textContent, 10) || 0,
          mode: (mElem.querySelector('attributes > key > mode')?.textContent || 'major').trim()
        };
      }

      const mDivisions = mElem.querySelector('attributes > divisions');
      if (mDivisions) {
        this.divisions = parseInt(mDivisions.textContent, 10) || this.divisions;
      }

      const measureObj = {
        number: mNum,
        index: mIdx,
        clef: { ...currentClef },
        timeSignature: { ...currentTimeSig },
        keySignature: { ...currentKeySig },
        notes: []
      };

      const noteElements = mElem.querySelectorAll('note');
      noteElements.forEach((nElem, nIdx) => {
        const isRest = !!nElem.querySelector('rest');
        const isChord = !!nElem.querySelector('chord');
        const durationDivs = parseInt(nElem.querySelector('duration')?.textContent || this.divisions, 10);
        const noteType = nElem.querySelector('type')?.textContent?.trim() || (durationDivs >= this.divisions * 4 ? 'whole' : durationDivs >= this.divisions * 2 ? 'half' : durationDivs >= this.divisions ? 'quarter' : 'eighth');
        const hasDot = !!nElem.querySelector('dot');

        let step = 'C';
        let octave = 4;
        let alter = 0;
        let midiNote = 60;

        if (!isRest) {
          const stepEl = nElem.querySelector('pitch > step');
          const octaveEl = nElem.querySelector('pitch > octave');
          const alterEl = nElem.querySelector('pitch > alter');

          step = stepEl ? stepEl.textContent.trim().toUpperCase() : 'C';
          octave = octaveEl ? parseInt(octaveEl.textContent, 10) : 4;
          alter = alterEl ? parseInt(alterEl.textContent, 10) : 0;

          const stepOffsets = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
          midiNote = (octave + 1) * 12 + (stepOffsets[step] || 0) + alter;
        }

        const startDiv = isChord ? currentDivisionAccumulator - durationDivs : currentDivisionAccumulator;
        const secondsPerDivision = (60 / this.bpm) / this.divisions;
        const startTime = startDiv * secondsPerDivision;
        const durationSec = durationDivs * secondsPerDivision;

        const noteObj = {
          isRest,
          isChord,
          step,
          octave,
          alter,
          midiNote,
          noteName: isRest ? 'Rest' : `${step}${alter > 0 ? '#' : alter < 0 ? 'b' : ''}${octave}`,
          type: noteType,
          dot: hasDot,
          durationDivs,
          startTime,
          durationSec: Math.max(0.08, durationSec),
          endTime: startTime + durationSec,
          measureIndex: mIdx,
          noteIndex: nIdx
        };

        measureObj.notes.push(noteObj);
        if (!isRest) this.playableNotes.push(noteObj);
        if (!isChord) currentDivisionAccumulator += durationDivs;
      });

      this.measures.push(measureObj);
    });

    this.playableNotes.sort((a, b) => a.startTime - b.startTime || a.midiNote - b.midiNote);
    this.totalDurationSec = this.playableNotes.length > 0 ? Math.max(...this.playableNotes.map(n => n.endTime)) + 1.0 : 0;
    return {
      title: this.title,
      composer: this.composer,
      measures: this.measures,
      playableNotes: this.playableNotes,
      totalDurationSec: this.totalDurationSec
    };
  }

  _parseWithRegex(xmlString) {
    const titleMatch = xmlString.match(/<work-title>([\s\S]*?)<\/work-title>/i);
    if (titleMatch) this.title = titleMatch[1].trim();

    const composerMatch = xmlString.match(/<creator[^>]*type="composer"[^>]*>([\s\S]*?)<\/creator>/i);
    if (composerMatch) this.composer = composerMatch[1].trim();

    const divisionsMatch = xmlString.match(/<divisions>(\d+)<\/divisions>/i);
    if (divisionsMatch) this.divisions = parseInt(divisionsMatch[1], 10);

    const soundMatch = xmlString.match(/<sound[^>]*tempo="([\d\.]+)"/i);
    if (soundMatch) this.bpm = parseFloat(soundMatch[1]);

    this.measures = [];
    this.playableNotes = [];

    const measureRegex = /<measure\b([^>]*)>([\s\S]*?)<\/measure>/gi;
    let mMatch;
    let mIdx = 0;
    let currentDivisionAccumulator = 0;
    let currentClef = { sign: 'G', line: 2 };
    let currentTimeSig = { beats: 4, beatType: 4 };
    let currentKeySig = { fifths: 0, mode: 'major' };

    while ((mMatch = measureRegex.exec(xmlString)) !== null) {
      const mAttrs = mMatch[1];
      const mContent = mMatch[2];
      const numMatch = mAttrs.match(/number="([^"]+)"/i);
      const mNum = numMatch ? numMatch[1] : (mIdx + 1);

      const fifthsM = mContent.match(/<fifths>([-\d]+)<\/fifths>/i);
      if (fifthsM) currentKeySig.fifths = parseInt(fifthsM[1], 10);

      const beatsM = mContent.match(/<beats>(\d+)<\/beats>/i);
      const beatTypeM = mContent.match(/<beat-type>(\d+)<\/beat-type>/i);
      if (beatsM && beatTypeM) {
        currentTimeSig = { beats: parseInt(beatsM[1], 10), beatType: parseInt(beatTypeM[1], 10) };
      }

      const clefSignM = mContent.match(/<sign>([A-Za-z]+)<\/sign>/i);
      if (clefSignM) currentClef.sign = clefSignM[1].toUpperCase();

      const measureObj = {
        number: mNum,
        index: mIdx,
        clef: { ...currentClef },
        timeSignature: { ...currentTimeSig },
        keySignature: { ...currentKeySig },
        notes: []
      };

      const noteRegex = /<note\b[^>]*>([\s\S]*?)<\/note>/gi;
      let nMatch;
      let nIdx = 0;

      while ((nMatch = noteRegex.exec(mContent)) !== null) {
        const nContent = nMatch[1];
        const isRest = /<rest\b/i.test(nContent);
        const isChord = /<chord\b/i.test(nContent);
        const durM = nContent.match(/<duration>(\d+)<\/duration>/i);
        const durationDivs = durM ? parseInt(durM[1], 10) : this.divisions;
        const typeM = nContent.match(/<type>([a-z]+)<\/type>/i);
        const noteType = typeM ? typeM[1] : (durationDivs >= this.divisions * 4 ? 'whole' : durationDivs >= this.divisions * 2 ? 'half' : durationDivs >= this.divisions ? 'quarter' : 'eighth');
        const hasDot = /<dot\b/i.test(nContent);

        let step = 'C', octave = 4, alter = 0, midiNote = 60;
        if (!isRest) {
          const stepM = nContent.match(/<step>([A-Ga-g])<\/step>/i);
          const octM = nContent.match(/<octave>(\d+)<\/octave>/i);
          const altM = nContent.match(/<alter>([-\d]+)<\/alter>/i);
          step = stepM ? stepM[1].toUpperCase() : 'C';
          octave = octM ? parseInt(octM[1], 10) : 4;
          alter = altM ? parseInt(altM[1], 10) : 0;

          const stepOffsets = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
          midiNote = (octave + 1) * 12 + (stepOffsets[step] || 0) + alter;
        }

        const startDiv = isChord ? currentDivisionAccumulator - durationDivs : currentDivisionAccumulator;
        const secondsPerDivision = (60 / this.bpm) / this.divisions;
        const startTime = startDiv * secondsPerDivision;
        const durationSec = durationDivs * secondsPerDivision;

        const noteObj = {
          isRest,
          isChord,
          step,
          octave,
          alter,
          midiNote,
          noteName: isRest ? 'Rest' : `${step}${alter > 0 ? '#' : alter < 0 ? 'b' : ''}${octave}`,
          type: noteType,
          dot: hasDot,
          durationDivs,
          startTime,
          durationSec: Math.max(0.08, durationSec),
          endTime: startTime + durationSec,
          measureIndex: mIdx,
          noteIndex: nIdx
        };

        measureObj.notes.push(noteObj);
        if (!isRest) this.playableNotes.push(noteObj);
        if (!isChord) currentDivisionAccumulator += durationDivs;
        nIdx++;
      }

      this.measures.push(measureObj);
      mIdx++;
    }

    this.playableNotes.sort((a, b) => a.startTime - b.startTime || a.midiNote - b.midiNote);
    this.totalDurationSec = this.playableNotes.length > 0 ? Math.max(...this.playableNotes.map(n => n.endTime)) + 1.0 : 0;
    return {
      title: this.title,
      composer: this.composer,
      measures: this.measures,
      playableNotes: this.playableNotes,
      totalDurationSec: this.totalDurationSec
    };
  }

  // --- Real-time Playback Controls ---
  play(pianoAudioEngine) {
    if (this.isPlaying) return;
    if (this.playableNotes.length === 0) return;

    this.isPlaying = true;
    this.lastFrameTimestamp = performance.now();

    const loop = (timestamp) => {
      if (!this.isPlaying) return;

      const deltaMs = timestamp - this.lastFrameTimestamp;
      this.lastFrameTimestamp = timestamp;

      const prevTime = this.currentTimeSec;
      this.currentTimeSec += (deltaMs / 1000) * this.tempoMultiplier;

      // Trigger notes within this time window
      const notesToTrigger = this.playableNotes.filter(n => n.startTime >= prevTime && n.startTime < this.currentTimeSec);

      if (notesToTrigger.length > 0 && pianoAudioEngine) {
        notesToTrigger.forEach(n => {
          pianoAudioEngine.playNote(n.midiNote, 0.85, n.durationSec / this.tempoMultiplier);
        });
      }

      // Currently active ringing notes
      const activeNotes = this.playableNotes.filter(n => this.currentTimeSec >= n.startTime && this.currentTimeSec <= n.endTime);

      // Identify active measure
      let activeMeasureIndex = 0;
      for (let i = 0; i < this.measures.length; i++) {
        const m = this.measures[i];
        if (m.notes.length > 0) {
          const mStart = m.notes[0].startTime;
          const mEnd = m.notes[m.notes.length - 1].endTime;
          if (this.currentTimeSec >= mStart && this.currentTimeSec <= mEnd) {
            activeMeasureIndex = i;
            break;
          } else if (this.currentTimeSec > mEnd) {
            activeMeasureIndex = i;
          }
        }
      }

      if (this.onNoteTrigger) {
        this.onNoteTrigger(activeNotes, this.currentTimeSec, activeMeasureIndex, notesToTrigger);
      }

      if (this.onTimeUpdate) {
        this.onTimeUpdate(this.currentTimeSec, this.totalDurationSec);
      }

      // Check end of score
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
      this.onNoteTrigger([], 0, 0, []);
    }
    if (this.onTimeUpdate) {
      this.onTimeUpdate(0, this.totalDurationSec);
    }
  }

  seek(timeInSec) {
    this.currentTimeSec = Math.max(0, Math.min(this.totalDurationSec, parseFloat(timeInSec) || 0));
    const activeNotes = this.playableNotes.filter(n => this.currentTimeSec >= n.startTime && this.currentTimeSec <= n.endTime);
    if (this.onNoteTrigger) {
      this.onNoteTrigger(activeNotes, this.currentTimeSec, 0, []);
    }
    if (this.onTimeUpdate) {
      this.onTimeUpdate(this.currentTimeSec, this.totalDurationSec);
    }
  }

  setTempoMultiplier(multiplier) {
    this.tempoMultiplier = Math.max(0.25, Math.min(3.0, parseFloat(multiplier) || 1.0));
  }

  /**
   * Generates built-in classical MusicXML scores
   */
  static getPresetXml(presetName) {
    const scores = {
      ode_to_joy: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>Ode to Joy (Symphony No. 9)</work-title></work>
  <identification><creator type="composer">L. v. Beethoven</creator></identification>
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <!-- Measure 1 -->
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <sound tempo="120"/>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <!-- Measure 2 -->
    <measure number="2">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <!-- Measure 3 -->
    <measure number="3">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <!-- Measure 4 -->
    <measure number="4">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>6</duration><type>quarter</type><dot/></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><type>eighth</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>8</duration><type>half</type></note>
    </measure>
    <!-- Measure 5 -->
    <measure number="5">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <!-- Measure 6 -->
    <measure number="6">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <!-- Measure 7 -->
    <measure number="7">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <!-- Measure 8 -->
    <measure number="8">
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>6</duration><type>quarter</type><dot/></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><type>eighth</type></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>8</duration><type>half</type></note>
    </measure>
  </part>
</score-partwise>`,
      canon_in_d: `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>Canon in D Major</work-title></work>
  <identification><creator type="composer">Johann Pachelbel</creator></identification>
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>2</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <sound tempo="90"/>
      <note><pitch><step>F</step><alter>1</alter><octave>5</octave></pitch><duration>8</duration><type>half</type></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>8</duration><type>half</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>8</duration><type>half</type></note>
      <note><pitch><step>C</step><alter>1</alter><octave>5</octave></pitch><duration>8</duration><type>half</type></note>
    </measure>
    <measure number="3">
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>8</duration><type>half</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>8</duration><type>half</type></note>
    </measure>
    <measure number="4">
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>8</duration><type>half</type></note>
      <note><pitch><step>C</step><alter>1</alter><octave>5</octave></pitch><duration>8</duration><type>half</type></note>
    </measure>
    <measure number="5">
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>C</step><alter>1</alter><octave>5</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <measure number="6">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <measure number="7">
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>16</duration><type>whole</type></note>
    </measure>
  </part>
</score-partwise>`,
      twinkle: `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>Twinkle Variations</work-title></work>
  <identification><creator type="composer">W.A. Mozart</creator></identification>
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <sound tempo="100"/>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>8</duration><type>half</type></note>
    </measure>
    <measure number="3">
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <measure number="4">
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>8</duration><type>half</type></note>
    </measure>
  </part>
</score-partwise>`
    };

    scores.canon = scores.canon_in_d;
    scores.twinkle_star = scores.twinkle;

    const xml = scores[presetName] || scores.ode_to_joy;
    const engine = new MusicXmlEngine();
    engine.parse(xml);
    return engine;
  }
}
