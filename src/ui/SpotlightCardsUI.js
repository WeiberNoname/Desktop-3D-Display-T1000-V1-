/**
 * Spotlight Cards UI Component
 * Renders spotlight configuration cards with unified Studio Primitives:
 * .studio-card, .studio-row, .studio-number-wrapper, .studio-switch, .studio-select
 */

export function hexToRgb(hex) {
  if (typeof hex !== 'string') hex = '#ffffff';
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  if (!/^[0-9A-Fa-f]{6}$/.test(c)) return { r: 255, g: 255, b: 255 };
  const num = parseInt(c, 16);
  if (isNaN(num)) return { r: 255, g: 255, b: 255 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export function rgbToHex(r, g, b) {
  const toHex = (n) => {
    const hex = Math.max(0, Math.min(255, Math.round(Number(n) || 0))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function renderSpotlightCardsUI({ currentSettings, addSpotlightBtn, updateSpotlightPosition, saveSettingsFile, t }) {
  const container = document.getElementById('spotlight-cards-container');
  if (!container) return;

  container.innerHTML = '';

  if (!Array.isArray(currentSettings.spotlights) || currentSettings.spotlights.length === 0) {
    currentSettings.spotlights = [
      { id: 1, enabled: true, angleH: 45, angleV: 60, cone: 35, intensity: 2.0, color: '#ffffff' }
    ];
  }

  if (addSpotlightBtn) {
    addSpotlightBtn.disabled = currentSettings.spotlights.length >= 10;
    addSpotlightBtn.style.opacity = currentSettings.spotlights.length >= 10 ? '0.5' : '1.0';
  }

  currentSettings.spotlights.forEach((spotConfig, idx) => {
    const card = document.createElement('div');
    card.className = 'studio-card spotlight-card';
    card.style.marginTop = '8px';
    const lightNum = idx + 1;

    card.innerHTML = `
      <div class="studio-card-header">
        <span class="studio-card-title">💡 Light #${lightNum}</span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <label class="studio-switch" title="Toggle Light">
            <input type="checkbox" id="spot-enable-${idx}" ${spotConfig.enabled ? 'checked' : ''}>
            <span class="studio-slider-knob"></span>
          </label>
          ${currentSettings.spotlights.length > 1 ? `<button id="spot-remove-${idx}" class="studio-btn-danger" style="padding: 2px 8px; font-size: 0.8em;">🗑️ Remove</button>` : ''}
        </div>
      </div>

      <div class="studio-row">
        <div class="studio-row-label">
          <label for="spot-h-${idx}" class="studio-row-title">${t('spotlight_angle_h')}</label>
          <span class="studio-row-sub">Azimuth angle (-180° to 180°)</span>
        </div>
        <div class="studio-number-wrapper">
          <input type="number" id="spot-h-${idx}" class="studio-number-input" min="-180" max="180" step="1" value="${spotConfig.angleH}">
          <span class="studio-unit-suffix">°</span>
        </div>
      </div>

      <div class="studio-row">
        <div class="studio-row-label">
          <label for="spot-v-${idx}" class="studio-row-title">${t('spotlight_angle_v')}</label>
          <span class="studio-row-sub">Elevation angle (0° to 90°)</span>
        </div>
        <div class="studio-number-wrapper">
          <input type="number" id="spot-v-${idx}" class="studio-number-input" min="0" max="90" step="1" value="${spotConfig.angleV}">
          <span class="studio-unit-suffix">°</span>
        </div>
      </div>

      <div class="studio-row">
        <div class="studio-row-label">
          <label for="spot-cone-${idx}" class="studio-row-title">${t('spotlight_cone')}</label>
          <span class="studio-row-sub">Beam spread cone (10° to 80°)</span>
        </div>
        <div class="studio-number-wrapper">
          <input type="number" id="spot-cone-${idx}" class="studio-number-input" min="10" max="80" step="1" value="${spotConfig.cone}">
          <span class="studio-unit-suffix">°</span>
        </div>
      </div>

      <div class="studio-row">
        <div class="studio-row-label">
          <label for="spot-int-${idx}" class="studio-row-title">${t('spotlight_intensity')}</label>
          <span class="studio-row-sub">Luminosity multiplier</span>
        </div>
        <div class="studio-number-wrapper">
          <input type="number" id="spot-int-${idx}" class="studio-number-input" min="0.0" max="10.0" step="0.1" value="${parseFloat(spotConfig.intensity).toFixed(1)}">
          <span class="studio-unit-suffix">x</span>
        </div>
      </div>

      <div class="studio-row">
        <div class="studio-row-label">
          <label for="spot-color-picker-${idx}" class="studio-row-title">${t('spotlight_color') || 'Spotlight Color'}</label>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <input type="color" id="spot-color-picker-${idx}" value="${spotConfig.color || '#ffffff'}" style="width: 28px; height: 24px; padding: 0; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; cursor: pointer; background: none;">
          <input type="text" id="spot-hex-text-${idx}" value="${(spotConfig.color || '#ffffff').toUpperCase()}" maxlength="7" style="width: 68px; font-family: monospace; font-size: 0.85em; padding: 3px 6px; text-transform: uppercase; background: #14151e; border: 1px solid rgba(255,255,255,0.12); color: #38bdf8; border-radius: 4px; text-align: center;">
        </div>
      </div>

      <div class="studio-row">
        <div class="studio-row-label">
          <label for="spot-color-${idx}" class="studio-row-title">Color Preset</label>
        </div>
        <select id="spot-color-${idx}" class="studio-select" style="width: 160px;">
          <option value="" disabled selected>-- Presets --</option>
          <option value="#ffffff">Pure White</option>
          <option value="#ffb703">Concert Warm Gold</option>
          <option value="#00f0ff">Cyberpunk Neon Cyan</option>
          <option value="#ff007f">Stage Pink</option>
          <option value="#ff0000">Laser Red</option>
          <option value="#a855f7">Vibrant Purple</option>
          <option value="#22c55e">Emerald Stage Green</option>
        </select>
      </div>
    `;

    container.appendChild(card);
    bindSpotlightCardListeners(card, spotConfig, idx, { currentSettings, addSpotlightBtn, updateSpotlightPosition, saveSettingsFile, t });
  });
}

function bindSpotlightCardListeners(card, spotConfig, idx, deps) {
  const enableCb = card.querySelector(`#spot-enable-${idx}`);
  const hInput = card.querySelector(`#spot-h-${idx}`);
  const vInput = card.querySelector(`#spot-v-${idx}`);
  const coneInput = card.querySelector(`#spot-cone-${idx}`);
  const intInput = card.querySelector(`#spot-int-${idx}`);
  const colorPicker = card.querySelector(`#spot-color-picker-${idx}`);
  const hexText = card.querySelector(`#spot-hex-text-${idx}`);
  const colorSelect = card.querySelector(`#spot-color-${idx}`);
  const removeBtn = card.querySelector(`#spot-remove-${idx}`);

  if (enableCb) {
    enableCb.addEventListener('change', () => {
      spotConfig.enabled = enableCb.checked;
      deps.updateSpotlightPosition();
    });
  }

  if (hInput) {
    hInput.addEventListener('input', () => {
      const val = parseInt(hInput.value, 10);
      if (!isNaN(val)) {
        spotConfig.angleH = val;
        deps.updateSpotlightPosition();
      }
    });
  }

  if (vInput) {
    vInput.addEventListener('input', () => {
      const val = parseInt(vInput.value, 10);
      if (!isNaN(val)) {
        spotConfig.angleV = val;
        deps.updateSpotlightPosition();
      }
    });
  }

  if (coneInput) {
    coneInput.addEventListener('input', () => {
      const val = parseInt(coneInput.value, 10);
      if (!isNaN(val)) {
        spotConfig.cone = val;
        deps.updateSpotlightPosition();
      }
    });
  }

  if (intInput) {
    intInput.addEventListener('input', () => {
      const val = parseFloat(intInput.value);
      if (!isNaN(val)) {
        spotConfig.intensity = val;
        deps.updateSpotlightPosition();
      }
    });
  }

  const updateAllColorUI = (newHex) => {
    spotConfig.color = newHex;
    if (colorPicker && colorPicker.value !== newHex) colorPicker.value = newHex;
    if (hexText && hexText.value !== newHex.toUpperCase()) hexText.value = newHex.toUpperCase();
    deps.updateSpotlightPosition();
  };

  if (colorPicker) colorPicker.addEventListener('input', () => updateAllColorUI(colorPicker.value));
  if (hexText) {
    hexText.addEventListener('input', () => {
      let val = hexText.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) updateAllColorUI(val);
    });
  }

  if (colorSelect) {
    colorSelect.addEventListener('change', () => {
      if (colorSelect.value) updateAllColorUI(colorSelect.value);
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      deps.currentSettings.spotlights.splice(idx, 1);
      renderSpotlightCardsUI(deps);
      deps.updateSpotlightPosition();
      deps.saveSettingsFile();
    });
  }
}
