/**
 * Atmosphere & Ambient Weather Tab UI Controller
 * Handles particle system selection, audio atmosphere synchronizer,
 * and unified file holder standard for weather effects.
 */

import { eventBus } from '../managers/EventBus.js';

export function setupAtmosphereTabUI(deps) {
  const { currentSettings, saveSettingsFile, t, showSpeechBubble, sakuraRainManager, snowFallManager } = deps;

  const masterEnableCheck = document.getElementById('atmosphere-master-enable');
  const soundSyncCheck = document.getElementById('atmosphere-sound-sync');
  const grid = document.getElementById('atmosphere-select-grid');

  const getActiveWeatherMode = () => {
    const isSakura = currentSettings.sakuraRain !== false;
    const isSnow = currentSettings.snowFall === true;
    if (isSakura && isSnow) return 'both';
    if (isSakura) return 'sakura';
    if (isSnow) return 'snow';
    return 'none';
  };

  const updateCardSelection = (mode) => {
    if (!grid) return;
    grid.querySelectorAll('.weather-card').forEach(card => {
      card.classList.toggle('selected', card.getAttribute('data-weather') === mode);
    });
  };

  const applyWeather = (mode, notify = false) => {
    if (mode === 'sakura') {
      currentSettings.sakuraRain = true;
      currentSettings.snowFall = false;
    } else if (mode === 'snow') {
      currentSettings.sakuraRain = false;
      currentSettings.snowFall = true;
    } else if (mode === 'both') {
      currentSettings.sakuraRain = true;
      currentSettings.snowFall = true;
    } else if (mode === 'none') {
      currentSettings.sakuraRain = false;
      currentSettings.snowFall = false;
    }

    if (sakuraRainManager) sakuraRainManager.setEnabled(currentSettings.sakuraRain);
    if (snowFallManager) snowFallManager.setEnabled(currentSettings.snowFall);

    if (masterEnableCheck) {
      masterEnableCheck.checked = mode !== 'none';
    }

    updateCardSelection(mode);
    eventBus.emit('atmosphere:changed', { mode, settings: currentSettings });

    if (saveSettingsFile) saveSettingsFile();

    if (notify && showSpeechBubble) {
      const names = {
        sakura: '🌸 Sakura Petal Rain Active!',
        snow: '❄️ Winter Snowfall Active!',
        both: '🌸❄️ Sakura & Snow Storm Active!',
        none: '☀️ Weather Cleared (Calm Skies)'
      };
      showSpeechBubble(names[mode] || 'Weather updated');
    }
  };

  // Card Clicks
  if (grid) {
    grid.querySelectorAll('.weather-card').forEach(card => {
      card.addEventListener('click', () => {
        const mode = card.getAttribute('data-weather');
        applyWeather(mode, true);
      });
    });
  }

  // Master Switch
  if (masterEnableCheck) {
    const isEnabled = currentSettings.sakuraRain !== false || currentSettings.snowFall === true;
    masterEnableCheck.checked = isEnabled;
    masterEnableCheck.addEventListener('change', () => {
      if (masterEnableCheck.checked) {
        applyWeather('sakura', true);
      } else {
        applyWeather('none', true);
      }
    });
  }

  // Audio Sync Switch
  if (soundSyncCheck) {
    soundSyncCheck.checked = currentSettings.soundSnowSync !== false;
    soundSyncCheck.addEventListener('change', () => {
      const sync = soundSyncCheck.checked;
      currentSettings.soundSnowSync = sync;
      currentSettings.soundSakuraSync = sync;
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  // Listen to external weather updates (from AI Director or Sound Manager)
  eventBus.on('weather:updated', () => {
    updateCardSelection(getActiveWeatherMode());
  });

  // Initial Sync
  updateCardSelection(getActiveWeatherMode());
}
