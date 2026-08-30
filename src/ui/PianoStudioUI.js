/**
 * Grand Piano Studio UI Controller
 * Orchestrates virtual piano keyboard rendering, waterfall visualizers,
 * file ingestion/hosting, and playback sequencing via dedicated domain modules.
 */

import { PianoAudioEngine } from '../core/PianoAudioEngine.js';
import { MidiParserEngine } from '../core/MidiParserEngine.js';
import { MusicXmlEngine } from '../core/MusicXmlEngine.js';
import { MusicScoreRenderer } from './MusicScoreRenderer.js';
import { PianoRollVisualizer } from './PianoRollVisualizer.js';
import { PianoKeyboardDOM } from './piano/PianoKeyboardDOM.js';
import { PianoFileManager } from './piano/PianoFileManager.js';
import { PianoPlaybackController } from './piano/PianoPlaybackController.js';
import { PianoRangeManager } from './piano/PianoRangeManager.js';
import { AssetRegistryManager } from '../managers/AssetRegistryManager.js';
import { eventBus } from '../managers/EventBus.js';

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

  // 1. Initialize Core Engines
  const pianoAudio = new PianoAudioEngine(audioCtx, masterGain);
  const midiEngine = new MidiParserEngine();
  const xmlEngine = new MusicXmlEngine();
  const registry = AssetRegistryManager.getInstance();

  // DOM Elements
  const pianoKeyboardContainer = document.getElementById('piano-keyboard-container');
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
  const songGrid = document.getElementById('piano-song-grid');

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
  let scoreRenderer = scoreCanvas ? new MusicScoreRenderer(scoreCanvas) : null;
  let midiVisualizer = midiCanvas ? new PianoRollVisualizer(midiCanvas, { minNote: 21, maxNote: 108 }) : null;

  if (scoreRenderer) {
    scoreRenderer.onSeekRequest = (timeSec) => playback.seek(timeSec);
  }

  // 2. Initialize Domain Modules
  const keyboardDOM = new PianoKeyboardDOM(pianoKeyboardContainer, (note, vel) => {
    pianoAudio.playNote(note, vel);
  });

  const rangeManager = new PianoRangeManager(pianoKeyboardContainer, (minNote, maxNote) => {
    keyboardDOM.render(minNote, maxNote);
    if (midiVisualizer) {
      midiVisualizer.setNotes(midiEngine.notes, minNote, maxNote);
    }
  });

  const fileManager = new PianoFileManager({ fs, path, getAssetsPath, showSpeechBubble, t });

  const playback = new PianoPlaybackController({
    pianoAudio,
    midiEngine,
    xmlEngine,
    t,
    onNoteTrigger: (activeNotes, currentSec, activeMeasureIndex) => {
      keyboardDOM.clearAllKeys();
      activeNotes.forEach(n => {
        keyboardDOM.setKeyPressed(n.midiNote, true);
        if (autoscrollCheck && autoscrollCheck.checked) {
          rangeManager.scrollToNote(n.midiNote);
        }
      });
      if (playback.activeMode === 'midi' && midiVisualizer) {
        midiVisualizer.updatePlaybackPosition(currentSec);
      }
      if (playback.activeMode === 'xml' && scoreRenderer) {
        scoreRenderer.updatePlaybackPosition(currentSec, activeMeasureIndex || 0, activeNotes);
      }
    },
    onTimeUpdate: (curSec, totalSec) => {
      if (timelineSlider) {
        timelineSlider.max = Math.max(1, totalSec);
        timelineSlider.value = curSec;
      }
      if (timeLabel) {
        const mins = Math.floor(curSec / 60);
        const secs = Math.floor(curSec % 60);
        const tMins = Math.floor(totalSec / 60);
        const tSecs = Math.floor(totalSec % 60);
        timeLabel.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs} / ${tMins}:${tSecs < 10 ? '0' : ''}${tSecs}`;
      }
    },
    onPlaybackEnd: () => {
      keyboardDOM.clearAllKeys();
      if (playBtn) playBtn.innerText = t ? t('piano_play', '▶ Play') : '▶ Play';
    }
  });

  // 3. Mode Switcher & Presets
  const setMode = (mode, autoLoadDefault = true) => {
    playback.stop();
    playback.activeMode = mode;
    currentSettings.pianoActiveMode = mode;
    if (modeMidiBtn) modeMidiBtn.classList.toggle('selected', mode === 'midi');
    if (modeXmlBtn) modeXmlBtn.classList.toggle('selected', mode === 'xml');
    if (modeMidiSection) modeMidiSection.style.display = mode === 'midi' ? 'block' : 'none';
    if (modeXmlSection) modeXmlSection.style.display = mode === 'xml' ? 'block' : 'none';

    eventBus.emit('piano:modeChanged', mode);

    if (autoLoadDefault) {
      loadPreset(mode === 'midi' ? 'fur_elise' : 'ode_to_joy');
    } else {
      renderSongGrid();
    }
  };

  // 4. Render Song Grid (Pure Selectable Music Cards)
  const renderSongGrid = () => {
    if (!songGrid) return;
    songGrid.innerHTML = '';

    const activeSongKey = currentSettings.activeMusicFile
      ? `hosted:${currentSettings.activeMusicFile}`
      : (currentSettings.activePresetKey || (playback.activeMode === 'midi' ? 'fur_elise' : 'ode_to_joy'));

    // 4.1 Built-in Classical Masterpieces
    const presets = [
      { key: 'fur_elise', type: 'midi', ext: 'MIDI', icon: '🎹', title: 'Für Elise', composer: 'Beethoven', bg: 'radial-gradient(circle at center, rgba(245,158,11,0.3) 0%, #141418 70%)', color: '#fbbf24' },
      { key: 'minuet_in_g', type: 'midi', ext: 'MIDI', icon: '🎹', title: 'Minuet in G', composer: 'J.S. Bach', bg: 'radial-gradient(circle at center, rgba(245,158,11,0.3) 0%, #141418 70%)', color: '#fbbf24' },
      { key: 'ode_to_joy', type: 'xml', ext: 'XML', icon: '🎼', title: 'Ode to Joy', composer: 'Beethoven', bg: 'radial-gradient(circle at center, rgba(56,189,248,0.3) 0%, #141418 70%)', color: '#38bdf8' },
      { key: 'twinkle', type: 'xml', ext: 'XML', icon: '🎼', title: 'Twinkle Variations', composer: 'Mozart', bg: 'radial-gradient(circle at center, rgba(56,189,248,0.3) 0%, #141418 70%)', color: '#38bdf8' }
    ];

    presets.forEach(p => {
      const isSelected = activeSongKey === p.key;
      const card = document.createElement('div');
      card.className = `studio-select-card piano-song-card ${isSelected ? 'selected' : ''}`;
      card.dataset.songKey = p.key;
      card.innerHTML = `
        <div class="studio-select-thumb asset-thumbnail-wrapper" style="background: ${p.bg};">
          <div style="font-size: 1.9em; filter: drop-shadow(0 0 8px ${p.color});">${p.icon}</div>
          <span class="asset-ext-badge" style="color: ${p.color}; border-color: ${p.color}66; background: ${p.color}22; margin-top: 4px;">.${p.ext}</span>
        </div>
        <div class="studio-select-label asset-card-label">${p.title}</div>
        <div class="studio-select-sub asset-card-sub">${p.composer}</div>
      `;
      card.addEventListener('click', () => {
        loadPreset(p.key);
      });
      songGrid.appendChild(card);
    });

    // 4.2 User Hosted & Ingested Files
    const hostedFiles = fileManager.scanHostedFiles();
    const registeredAudio = registry ? registry.getAssets('audio') : [];

    const allCustom = new Map();
    hostedFiles.forEach(f => allCustom.set(f, { name: f, isHosted: true }));
    registeredAudio.forEach(a => {
      if (!allCustom.has(a.name)) {
        allCustom.set(a.name, { name: a.name, asset: a });
      }
    });

    allCustom.forEach((item, fName) => {
      const isSelected = activeSongKey === `hosted:${fName}`;
      const lower = fName.toLowerCase();
      const isMidi = lower.endsWith('.mid') || lower.endsWith('.midi');
      const isXml = lower.endsWith('.xml') || lower.endsWith('.musicxml');
      const icon = isMidi ? '🎹' : (isXml ? '🎼' : '🎵');
      const ext = isMidi ? 'MIDI' : (isXml ? 'XML' : 'AUDIO');
      const color = isMidi ? '#fbbf24' : '#38bdf8';
      const bg = isMidi
        ? 'radial-gradient(circle at center, rgba(245,158,11,0.25) 0%, #141418 70%)'
        : 'radial-gradient(circle at center, rgba(56,189,248,0.25) 0%, #141418 70%)';

      const card = document.createElement('div');
      card.className = `studio-select-card piano-song-card ${isSelected ? 'selected' : ''}`;
      card.dataset.songKey = `hosted:${fName}`;
      card.innerHTML = `
        <div class="studio-select-thumb asset-thumbnail-wrapper" style="background: ${bg};">
          <div style="font-size: 1.9em; filter: drop-shadow(0 0 8px ${color});">${icon}</div>
          <span class="asset-ext-badge" style="color: ${color}; border-color: ${color}66; background: ${color}22; margin-top: 4px;">.${ext}</span>
        </div>
        <div class="studio-select-label asset-card-label" title="${fName}">${fName.replace(/\.[^/.]+$/, '')}</div>
        <div class="studio-select-sub asset-card-sub">Local Score</div>
      `;

      card.addEventListener('click', () => {
        if (item.isHosted) {
          loadHostedFile(fName);
        } else if (item.asset && item.asset.file) {
          handleFileImport(item.asset.file);
        }
      });

      songGrid.appendChild(card);
    });

    const songCountEl = document.getElementById('piano-song-count');
    if (songCountEl) {
      songCountEl.innerText = `${presets.length + allCustom.size} Scores`;
    }
  };

  const loadHostedFile = (fileName) => {
    const fullPath = fileManager.findMusicFile(fileName);
    if (!fullPath || !fs) return;

    playback.stop();
    const lower = fileName.toLowerCase();

    if (lower.endsWith('.mid') || lower.endsWith('.midi')) {
      const buffer = fs.readFileSync(fullPath);
      const parsedNotes = midiEngine.parse(buffer);
      setMode('midi', false);
      const title = fileName.replace(/\.[^/.]+$/, '');
      if (songTitleBadge) songTitleBadge.innerText = `🎹 ${title} (${parsedNotes.length} notes)`;
      rangeManager.calculateRange(currentSettings.pianoRangeMode || 'autofit', midiEngine.notes);
    } else if (lower.endsWith('.xml') || lower.endsWith('.musicxml')) {
      const xmlText = fs.readFileSync(fullPath, 'utf8');
      xmlEngine.parse(xmlText);
      setMode('xml', false);
      const title = `${xmlEngine.composer || 'Library'} - ${xmlEngine.title || fileName}`;
      if (songTitleBadge) songTitleBadge.innerText = `🎼 ${title} (${xmlEngine.playableNotes.length} notes)`;
      if (scoreRenderer) scoreRenderer.setScore(xmlEngine);
      rangeManager.calculateRange(currentSettings.pianoRangeMode || 'autofit', xmlEngine.playableNotes);
    }

    currentSettings.activeMusicFile = fileName;
    if (saveSettingsFile) saveSettingsFile();
    renderSongGrid();
  };

  const loadPreset = (presetKey) => {
    playback.stop();
    if (presetKey.startsWith('hosted:')) {
      loadHostedFile(presetKey.replace(/^hosted:/, ''));
      return;
    }

    currentSettings.activeMusicFile = '';
    currentSettings.activePresetKey = presetKey;
    if (saveSettingsFile) saveSettingsFile();

    if (presetKey === 'fur_elise' || presetKey === 'minuet_in_g' || presetKey === 'bach_minuet') {
      playback.activeMode = 'midi';
      if (modeMidiBtn) modeMidiBtn.classList.toggle('selected', true);
      if (modeXmlBtn) modeXmlBtn.classList.toggle('selected', false);
      if (modeMidiSection) modeMidiSection.style.display = 'block';
      if (modeXmlSection) modeXmlSection.style.display = 'none';

      const parsed = MidiParserEngine.getPresetMidi(presetKey);
      midiEngine.notes = parsed.notes;
      midiEngine.totalDurationSec = parsed.totalDurationSec;
      const title = (presetKey === 'minuet_in_g' || presetKey === 'bach_minuet') ? 'Bach - Minuet in G' : 'Beethoven - Für Elise';
      if (songTitleBadge) songTitleBadge.innerText = `🎹 ${title}`;
      rangeManager.calculateRange(currentSettings.pianoRangeMode || 'autofit', midiEngine.notes);
    } else {
      playback.activeMode = 'xml';
      if (modeMidiBtn) modeMidiBtn.classList.toggle('selected', false);
      if (modeXmlBtn) modeXmlBtn.classList.toggle('selected', true);
      if (modeMidiSection) modeMidiSection.style.display = 'none';
      if (modeXmlSection) modeXmlSection.style.display = 'block';

      const parsed = MusicXmlEngine.getPresetXml(presetKey);
      xmlEngine.title = parsed.title;
      xmlEngine.composer = parsed.composer;
      xmlEngine.measures = parsed.measures;
      xmlEngine.playableNotes = parsed.playableNotes;
      xmlEngine.totalDurationSec = parsed.totalDurationSec;
      if (songTitleBadge) songTitleBadge.innerText = `🎼 ${parsed.composer} - ${parsed.title}`;
      if (scoreRenderer) scoreRenderer.setScore(xmlEngine);
      rangeManager.calculateRange(currentSettings.pianoRangeMode || 'autofit', xmlEngine.playableNotes);
    }
    renderSongGrid();
  };

  // 5. File Ingestion & Drag Drop
  const handleFileImport = (file) => {
    if (!file) return;
    const fileName = file.name;
    const lower = fileName.toLowerCase();

    if (lower.endsWith('.mid') || lower.endsWith('.midi')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const notes = midiEngine.parse(e.target.result);
          if (!notes || notes.length === 0) return alert('No playable notes in MIDI');
          fileManager.saveAndHostFile(file, e.target.result);
          setMode('midi', false);
          if (songTitleBadge) songTitleBadge.innerText = `🎹 ${fileName} (${notes.length} notes)`;
          rangeManager.calculateRange(currentSettings.pianoRangeMode || 'autofit', midiEngine.notes);
          renderSongGrid();
        } catch (err) { alert(`MIDI Error: ${err.message}`); }
      };
      reader.readAsArrayBuffer(file);
    } else if (lower.endsWith('.xml') || lower.endsWith('.musicxml')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          xmlEngine.parse(e.target.result);
          if (!xmlEngine.playableNotes || xmlEngine.playableNotes.length === 0) return alert('No playable notes in MusicXML');
          fileManager.saveAndHostFile(file, e.target.result);
          setMode('xml', false);
          if (songTitleBadge) songTitleBadge.innerText = `🎼 ${xmlEngine.title || fileName}`;
          if (scoreRenderer) scoreRenderer.setScore(xmlEngine);
          rangeManager.calculateRange(currentSettings.pianoRangeMode || 'autofit', xmlEngine.playableNotes);
          renderSongGrid();
        } catch (err) { alert(`MusicXML Error: ${err.message}`); }
      };
      reader.readAsText(file);
    }
  };

  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) handleFileImport(e.target.files[0]);
    });
  }

  if (dropzone) {
    ['dragenter', 'dragover'].forEach(n => dropzone.addEventListener(n, (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); }));
    ['dragleave', 'drop'].forEach(n => dropzone.addEventListener(n, (e) => { e.preventDefault(); dropzone.classList.remove('drag-over'); }));
    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) handleFileImport(e.dataTransfer.files[0]);
    });
  }

  // 6. Wire Transport Listeners
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      const isPlaying = playback.togglePlay(audioCtx, masterGain);
      playBtn.innerText = isPlaying ? (t ? t('piano_pause', '⏸ Pause') : '⏸ Pause') : (t ? t('piano_play', '▶ Play') : '▶ Play');
    });
  }

  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      playback.stop();
      keyboardDOM.clearAllKeys();
      if (playBtn) playBtn.innerText = t ? t('piano_play', '▶ Play') : '▶ Play';
    });
  }

  if (timelineSlider) {
    timelineSlider.addEventListener('input', () => {
      playback.seek(parseFloat(timelineSlider.value) || 0);
    });
  }

  if (tempoSlider) {
    tempoSlider.addEventListener('input', () => {
      const mult = parseFloat(tempoSlider.value) || 1.0;
      if (tempoLabel) tempoLabel.innerText = `${mult.toFixed(2)}x`;
      playback.setTempo(mult);
    });
  }

  if (pianoVolSlider) {
    pianoVolSlider.addEventListener('input', () => {
      const vol = parseFloat(pianoVolSlider.value) || 0.85;
      if (pianoVolLabel) pianoVolLabel.innerText = `${Math.round(vol * 100)}%`;
      playback.setVolume(vol);
      currentSettings.pianoVolume = vol;
    });
    pianoVolSlider.addEventListener('change', () => {
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  if (loopCheck) {
    loopCheck.addEventListener('change', () => playback.setLoop(loopCheck.checked));
  }
  if (sustainCheck) {
    sustainCheck.addEventListener('change', () => playback.setSustain(sustainCheck.checked));
  }

  if (rangeSelect) {
    rangeSelect.addEventListener('change', () => {
      currentSettings.pianoRangeMode = rangeSelect.value;
      rangeManager.calculateRange(rangeSelect.value, playback.activeMode === 'midi' ? midiEngine.notes : xmlEngine.playableNotes);
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  if (presetSelect) {
    presetSelect.addEventListener('change', () => loadPreset(presetSelect.value));
  }

  if (modeMidiBtn) modeMidiBtn.addEventListener('click', () => setMode('midi', true));
  if (modeXmlBtn) modeXmlBtn.addEventListener('click', () => setMode('xml', true));

  if (btnOctaveBass) btnOctaveBass.addEventListener('click', () => rangeManager.scrollToNote(36));
  if (btnOctaveMid) btnOctaveMid.addEventListener('click', () => rangeManager.scrollToNote(60));
  if (btnOctaveTreble) btnOctaveTreble.addEventListener('click', () => rangeManager.scrollToNote(84));
  if (btnOctaveLeft) btnOctaveLeft.addEventListener('click', () => rangeManager.scrollByOffset(-160));
  if (btnOctaveRight) btnOctaveRight.addEventListener('click', () => rangeManager.scrollByOffset(160));

  // 7. EventBus & Registry Listeners
  if (registry) {
    registry.subscribe(() => renderSongGrid());
  }
  eventBus.on('audio:*', () => renderSongGrid());
  eventBus.on('instrument:selected', (inst) => {
    if (inst === 'piano' || inst === 'sheet') {
      setMode(inst === 'piano' ? 'midi' : 'xml', false);
    }
  });

  // 8. Initial Boot
  const initRange = currentSettings.pianoRangeMode || 'autofit';
  if (rangeSelect) rangeSelect.value = initRange;
  rangeManager.calculateRange(initRange);

  if (currentSettings.activeMusicFile) {
    loadHostedFile(currentSettings.activeMusicFile);
  } else if (currentSettings.activePresetKey) {
    loadPreset(currentSettings.activePresetKey);
  } else {
    setMode(currentSettings.pianoActiveMode || 'midi');
  }

  renderSongGrid();
  setTimeout(() => rangeManager.scrollToNote(60), 150);
}
