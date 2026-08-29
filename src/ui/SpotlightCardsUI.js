/**
 * Spotlight Cards UI Component (<190 lines)
 * Renders spotlight configuration cards, sliders, color picker, and RGB inputs.
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
    card.className = 'spotlight-card';
    card.style.cssText = 'background: #252525; border: 1px solid #383838; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px;';
    const lightNum = idx + 1;

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" id="spot-enable-${idx}" ${spotConfig.enabled ? 'checked' : ''}>
          <label for="spot-enable-${idx}" style="font-weight: 600; font-size: 12px; margin: 0;">💡 Light #${lightNum}</label>
        </div>
        ${currentSettings.spotlights.length > 1 ? `<button id="spot-remove-${idx}" class="btn close" style="padding: 2px 6px; font-size: 10px; cursor: pointer; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171;">🗑️ Remove</button>` : ''}
      </div>
      <div class="setting-item">
        <label for="spot-h-${idx}"><span>${t('spotlight_angle_h')}</span>: <span id="val-spot-h-${idx}">${spotConfig.angleH}</span>°</label>
        <input type="range" id="spot-h-${idx}" min="-180" max="180" step="1" value="${spotConfig.angleH}">
      </div>
      <div class="setting-item">
        <label for="spot-v-${idx}"><span>${t('spotlight_angle_v')}</span>: <span id="val-spot-v-${idx}">${spotConfig.angleV}</span>°</label>
        <input type="range" id="spot-v-${idx}" min="0" max="90" step="1" value="${spotConfig.angleV}">
      </div>
      <div class="setting-item">
        <label for="spot-cone-${idx}"><span>${t('spotlight_cone')}</span>: <span id="val-spot-cone-${idx}">${spotConfig.cone}</span>°</label>
        <input type="range" id="spot-cone-${idx}" min="10" max="80" step="1" value="${spotConfig.cone}">
      </div>
      <div class="setting-item">
        <label for="spot-int-${idx}"><span>${t('spotlight_intensity')}</span>: <span id="val-spot-int-${idx}">${parseFloat(spotConfig.intensity).toFixed(2)}</span>x</label>
        <input type="range" id="spot-int-${idx}" min="0.0" max="5.0" step="0.1" value="${spotConfig.intensity}">
      </div>
      <div class="setting-item" style="flex-direction: column; align-items: stretch; gap: 4px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label style="margin: 0; font-weight: 600; font-size: 11px;">${t('spotlight_color') || 'Spotlight Color'}</label>
          <div style="display: flex; align-items: center; gap: 6px;">
            <input type="color" id="spot-color-picker-${idx}" value="${spotConfig.color || '#ffffff'}" style="width: 26px; height: 22px; padding: 0; border: 1px solid #555; border-radius: 4px; cursor: pointer; background: none;">
            <input type="text" id="spot-hex-text-${idx}" value="${(spotConfig.color || '#ffffff').toUpperCase()}" maxlength="7" style="width: 65px; font-family: monospace; font-size: 11px; padding: 2px 4px; text-transform: uppercase; background: #1a1a1a; border: 1px solid #444; color: #f39c12; border-radius: 3px; text-align: center;">
          </div>
        </div>
        <div style="display: flex; gap: 4px; margin-top: 2px;">
          <div style="flex: 1; display: flex; align-items: center; gap: 2px; background: rgba(239, 68, 68, 0.15); padding: 2px 4px; border-radius: 3px; border: 1px solid rgba(239, 68, 68, 0.3);">
            <span style="font-size: 10px; font-weight: bold; color: #f87171;">R</span>
            <input type="number" id="spot-rgb-r-${idx}" min="0" max="255" value="${hexToRgb(spotConfig.color || '#ffffff').r}" style="width: 100%; font-size: 10px; padding: 1px 2px; background: rgba(0,0,0,0.5); border: 1px solid rgba(239,68,68,0.4); color: #fff; border-radius: 2px; font-family: monospace;">
          </div>
          <div style="flex: 1; display: flex; align-items: center; gap: 2px; background: rgba(34, 197, 94, 0.15); padding: 2px 4px; border-radius: 3px; border: 1px solid rgba(34, 197, 94, 0.3);">
            <span style="font-size: 10px; font-weight: bold; color: #4ade80;">G</span>
            <input type="number" id="spot-rgb-g-${idx}" min="0" max="255" value="${hexToRgb(spotConfig.color || '#ffffff').g}" style="width: 100%; font-size: 10px; padding: 1px 2px; background: rgba(0,0,0,0.5); border: 1px solid rgba(34,197,94,0.4); color: #fff; border-radius: 2px; font-family: monospace;">
          </div>
          <div style="flex: 1; display: flex; align-items: center; gap: 2px; background: rgba(59, 130, 246, 0.15); padding: 2px 4px; border-radius: 3px; border: 1px solid rgba(59, 130, 246, 0.3);">
            <span style="font-size: 10px; font-weight: bold; color: #60a5fa;">B</span>
            <input type="number" id="spot-rgb-b-${idx}" min="0" max="255" value="${hexToRgb(spotConfig.color || '#ffffff').b}" style="width: 100%; font-size: 10px; padding: 1px 2px; background: rgba(0,0,0,0.5); border: 1px solid rgba(59,130,246,0.4); color: #fff; border-radius: 2px; font-family: monospace;">
          </div>
        </div>
        <div style="margin-top: 3px;">
          <select id="spot-color-${idx}" style="width: 100%; font-size: 10px; padding: 2px 4px; background: #1a1a1a; border: 1px solid #3d3d3d; color: #bbb; border-radius: 3px;">
            <option value="" disabled selected>-- Quick Presets --</option>
            <option value="#ffffff">Pure White (255, 255, 255)</option>
            <option value="#ffb703">Concert Warm Gold (255, 183, 3)</option>
            <option value="#00f0ff">Cyberpunk Neon Cyan (0, 240, 255)</option>
            <option value="#ff007f">Stage Pink (255, 0, 127)</option>
            <option value="#ff0000">Laser Red (255, 0, 0)</option>
            <option value="#a855f7">Vibrant Purple (168, 85, 247)</option>
            <option value="#22c55e">Emerald Stage Green (34, 197, 94)</option>
          </select>
        </div>
      </div>
    `;

    container.appendChild(card);
    bindSpotlightCardListeners(card, spotConfig, idx, { currentSettings, addSpotlightBtn, updateSpotlightPosition, saveSettingsFile, t });
  });
}

function bindSpotlightCardListeners(card, spotConfig, idx, deps) {
  const enableCb = card.querySelector(`#spot-enable-${idx}`);
  const hSlider = card.querySelector(`#spot-h-${idx}`);
  const vSlider = card.querySelector(`#spot-v-${idx}`);
  const coneSlider = card.querySelector(`#spot-cone-${idx}`);
  const intSlider = card.querySelector(`#spot-int-${idx}`);
  const colorPicker = card.querySelector(`#spot-color-picker-${idx}`);
  const hexText = card.querySelector(`#spot-hex-text-${idx}`);
  const inputR = card.querySelector(`#spot-rgb-r-${idx}`);
  const inputG = card.querySelector(`#spot-rgb-g-${idx}`);
  const inputB = card.querySelector(`#spot-rgb-b-${idx}`);
  const colorSelect = card.querySelector(`#spot-color-${idx}`);
  const removeBtn = card.querySelector(`#spot-remove-${idx}`);

  if (enableCb) enableCb.addEventListener('change', () => { spotConfig.enabled = enableCb.checked; deps.updateSpotlightPosition(); });
  if (hSlider) hSlider.addEventListener('input', () => { spotConfig.angleH = parseInt(hSlider.value, 10); card.querySelector(`#val-spot-h-${idx}`).innerText = hSlider.value; deps.updateSpotlightPosition(); });
  if (vSlider) vSlider.addEventListener('input', () => { spotConfig.angleV = parseInt(vSlider.value, 10); card.querySelector(`#val-spot-v-${idx}`).innerText = vSlider.value; deps.updateSpotlightPosition(); });
  if (coneSlider) coneSlider.addEventListener('input', () => { spotConfig.cone = parseInt(coneSlider.value, 10); card.querySelector(`#val-spot-cone-${idx}`).innerText = coneSlider.value; deps.updateSpotlightPosition(); });
  if (intSlider) intSlider.addEventListener('input', () => { spotConfig.intensity = parseFloat(intSlider.value); card.querySelector(`#val-spot-int-${idx}`).innerText = parseFloat(intSlider.value).toFixed(2); deps.updateSpotlightPosition(); });

  const updateAllColorUI = (newHex) => {
    spotConfig.color = newHex;
    const rgbVals = hexToRgb(newHex);
    if (colorPicker && colorPicker.value !== newHex) colorPicker.value = newHex;
    if (hexText && hexText.value !== newHex.toUpperCase()) hexText.value = newHex.toUpperCase();
    if (inputR && parseInt(inputR.value, 10) !== rgbVals.r) inputR.value = rgbVals.r;
    if (inputG && parseInt(inputG.value, 10) !== rgbVals.g) inputG.value = rgbVals.g;
    if (inputB && parseInt(inputB.value, 10) !== rgbVals.b) inputB.value = rgbVals.b;
    deps.updateSpotlightPosition();
  };

  if (colorPicker) colorPicker.addEventListener('input', () => updateAllColorUI(colorPicker.value));
  if (hexText) hexText.addEventListener('input', () => { let val = hexText.value.trim(); if (!val.startsWith('#')) val = '#' + val; if (/^#[0-9A-Fa-f]{6}$/.test(val)) updateAllColorUI(val); });

  const handleRgbChange = () => {
    const r = Math.max(0, Math.min(255, parseInt(inputR.value, 10) || 0));
    const g = Math.max(0, Math.min(255, parseInt(inputG.value, 10) || 0));
    const b = Math.max(0, Math.min(255, parseInt(inputB.value, 10) || 0));
    updateAllColorUI(rgbToHex(r, g, b));
  };

  if (inputR) inputR.addEventListener('input', handleRgbChange);
  if (inputG) inputG.addEventListener('input', handleRgbChange);
  if (inputB) inputB.addEventListener('input', handleRgbChange);
  if (colorSelect) colorSelect.addEventListener('change', () => { if (colorSelect.value) updateAllColorUI(colorSelect.value); });
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      deps.currentSettings.spotlights.splice(idx, 1);
      renderSpotlightCardsUI(deps);
      deps.updateSpotlightPosition();
      deps.saveSettingsFile();
    });
  }
}
