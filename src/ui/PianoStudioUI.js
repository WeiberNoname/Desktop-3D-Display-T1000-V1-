/**
 * Grand Piano Studio UI Controller
 * Manages virtual piano keyboard rendering with custom / full 88-key dynamic range,
 * 1:1 falling-note waterfall alignment, local file hosting in assets/music/,
 * and synchronized sheet music playback.
 */

import { PianoAudioEngine } from '../core/PianoAudioEngine.js';
import { MidiParserEngine } from '../core/MidiParserEngine.js';
import { MusicXmlEngine } from '../core/MusicXmlEngine.js';
import { MusicScoreRenderer } from './MusicScoreRenderer.js';
import { PianoRollVisualizer } from './PianoRollVisualizer.js';

export function setupPianoStudioUI(deps) {
  const {
    currentSettings = {},
    saveSettingsFile,
    t,
    fs,
    path,
    getAssetsPath,
    showSpeechBubble,
    audioCtx,
    masterGain
  } = deps;

  // 1. Initialize Piano Audio Engine
  const pianoAudio = new PianoAudioEngine(audioCtx, masterGain);

  // Engines
  const midiEngine = new MidiParserEngine();
  const xmlEngine = new MusicXmlEngine();

  // State
  let activeMode = 'midi'; // 'midi' | 'xml'
  let currentTitle = 'Beethoven - Für Elise';
  let currentMinNote = 21; // A0 (Full Grand Piano default)
  let currentMaxNote = 108; // C8
  let rangeMode = 'autofit'; // '88' | 'autofit' | '61' | '49' | '37'
  let hostedMusicFiles = [];

  // DOM Elements
  const pianoKeyboard = document.getElementById('piano-keyboard-container');
  const midiCanvas = document.getElementById('piano-midi-canvas');
  const scoreCanvas = document.getElementById('piano-score-canvas');
  const modeMidiBtn = document.getElementById('btn-piano-mode-midi');
  const modeXmlBtn = document.getElementById('btn-piano-mode-xml');
  const modeMidiSection = document.getElementById('piano-midi-section');
  const modeXmlSection = document.getElementById('piano-xml-section');

  const rangeSelect = document.getElementById('piano-range-select');
  const btnOctaveBass = document.getElementById('btn-octave-bass');
  const btnOctaveMid = document.getElementById('btn-octave-mid');
  const btnOctaveTreble = document.getElementById('btn-octave-treble');
  const btnOctaveLeft = document.getElementById('btn-octave-left');
  const btnOctaveRight = document.getElementById('btn-octave-right');
  const autoscrollCheck = document.getElementById('piano-autoscroll-check');

  const fileInput = document.getElementById('piano-file-input');
  const browseBtn = document.getElementById('btn-piano-browse');
  const dropzone = document.getElementById('piano-dropzone');
  const presetSelect = document.getElementById('piano-preset-select');
  const songTitleBadge = document.getElementById('piano-song-title');

  const playBtn = document.getElementById('btn-piano-play');
  const stopBtn = document.getElementById('btn-piano-stop');
  const timelineSlider = document.getElementById('piano-timeline');
  const timeLabel = document.getElementById('val-piano-time');
  const tempoSlider = document.getElementById('piano-tempo-slider');
  const tempoLabel = document.getElementById('val-piano-tempo');
  const pianoVolSlider = document.getElementById('piano-vol-slider');
  const pianoVolLabel = document.getElementById('val-piano-vol');
  const loopCheck = document.getElementById('piano-loop-check');
  const sustainCheck = document.getElementById('piano-sustain-check');

  // Visualizers
  let scoreRenderer = null;
  let midiVisualizer = null;

  if (scoreCanvas) {
    scoreRenderer = new MusicScoreRenderer(scoreCanvas);
    scoreRenderer.onSeekRequest = (timeSec) => {
      seekTo(timeSec);
    };
  }

  if (midiCanvas) {
    midiVisualizer = new PianoRollVisualizer(midiCanvas, { minNote: currentMinNote, maxNote: currentMaxNote });
  }

  // 2. Directory & Hosted File Ingestion (assets/music)
  const getMusicDirs = () => {
    const dirs = [];
    if (fs && path && typeof getAssetsPath === 'function') {
      try {
        const baseAssets = getAssetsPath();
        dirs.push(path.join(baseAssets, 'music'));
        dirs.push(path.join(baseAssets));
      } catch (e) {}
    }
    if (path) {
      try {
        dirs.push(path.join(process.cwd(), 'assets', 'music'));
        dirs.push(path.join(process.cwd(), 'assets'));
      } catch (e) {}
    }
    return dirs;
  };

  const getPrimaryMusicDir = () => {
    if (!fs || !path) return null;
    let primary = null;
    if (typeof getAssetsPath === 'function') {
      try {
        primary = path.join(getAssetsPath(), 'music');
      } catch (e) {}
    }
    if (!primary) {
      try {
        primary = path.join(process.cwd(), 'assets', 'music');
      } catch (e) {}
    }
    if (primary) {
      try {
        if (!fs.existsSync(primary)) {
          fs.mkdirSync(primary, { recursive: true });
        }
        return primary;
      } catch (e) {
        console.warn('Could not create primary music directory:', e);
      }
    }
    return null;
  };

  const findMusicFile = (fileName) => {
    if (!fileName || !fs || !path) return null;
    const dirs = getMusicDirs();
    for (const d of dirs) {
      const full = path.join(d, fileName);
      if (fs.existsSync(full)) {
        return full;
      }
    }
    return null;
  };

  const scanHostedMusicFiles = () => {
    const seen = new Set();
    const results = [];
    const dirs = getMusicDirs();
    dirs.forEach(d => {
      if (fs && fs.existsSync(d)) {
        try {
          const files = fs.readdirSync(d);
          files.forEach(f => {
            const lower = f.toLowerCase();
            if ((lower.endsWith('.mid') || lower.endsWith('.midi') || lower.endsWith('.musicxml') || lower.endsWith('.xml')) && !seen.has(f)) {
              seen.add(f);
              results.push(f);
            }
          });
        } catch (e) {}
      }
    });
    hostedMusicFiles = results;
    return hostedMusicFiles;
  };

  const updatePresetDropdown = (selectedKey = null) => {
    if (!presetSelect) return;
    scanHostedMusicFiles();

    let html = '';

    // Hosted files section
    if (hostedMusicFiles.length > 0) {
      html += `<optgroup label="${t ? t('piano_hosted_group', '📁 Hosted Music Library') : '📁 Hosted Music Library'}">`;
      hostedMusicFiles.forEach(fileName => {
        const isMidi = fileName.toLowerCase().endsWith('.mid') || fileName.toLowerCase().endsWith('.midi');
        const icon = isMidi ? '🎹' : '🎼';
        html += `<option value="hosted:${fileName}">${icon} ${fileName}</option>`;
      });
      html += `</optgroup>`;
    }

    // Default Presets section
    html += `<optgroup label="${t ? t('piano_presets_group', '🎵 Built-in Presets') : '🎵 Built-in Presets'}">`;
    if (activeMode === 'midi') {
      html += `
        <option value="fur_elise">🎹 Beethoven - Für Elise (MIDI)</option>
        <option value="bach_minuet">🎹 Bach - Minuet in G (MIDI)</option>
      `;
    } else {
      html += `
        <option value="ode_to_joy">🎼 Beethoven - Ode to Joy (MusicXML)</option>
        <option value="canon_in_d">🎼 Pachelbel - Canon in D (MusicXML)</option>
      `;
    }
    html += `</optgroup>`;

    presetSelect.innerHTML = html;
    if (selectedKey) {
      presetSelect.value = selectedKey;
    }
    renderSongGrid();
  };

  // --- Unified Piano Song & Score Card Selection Grid ---
  const songGrid = document.getElementById('piano-song-grid');
  const songCountBadge = document.getElementById('piano-song-count');
  const registry = window.__assetRegistryManager;

  const builtInSongs = [
    { id: 'fur_elise', name: 'Für Elise', composer: 'Beethoven', mode: 'midi', icon: '🎹', ext: 'MID', type: 'preset' },
    { id: 'bach_minuet', name: 'Minuet in G', composer: 'Bach', mode: 'midi', icon: '🎹', ext: 'MID', type: 'preset' },
    { id: 'canon_in_d', name: 'Canon in D', composer: 'Pachelbel', mode: 'xml', icon: '🎼', ext: 'XML', type: 'preset' },
    { id: 'ode_to_joy', name: 'Ode to Joy', composer: 'Beethoven', mode: 'xml', icon: '🎼', ext: 'XML', type: 'preset' }
  ];

  const renderSongGrid = () => {
    if (!songGrid) return;
    songGrid.innerHTML = '';

    const customAudioAssets = registry ? registry.getAssets('audio') : [];
    const allSongs = [...builtInSongs];

    hostedMusicFiles.forEach(f => {
      const isMidi = f.toLowerCase().endsWith('.mid') || f.toLowerCase().endsWith('.midi');
      allSongs.push({
        id: `hosted:${f}`,
        name: f.replace(/\.[^/.]+$/, ''),
        composer: 'Local File',
        mode: isMidi ? 'midi' : 'xml',
        icon: isMidi ? '🎹' : '🎼',
        ext: isMidi ? 'MID' : 'XML',
        type: 'hosted',
        fileName: f
      });
    });

    customAudioAssets.forEach(a => {
      const cleanName = a.name.replace(/\.[^/.]+$/, '');
      if (!allSongs.some(s => s.name === cleanName)) {
        allSongs.push({
          id: `asset:${a.id}`,
          name: cleanName,
          composer: 'Asset Hub',
          mode: a.format === 'musicxml' ? 'xml' : 'midi',
          icon: a.icon || '🎹',
          ext: a.ext.toUpperCase(),
          type: 'asset',
          asset: a
        });
      }
    });

    if (songCountBadge) {
      songCountBadge.textContent = `${allSongs.length} Scores`;
    }

    allSongs.forEach(song => {
      const card = document.createElement('div');
      const isSelected = currentTitle.toLowerCase().includes(song.name.toLowerCase());
      card.className = `studio-select-card ${isSelected ? 'selected' : ''}`;
      card.setAttribute('data-id', song.id);

      card.innerHTML = `
        <div class="studio-select-thumb">
          <div class="asset-thumbnail-placeholder">
            <span class="asset-placeholder-icon">${song.icon}</span>
            <span class="asset-ext-badge">.${song.ext}</span>
          </div>
        </div>
        <div class="studio-select-label" title="${song.name}">${song.name}</div>
        <div class="studio-select-sub">${song.composer}</div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('#piano-song-grid .studio-select-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        if (song.type === 'preset') {
          setMode(song.mode, false);
          loadPreset(song.id);
        } else if (song.type === 'hosted') {
          loadHostedFile(song.fileName);
        } else if (song.type === 'asset' && song.asset) {
          if (song.asset.file) {
            handleFileImport(song.asset.file);
          }
        }
      });

      songGrid.appendChild(card);
    });
  };

  if (registry) {
    registry.subscribe(() => renderSongGrid());
  }
  renderSongGrid();

  // 3. Dynamic Piano Keyboard Builder (Customizable Key Range)
  let keyElementsMap = new Map();

  const rebuildKeyboard = () => {
    if (!pianoKeyboard) return;
    pianoKeyboard.innerHTML = '';
    keyElementsMap.clear();

    const whiteNotes = [0, 2, 4, 5, 7, 9, 11];
    const keyboardWrapper = document.createElement('div');
    keyboardWrapper.className = 'virtual-piano-keys';

    for (let note = currentMinNote; note <= currentMaxNote; note++) {
      const noteInOctave = note % 12;
      const isWhite = whiteNotes.includes(noteInOctave);

      const keyEl = document.createElement('div');
      keyEl.className = isWhite ? 'piano-key white-key' : 'piano-key black-key';
      keyEl.dataset.note = note;
      keyEl.dataset.noteName = PianoAudioEngine.midiToNoteName(note);

      // Label for C notes and shortcuts
      const noteLabel = document.createElement('span');
      noteLabel.className = 'piano-key-label';
      if (noteInOctave === 0) {
        noteLabel.innerText = `C${Math.floor(note / 12) - 1}`;
        if (note === 60) {
          noteLabel.innerText = 'C4 (Mid)';
          keyEl.classList.add('middle-c-key');
        }
      } else if (note === 21) {
        noteLabel.innerText = 'A0';
      }
      keyEl.appendChild(noteLabel);

      // Mouse triggers
      keyEl.addEventListener('mousedown', (e) => {
        e.preventDefault();
        triggerKeyNote(note, 0.9);
      });
      keyEl.addEventListener('mouseup', () => releaseKeyNote(note));
      keyEl.addEventListener('mouseleave', () => releaseKeyNote(note));

      // Touch triggers
      keyEl.addEventListener('touchstart', (e) => {
        e.preventDefault();
        triggerKeyNote(note, 0.9);
      }, { passive: false });
      keyEl.addEventListener('touchend', () => releaseKeyNote(note));

      keyboardWrapper.appendChild(keyEl);
      keyElementsMap.set(note, keyEl);
    }

    pianoKeyboard.appendChild(keyboardWrapper);

    // Synchronize MIDI Visualizer boundaries
    if (midiVisualizer) {
      midiVisualizer.setNotes(midiEngine.notes, currentMinNote, currentMaxNote);
    }
  };

  const applyRangeMode = (mode) => {
    rangeMode = mode;
    if (mode === '88') {
      currentMinNote = 21; // A0
      currentMaxNote = 108; // C8
    } else if (mode === '61') {
      currentMinNote = 36; // C2
      currentMaxNote = 96; // C7
    } else if (mode === '49') {
      currentMinNote = 36; // C2
      currentMaxNote = 84; // C6
    } else if (mode === '37') {
      currentMinNote = 48; // C3
      currentMaxNote = 84; // C6
    } else if (mode === 'autofit') {
      const activeNotes = activeMode === 'midi' ? midiEngine.notes : xmlEngine.playableNotes;
      if (activeNotes && activeNotes.length > 0) {
        const minMidi = Math.min(...activeNotes.map(n => n.midiNote));
        const maxMidi = Math.max(...activeNotes.map(n => n.midiNote));
        // Pad to nearest full octave with safety clamps (A0=21, C8=108)
        currentMinNote = Math.max(21, Math.floor((minMidi - 2) / 12) * 12);
        currentMaxNote = Math.min(108, Math.ceil((maxMidi + 3) / 12) * 12);
      } else {
        currentMinNote = 36;
        currentMaxNote = 96;
      }
    }

    rebuildKeyboard();
  };

  if (rangeSelect) {
    rangeSelect.addEventListener('change', () => {
      applyRangeMode(rangeSelect.value);
    });
  }

  // Scroll keyboard to specific note or offset
  const scrollToNote = (midiNote) => {
    if (!pianoKeyboard || !keyElementsMap) return;
    const el = keyElementsMap.get(midiNote);
    if (el) {
      const elOffset = el.offsetLeft;
      const containerWidth = pianoKeyboard.clientWidth;
      const targetScroll = Math.max(0, elOffset - containerWidth / 2 + el.clientWidth / 2);
      pianoKeyboard.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  };

  // Octave navigation listeners
  if (btnOctaveBass) {
    btnOctaveBass.addEventListener('click', () => {
      [btnOctaveBass, btnOctaveMid, btnOctaveTreble].forEach(b => b && b.classList.remove('active'));
      btnOctaveBass.classList.add('active');
      scrollToNote(Math.max(currentMinNote, 36));
    });
  }

  if (btnOctaveMid) {
    btnOctaveMid.addEventListener('click', () => {
      [btnOctaveBass, btnOctaveMid, btnOctaveTreble].forEach(b => b && b.classList.remove('active'));
      btnOctaveMid.classList.add('active');
      scrollToNote(60);
    });
  }

  if (btnOctaveTreble) {
    btnOctaveTreble.addEventListener('click', () => {
      [btnOctaveBass, btnOctaveMid, btnOctaveTreble].forEach(b => b && b.classList.remove('active'));
      btnOctaveTreble.classList.add('active');
      scrollToNote(Math.min(currentMaxNote, 84));
    });
  }

  if (btnOctaveLeft) {
    btnOctaveLeft.addEventListener('click', () => {
      pianoKeyboard.scrollBy({ left: -160, behavior: 'smooth' });
    });
  }

  if (btnOctaveRight) {
    btnOctaveRight.addEventListener('click', () => {
      pianoKeyboard.scrollBy({ left: 160, behavior: 'smooth' });
    });
  }

  const highlightKey = (midiNote, active) => {
    if (!keyElementsMap) return;
    const el = keyElementsMap.get(midiNote);
    if (el) {
      if (active) {
        el.classList.add('active-key');
        // Auto-follow active note if enabled
        if (autoscrollCheck && autoscrollCheck.checked) {
          const elOffset = el.offsetLeft;
          const scrollLeft = pianoKeyboard.scrollLeft;
          const containerWidth = pianoKeyboard.clientWidth;
          if (elOffset < scrollLeft + 30 || elOffset > scrollLeft + containerWidth - 50) {
            scrollToNote(midiNote);
          }
        }
      } else {
        el.classList.remove('active-key');
      }
    }
  };

  const clearAllHighlights = () => {
    if (!keyElementsMap) return;
    keyElementsMap.forEach(el => el.classList.remove('active-key'));
  };

  const triggerKeyNote = (midiNote, vel = 0.85) => {
    pianoAudio.playNote(midiNote, vel);
    highlightKey(midiNote, true);
  };

  const releaseKeyNote = (midiNote) => {
    pianoAudio.stopNote(midiNote);
    highlightKey(midiNote, false);
  };

  // 4. PC Keyboard Shortcuts Mapping (C4 to E5)
  const pcKeyMap = {
    'KeyA': 60, // C4
    'KeyW': 61, // C#4
    'KeyS': 62, // D4
    'KeyE': 63, // D#4
    'KeyD': 64, // E4
    'KeyF': 65, // F4
    'KeyT': 66, // F#4
    'KeyG': 67, // G4
    'KeyY': 68, // G#4
    'KeyH': 69, // A4
    'KeyU': 70, // A#4
    'KeyJ': 71, // B4
    'KeyK': 72, // C5
    'KeyO': 73, // C#5
    'KeyL': 74, // D5
    'KeyP': 75, // D#5
    'Semicolon': 76 // E5
  };

  const activePcKeys = new Set();
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    const midi = pcKeyMap[e.code];
    if (midi && !activePcKeys.has(e.code)) {
      activePcKeys.add(e.code);
      triggerKeyNote(midi, 0.9);
    }
  });

  window.addEventListener('keyup', (e) => {
    const midi = pcKeyMap[e.code];
    if (midi && activePcKeys.has(e.code)) {
      activePcKeys.delete(e.code);
      releaseKeyNote(midi);
    }
  });

  // 5. Mode Switcher (MIDI vs MusicXML)
  const setMode = (mode, autoLoadDefault = true) => {
    stopPlayback();
    activeMode = mode;

    if (modeMidiBtn) modeMidiBtn.classList.toggle('active', mode === 'midi');
    if (modeXmlBtn) modeXmlBtn.classList.toggle('active', mode === 'xml');
    if (modeMidiSection) modeMidiSection.style.display = mode === 'midi' ? 'block' : 'none';
    if (modeXmlSection) modeXmlSection.style.display = mode === 'xml' ? 'block' : 'none';

    updatePresetDropdown();

    if (autoLoadDefault) {
      if (mode === 'midi') {
        loadPreset('fur_elise');
      } else {
        loadPreset('ode_to_joy');
      }
    }
  };

  if (modeMidiBtn) modeMidiBtn.addEventListener('click', () => setMode('midi', true));
  if (modeXmlBtn) modeXmlBtn.addEventListener('click', () => setMode('xml', true));

  // 6. Preset & Hosted File Loader
  const loadHostedFile = (fileName) => {
    const fullPath = findMusicFile(fileName);
    if (!fullPath || !fs) return;

    stopPlayback();
    const lower = fileName.toLowerCase();

    if (lower.endsWith('.mid') || lower.endsWith('.midi')) {
      const buffer = fs.readFileSync(fullPath);
      const parsedNotes = midiEngine.parse(buffer);
      setMode('midi', false);
      currentTitle = fileName.replace(/\.[^/.]+$/, '');
      if (songTitleBadge) songTitleBadge.innerText = `🎹 ${currentTitle} (${parsedNotes.length} notes)`;
      if (rangeMode === 'autofit') applyRangeMode('autofit');
      else if (midiVisualizer) midiVisualizer.setNotes(midiEngine.notes, currentMinNote, currentMaxNote);
      updateTimelineUI(0, midiEngine.totalDurationSec);
    } else if (lower.endsWith('.xml') || lower.endsWith('.musicxml')) {
      const xmlText = fs.readFileSync(fullPath, 'utf8');
      xmlEngine.parse(xmlText);
      setMode('xml', false);
      currentTitle = `${xmlEngine.composer || 'Library'} - ${xmlEngine.title || fileName}`;
      if (songTitleBadge) songTitleBadge.innerText = `🎼 ${currentTitle} (${xmlEngine.playableNotes.length} notes)`;
      if (scoreRenderer) scoreRenderer.setScore(xmlEngine);
      if (rangeMode === 'autofit') applyRangeMode('autofit');
      updateTimelineUI(0, xmlEngine.totalDurationSec);
    }

    currentSettings.activeMusicFile = fileName;
    if (saveSettingsFile) saveSettingsFile();
    updatePresetDropdown(`hosted:${fileName}`);
  };

  const loadPreset = (presetKey) => {
    stopPlayback();
    if (presetKey.startsWith('hosted:')) {
      const fileName = presetKey.replace(/^hosted:/, '');
      loadHostedFile(fileName);
      return;
    }

    currentSettings.activeMusicFile = '';
    if (saveSettingsFile) saveSettingsFile();

    if (activeMode === 'midi') {
      const parsedEngine = MidiParserEngine.getPresetMidi(presetKey);
      midiEngine.notes = parsedEngine.notes;
      midiEngine.totalDurationSec = parsedEngine.totalDurationSec;
      currentTitle = presetKey === 'fur_elise' ? 'Beethoven - Für Elise' : 'Bach - Minuet in G';
      if (songTitleBadge) songTitleBadge.innerText = `🎹 ${currentTitle}`;
      if (rangeMode === 'autofit') applyRangeMode('autofit');
      else if (midiVisualizer) midiVisualizer.setNotes(midiEngine.notes, currentMinNote, currentMaxNote);
    } else {
      const parsedXml = MusicXmlEngine.getPresetXml(presetKey);
      xmlEngine.title = parsedXml.title;
      xmlEngine.composer = parsedXml.composer;
      xmlEngine.measures = parsedXml.measures;
      xmlEngine.playableNotes = parsedXml.playableNotes;
      xmlEngine.totalDurationSec = parsedXml.totalDurationSec;
      currentTitle = `${parsedXml.composer} - ${parsedXml.title}`;
      if (songTitleBadge) songTitleBadge.innerText = `🎼 ${currentTitle}`;
      if (scoreRenderer) scoreRenderer.setScore(xmlEngine);
      if (rangeMode === 'autofit') applyRangeMode('autofit');
    }
    updateTimelineUI(0, getActiveEngine().totalDurationSec);
  };

  if (presetSelect) {
    presetSelect.addEventListener('change', () => {
      loadPreset(presetSelect.value);
    });
  }

  // 7. Custom File Ingestion & Permanent Local Hosting
  const saveAndHostMusicFile = (file, fileBufferOrText) => {
    const primaryDir = getPrimaryMusicDir();
    const fileName = file.name;

    if (primaryDir && fs && path) {
      try {
        const destPath = path.join(primaryDir, fileName);
        if (file.path && fs.existsSync(file.path)) {
          fs.copyFileSync(file.path, destPath);
        } else if (fileBufferOrText instanceof ArrayBuffer) {
          fs.writeFileSync(destPath, Buffer.from(fileBufferOrText));
        } else if (typeof fileBufferOrText === 'string') {
          fs.writeFileSync(destPath, fileBufferOrText, 'utf8');
        }
      } catch (err) {
        console.warn('Could not write file to primary music directory:', err);
      }
    }

    currentSettings.activeMusicFile = fileName;
    if (saveSettingsFile) saveSettingsFile();

    if (showSpeechBubble) {
      showSpeechBubble(`Imported Sheet / MIDI:\n${fileName} 🎵`, 3500);
    }
  };

  const handleFileImport = (file) => {
    if (!file) return;
    stopPlayback();
    const fileName = file.name;
    const lowerName = fileName.toLowerCase();

    if (lowerName.endsWith('.mid') || lowerName.endsWith('.midi')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsedNotes = midiEngine.parse(e.target.result);
          if (!parsedNotes || parsedNotes.length === 0) {
            alert('Warning: No playable musical notes found in this MIDI file.');
            return;
          }
          saveAndHostMusicFile(file, e.target.result);
          setMode('midi', false);
          currentTitle = fileName.replace(/\.[^/.]+$/, '');
          if (songTitleBadge) songTitleBadge.innerText = `🎹 ${currentTitle} (${parsedNotes.length} notes)`;
          if (rangeMode === 'autofit') applyRangeMode('autofit');
          else if (midiVisualizer) midiVisualizer.setNotes(midiEngine.notes, currentMinNote, currentMaxNote);
          updateTimelineUI(0, midiEngine.totalDurationSec);
          updatePresetDropdown(`hosted:${fileName}`);
        } catch (err) {
          alert(`MIDI Import Error: ${err.message}`);
          console.error('MIDI parse error:', err);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (lowerName.endsWith('.xml') || lowerName.endsWith('.musicxml')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          xmlEngine.parse(e.target.result);
          if (!xmlEngine.playableNotes || xmlEngine.playableNotes.length === 0) {
            alert('Warning: No playable musical notes found in this MusicXML file.');
            return;
          }
          saveAndHostMusicFile(file, e.target.result);
          setMode('xml', false);
          currentTitle = `${xmlEngine.composer || 'Library'} - ${xmlEngine.title || fileName}`;
          if (songTitleBadge) songTitleBadge.innerText = `🎼 ${currentTitle} (${xmlEngine.playableNotes.length} notes)`;
          if (scoreRenderer) scoreRenderer.setScore(xmlEngine);
          if (rangeMode === 'autofit') applyRangeMode('autofit');
          updateTimelineUI(0, xmlEngine.totalDurationSec);
          updatePresetDropdown(`hosted:${fileName}`);
        } catch (err) {
          alert(`MusicXML Import Error: ${err.message}`);
          console.error('MusicXML parse error:', err);
        }
      };
      reader.readAsText(file);
    } else {
      alert(t ? t('piano_invalid_file', 'Please import a valid .mid, .midi, .musicxml, or .xml file.') : 'Please import a valid .mid, .midi, .musicxml, or .xml file.');
    }
  };

  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileImport(e.target.files[0]);
      }
    });
  }

  if (dropzone) {
    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
      });
    });
    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileImport(e.dataTransfer.files[0]);
      }
    });
  }

  // Global window dropzone integration for music files
  window.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      const lower = f.name.toLowerCase();
      if (lower.endsWith('.mid') || lower.endsWith('.midi') || lower.endsWith('.musicxml') || lower.endsWith('.xml')) {
        handleFileImport(f);
      }
    }
  });

  // 8. Playback Sequencer Synchronization
  const getActiveEngine = () => activeMode === 'midi' ? midiEngine : xmlEngine;

  const updateTimelineUI = (curSec, totalSec) => {
    if (timelineSlider) {
      timelineSlider.max = Math.max(1, totalSec);
      timelineSlider.value = curSec;
    }
    if (timeLabel) {
      const formatTime = (s) => {
        const mins = Math.floor(s / 60);
        const secs = Math.floor(s % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      };
      timeLabel.innerText = `${formatTime(curSec)} / ${formatTime(totalSec)}`;
    }
  };

  // MIDI Event Hooks
  midiEngine.onNoteTrigger = (activeNotes, currentSec) => {
    clearAllHighlights();
    activeNotes.forEach(n => highlightKey(n.midiNote, true));
    if (midiVisualizer) midiVisualizer.updatePlaybackPosition(currentSec);
  };
  midiEngine.onTimeUpdate = (curSec, totalSec) => {
    updateTimelineUI(curSec, totalSec);
  };
  midiEngine.onPlaybackEnd = () => {
    clearAllHighlights();
    if (playBtn) playBtn.innerText = t ? t('piano_play', '▶ Play') : '▶ Play';
  };

  // MusicXML Event Hooks
  xmlEngine.onNoteTrigger = (activeNotes, currentSec, activeMeasureIndex) => {
    clearAllHighlights();
    activeNotes.forEach(n => highlightKey(n.midiNote, true));
    if (scoreRenderer) scoreRenderer.updatePlaybackPosition(currentSec, activeMeasureIndex, activeNotes);
  };
  xmlEngine.onTimeUpdate = (curSec, totalSec) => {
    updateTimelineUI(curSec, totalSec);
  };
  xmlEngine.onPlaybackEnd = () => {
    clearAllHighlights();
    if (playBtn) playBtn.innerText = t ? t('piano_play', '▶ Play') : '▶ Play';
  };

  // 9. Transport Control Handlers
  const togglePlay = () => {
    const engine = getActiveEngine();
    if (engine.isPlaying) {
      engine.pause();
      if (playBtn) playBtn.innerText = t ? t('piano_play', '▶ Play') : '▶ Play';
    } else {
      pianoAudio.setContext(audioCtx, masterGain);
      engine.play(pianoAudio);
      if (playBtn) playBtn.innerText = t ? t('piano_pause', '⏸ Pause') : '⏸ Pause';
    }
  };

  const stopPlayback = () => {
    const engine = getActiveEngine();
    engine.stop();
    clearAllHighlights();
    if (playBtn) playBtn.innerText = t ? t('piano_play', '▶ Play') : '▶ Play';
  };

  const seekTo = (timeSec) => {
    const engine = getActiveEngine();
    engine.seek(timeSec);
    if (activeMode === 'midi' && midiVisualizer) midiVisualizer.updatePlaybackPosition(timeSec);
    if (activeMode === 'xml' && scoreRenderer) scoreRenderer.updatePlaybackPosition(timeSec, 0, []);
  };

  if (playBtn) playBtn.addEventListener('click', togglePlay);
  if (stopBtn) stopBtn.addEventListener('click', stopPlayback);

  if (timelineSlider) {
    timelineSlider.addEventListener('input', () => {
      seekTo(parseFloat(timelineSlider.value) || 0);
    });
  }

  if (tempoSlider) {
    tempoSlider.addEventListener('input', () => {
      const mult = parseFloat(tempoSlider.value) || 1.0;
      if (tempoLabel) tempoLabel.innerText = `${mult.toFixed(2)}x`;
      midiEngine.setTempoMultiplier(mult);
      xmlEngine.setTempoMultiplier(mult);
    });
  }

  if (pianoVolSlider) {
    pianoVolSlider.addEventListener('input', () => {
      const vol = parseFloat(pianoVolSlider.value) || 0.85;
      if (pianoVolLabel) pianoVolLabel.innerText = `${Math.round(vol * 100)}%`;
      pianoAudio.setVolume(vol);
      currentSettings.pianoVolume = vol;
    });
    pianoVolSlider.addEventListener('change', () => {
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  if (loopCheck) {
    loopCheck.addEventListener('change', () => {
      midiEngine.isLooping = loopCheck.checked;
      xmlEngine.isLooping = loopCheck.checked;
    });
  }

  if (sustainCheck) {
    sustainCheck.addEventListener('change', () => {
      pianoAudio.setSustain(sustainCheck.checked);
    });
  }

  // 10. Initial Boot & Restore Saved File
  const savedRangeMode = currentSettings.pianoRangeMode || 'autofit';
  if (rangeSelect) rangeSelect.value = savedRangeMode;
  applyRangeMode(savedRangeMode);

  const savedVolume = currentSettings.pianoVolume !== undefined ? currentSettings.pianoVolume : 0.85;
  if (pianoVolSlider) pianoVolSlider.value = savedVolume;
  if (pianoVolLabel) pianoVolLabel.innerText = `${Math.round(savedVolume * 100)}%`;
  pianoAudio.setVolume(savedVolume);

  updatePresetDropdown();

  if (currentSettings.activeMusicFile) {
    const filePath = findMusicFile(currentSettings.activeMusicFile);
    if (filePath) {
      loadHostedFile(currentSettings.activeMusicFile);
    } else {
      setMode(currentSettings.pianoActiveMode || 'midi');
    }
  } else {
    setMode(currentSettings.pianoActiveMode || 'midi');
  }

  setTimeout(() => scrollToNote(60), 150);
}


