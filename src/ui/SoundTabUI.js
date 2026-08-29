/**
 * Sound Tab UI Controller & Visual Synchronizer
 * Handles real-time playback toggles, slider volume syncing, active card pulsing, and atmosphere auto-sync hooks.
 */

import { soundManager } from '../core/SoundManager.js';
import { setupPianoStudioUI } from './PianoStudioUI.js';

export function setupSoundTabUI(deps) {
  const { currentSettings, saveSettingsFile, t, fs, path, getAssetsPath, showSpeechBubble } = deps;
  // Elements
  const masterEnableCheck = document.getElementById('sound-master-enable');
  const masterVolSlider = document.getElementById('sound-master-vol');
  const valMasterVol = document.getElementById('val-sound-master-vol');

  const btnSnowPlay = document.getElementById('btn-sound-snow-play');
  const snowVolSlider = document.getElementById('sound-snow-vol');
  const valSnowVol = document.getElementById('val-sound-snow-vol');
  const snowCard = document.getElementById('sound-card-snow');
  const snowSyncCheck = document.getElementById('sound-snow-sync');

  const btnSakuraPlay = document.getElementById('btn-sound-sakura-play');
  const sakuraVolSlider = document.getElementById('sound-sakura-vol');
  const valSakuraVol = document.getElementById('val-sound-sakura-vol');
  const sakuraCard = document.getElementById('sound-card-sakura');
  const sakuraSyncCheck = document.getElementById('sound-sakura-sync');

  const btnDrumPlay = document.getElementById('btn-sound-drum-play');
  const drumVolSlider = document.getElementById('sound-drum-vol');
  const valDrumVol = document.getElementById('val-sound-drum-vol');
  const drumCard = document.getElementById('sound-card-drum');

  // Initial Sync from Settings
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

  if (snowVolSlider) {
    const vol = currentSettings.soundSnowVolume !== undefined ? currentSettings.soundSnowVolume : 0.7;
    snowVolSlider.value = vol;
    if (valSnowVol) valSnowVol.innerText = Math.round(vol * 100) + '%';
    soundManager.setTrackVolume('snow', vol);
  }

  if (snowSyncCheck) {
    snowSyncCheck.checked = currentSettings.soundSnowSync !== false;
  }

  if (sakuraVolSlider) {
    const vol = currentSettings.soundSakuraVolume !== undefined ? currentSettings.soundSakuraVolume : 0.7;
    sakuraVolSlider.value = vol;
    if (valSakuraVol) valSakuraVol.innerText = Math.round(vol * 100) + '%';
    soundManager.setTrackVolume('sakura', vol);
  }

  if (sakuraSyncCheck) {
    sakuraSyncCheck.checked = currentSettings.soundSakuraSync !== false;
  }

  if (drumVolSlider) {
    const vol = currentSettings.soundDrumVolume !== undefined ? currentSettings.soundDrumVolume : 0.7;
    drumVolSlider.value = vol;
    if (valDrumVol) valDrumVol.innerText = Math.round(vol * 100) + '%';
    soundManager.setTrackVolume('drum', vol);
  }

  // --- Event Listeners ---

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

  // Snow Track Controls
  if (btnSnowPlay) {
    btnSnowPlay.addEventListener('click', () => {
      soundManager.toggleSnow();
    });
  }
  if (snowVolSlider) {
    snowVolSlider.addEventListener('input', () => {
      const vol = parseFloat(snowVolSlider.value);
      if (valSnowVol) valSnowVol.innerText = Math.round(vol * 100) + '%';
      currentSettings.soundSnowVolume = vol;
      soundManager.setTrackVolume('snow', vol);
    });
    snowVolSlider.addEventListener('change', () => {
      if (saveSettingsFile) saveSettingsFile();
    });
  }
  if (snowSyncCheck) {
    snowSyncCheck.addEventListener('change', () => {
      currentSettings.soundSnowSync = snowSyncCheck.checked;
      soundManager.syncAtmosphere(currentSettings);
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  // Sakura Track Controls
  if (btnSakuraPlay) {
    btnSakuraPlay.addEventListener('click', () => {
      soundManager.toggleSakura();
    });
  }
  if (sakuraVolSlider) {
    sakuraVolSlider.addEventListener('input', () => {
      const vol = parseFloat(sakuraVolSlider.value);
      if (valSakuraVol) valSakuraVol.innerText = Math.round(vol * 100) + '%';
      currentSettings.soundSakuraVolume = vol;
      soundManager.setTrackVolume('sakura', vol);
    });
    sakuraVolSlider.addEventListener('change', () => {
      if (saveSettingsFile) saveSettingsFile();
    });
  }
  if (sakuraSyncCheck) {
    sakuraSyncCheck.addEventListener('change', () => {
      currentSettings.soundSakuraSync = sakuraSyncCheck.checked;
      soundManager.syncAtmosphere(currentSettings);
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  // Drum Track Controls
  if (btnDrumPlay) {
    btnDrumPlay.addEventListener('click', () => {
      soundManager.toggleDrum();
    });
  }
  if (drumVolSlider) {
    drumVolSlider.addEventListener('input', () => {
      const vol = parseFloat(drumVolSlider.value);
      if (valDrumVol) valDrumVol.innerText = Math.round(vol * 100) + '%';
      currentSettings.soundDrumVolume = vol;
      soundManager.setTrackVolume('drum', vol);
    });
    drumVolSlider.addEventListener('change', () => {
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  // UI State Updater from Sound Engine
  const updateUIFromSoundState = (snapshot) => {
    const playText = t ? t('sound_play', '▶ Play') : '▶ Play';
    const stopText = t ? t('sound_stop', '⏹ Stop') : '⏹ Stop';

    if (btnSnowPlay) {
      btnSnowPlay.innerText = snapshot.snowPlaying ? stopText : playText;
      btnSnowPlay.classList.toggle('active-playing', snapshot.snowPlaying);
    }
    if (snowCard) snowCard.classList.toggle('sound-card-playing', snapshot.snowPlaying);

    if (btnSakuraPlay) {
      btnSakuraPlay.innerText = snapshot.sakuraPlaying ? stopText : playText;
      btnSakuraPlay.classList.toggle('active-playing', snapshot.sakuraPlaying);
    }
    if (sakuraCard) sakuraCard.classList.toggle('sound-card-playing', snapshot.sakuraPlaying);

    if (btnDrumPlay) {
      btnDrumPlay.innerText = snapshot.drumPlaying ? stopText : playText;
      btnDrumPlay.classList.toggle('active-playing', snapshot.drumPlaying);
    }
    if (drumCard) drumCard.classList.toggle('sound-card-playing', snapshot.drumPlaying);
  };

  soundManager.onStateChange(updateUIFromSoundState);
  soundManager.syncAtmosphere(currentSettings);

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

