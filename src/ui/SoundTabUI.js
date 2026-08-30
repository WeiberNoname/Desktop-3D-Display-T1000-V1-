/**
 * Sound Tab UI Controller & Visual Synchronizer
 * Handles real-time playback toggles, slider volume syncing, active card selection, and atmosphere auto-sync hooks.
 */

import { soundManager } from '../core/SoundManager.js';
import { setupPianoStudioUI } from './PianoStudioUI.js';

export function setupSoundTabUI(deps) {
  const { currentSettings, saveSettingsFile, t, fs, path, getAssetsPath, showSpeechBubble } = deps;

  // Master Elements
  const masterEnableCheck = document.getElementById('sound-master-enable');
  const masterVolSlider = document.getElementById('sound-master-vol');
  const valMasterVol = document.getElementById('val-sound-master-vol');

  // Track Cards
  const grid = document.getElementById('sound-synth-grid');
  const snowCard = document.getElementById('sound-card-snow');
  const sakuraCard = document.getElementById('sound-card-sakura');
  const drumCard = document.getElementById('sound-card-drum');

  // Shared Reusable Track Controls
  const soundEditorTitle = document.getElementById('sound-editor-title');
  const btnActivePlay = document.getElementById('btn-sound-active-play');
  const activeVolSlider = document.getElementById('sound-active-vol');
  const activeFxCheck = document.getElementById('sound-active-fx');
  const activeSyncCheck = document.getElementById('sound-active-sync');
  const soundActiveOptions = document.getElementById('sound-active-options');

  let selectedTrack = 'snow'; // 'snow' | 'sakura' | 'drum'

  // Master Initial Sync
  if (masterEnableCheck) {
    const isMuted = currentSettings.soundMuted === true;
    masterEnableCheck.checked = !isMuted;
    soundManager.setMuted(isMuted);
  }

  if (masterVolSlider) {
    const vol = currentSettings.soundMasterVolume !== undefined ? currentSettings.soundMasterVolume : 0.8;
    masterVolSlider.value = vol;
    if (valMasterVol) valMasterVol.innerText = Math.round(vol * 100) + '%';
    soundManager.setMasterVolume(vol);
  }

  // Sync Shared Editor with currently selected track
  const syncSharedEditor = () => {
    const isSnow = selectedTrack === 'snow';
    const isSakura = selectedTrack === 'sakura';
    const isDrum = selectedTrack === 'drum';

    if (soundEditorTitle) {
      if (isSnow) soundEditorTitle.textContent = '❄️ Selected Track: Snow Wind';
      else if (isSakura) soundEditorTitle.textContent = '🌸 Selected Track: Sakura Melody';
      else if (isDrum) soundEditorTitle.textContent = '🥁 Selected Track: Lo-Fi Drum';
    }

    if (activeVolSlider) {
      if (isSnow) activeVolSlider.value = currentSettings.soundSnowVolume !== undefined ? currentSettings.soundSnowVolume : 0.7;
      else if (isSakura) activeVolSlider.value = currentSettings.soundSakuraVolume !== undefined ? currentSettings.soundSakuraVolume : 0.7;
      else if (isDrum) activeVolSlider.value = currentSettings.soundDrumVolume !== undefined ? currentSettings.soundDrumVolume : 0.7;
    }

    if (soundActiveOptions) {
      soundActiveOptions.style.display = isDrum ? 'none' : 'flex';
    }

    if (activeFxCheck) {
      if (isSnow) activeFxCheck.checked = currentSettings.snowFall !== false;
      else if (isSakura) activeFxCheck.checked = currentSettings.sakuraRain !== false;
    }

    if (activeSyncCheck) {
      if (isSnow) activeSyncCheck.checked = currentSettings.soundSnowSync !== false;
      else if (isSakura) activeSyncCheck.checked = currentSettings.soundSakuraSync !== false;
    }

    updatePlayButtonState();
  };

  const updatePlayButtonState = () => {
    if (!btnActivePlay) return;
    const playText = t ? t('sound_play', '▶ Play') : '▶ Play';
    const stopText = t ? t('sound_stop', '⏹ Stop') : '⏹ Stop';

    const snap = soundManager.getSnapshot ? soundManager.getSnapshot() : {};
    let isPlaying = false;
    if (selectedTrack === 'snow') isPlaying = !!snap.snowPlaying;
    else if (selectedTrack === 'sakura') isPlaying = !!snap.sakuraPlaying;
    else if (selectedTrack === 'drum') isPlaying = !!snap.drumPlaying;

    btnActivePlay.innerText = isPlaying ? stopText : playText;
    btnActivePlay.className = isPlaying ? 'studio-btn-danger' : 'studio-btn-primary';
  };

  // Card Selection Listeners
  const selectTrack = (track) => {
    selectedTrack = track;
    if (grid) {
      grid.querySelectorAll('.sound-synth-card').forEach(c => {
        c.classList.toggle('selected', c.getAttribute('data-track') === track);
      });
    }
    syncSharedEditor();
  };

  if (snowCard) snowCard.addEventListener('click', () => selectTrack('snow'));
  if (sakuraCard) sakuraCard.addEventListener('click', () => selectTrack('sakura'));
  if (drumCard) drumCard.addEventListener('click', () => selectTrack('drum'));

  // Reusable Play Button
  if (btnActivePlay) {
    btnActivePlay.addEventListener('click', () => {
      if (selectedTrack === 'snow') soundManager.toggleSnow();
      else if (selectedTrack === 'sakura') soundManager.toggleSakura();
      else if (selectedTrack === 'drum') soundManager.toggleDrum();
      updatePlayButtonState();
    });
  }

  // Reusable Volume Slider
  if (activeVolSlider) {
    activeVolSlider.addEventListener('input', () => {
      const vol = parseFloat(activeVolSlider.value);
      if (selectedTrack === 'snow') {
        currentSettings.soundSnowVolume = vol;
        soundManager.setTrackVolume('snow', vol);
      } else if (selectedTrack === 'sakura') {
        currentSettings.soundSakuraVolume = vol;
        soundManager.setTrackVolume('sakura', vol);
      } else if (selectedTrack === 'drum') {
        currentSettings.soundDrumVolume = vol;
        soundManager.setTrackVolume('drum', vol);
      }
    });
    activeVolSlider.addEventListener('change', () => {
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  // Reusable FX and Sync
  if (activeFxCheck) {
    activeFxCheck.addEventListener('change', () => {
      if (selectedTrack === 'snow') {
        currentSettings.snowFall = activeFxCheck.checked;
        const snowFxEl = document.getElementById('snow-fall');
        if (snowFxEl) snowFxEl.checked = activeFxCheck.checked;
      } else if (selectedTrack === 'sakura') {
        currentSettings.sakuraRain = activeFxCheck.checked;
        const sakuraFxEl = document.getElementById('sakura-rain');
        if (sakuraFxEl) sakuraFxEl.checked = activeFxCheck.checked;
      }
      soundManager.syncAtmosphere(currentSettings);
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  if (activeSyncCheck) {
    activeSyncCheck.addEventListener('change', () => {
      if (selectedTrack === 'snow') {
        currentSettings.soundSnowSync = activeSyncCheck.checked;
      } else if (selectedTrack === 'sakura') {
        currentSettings.soundSakuraSync = activeSyncCheck.checked;
      }
      soundManager.syncAtmosphere(currentSettings);
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  // Master Audio Toggle
  if (masterEnableCheck) {
    masterEnableCheck.addEventListener('change', () => {
      const enabled = masterEnableCheck.checked;
      currentSettings.soundMuted = !enabled;
      soundManager.setMuted(!enabled);
      soundManager.syncAtmosphere(currentSettings);
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  // Master Volume Slider
  if (masterVolSlider) {
    masterVolSlider.addEventListener('input', () => {
      const vol = parseFloat(masterVolSlider.value);
      if (valMasterVol) valMasterVol.innerText = Math.round(vol * 100) + '%';
      currentSettings.soundMasterVolume = vol;
      soundManager.setMasterVolume(vol);
    });
    masterVolSlider.addEventListener('change', () => {
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  // UI State Updater from Sound Engine
  const updateUIFromSoundState = (snapshot) => {
    updatePlayButtonState();

    const subSnow = document.getElementById('sub-sound-snow');
    const badgeSnow = document.getElementById('badge-sound-snow');
    if (subSnow) subSnow.textContent = snapshot.snowPlaying ? '🟢 Playing' : 'Winter Ambience';
    if (badgeSnow) badgeSnow.textContent = snapshot.snowPlaying ? 'PLAYING' : '.SYNTH';

    const subSakura = document.getElementById('sub-sound-sakura');
    const badgeSakura = document.getElementById('badge-sound-sakura');
    if (subSakura) subSakura.textContent = snapshot.sakuraPlaying ? '🟢 Playing' : 'Spring Bells';
    if (badgeSakura) badgeSakura.textContent = snapshot.sakuraPlaying ? 'PLAYING' : '.SYNTH';

    const subDrum = document.getElementById('sub-sound-drum');
    const badgeDrum = document.getElementById('badge-sound-drum');
    if (subDrum) subDrum.textContent = snapshot.drumPlaying ? '🟢 Playing' : 'Rhythm Beat';
    if (badgeDrum) badgeDrum.textContent = snapshot.drumPlaying ? 'PLAYING' : '.SYNTH';
  };

  soundManager.onStateChange(updateUIFromSoundState);
  soundManager.syncAtmosphere(currentSettings);
  syncSharedEditor();

  // Setup Virtual Piano & Sheet Music Studio
  setupPianoStudioUI({
    currentSettings,
    saveSettingsFile,
    t,
    fs,
    path,
    getAssetsPath,
    showSpeechBubble,
    audioCtx: soundManager.getAudioContext(),
    masterGain: soundManager.getMasterGain()
  });
}
