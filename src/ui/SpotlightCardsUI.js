/**
 * Spotlight Cards UI Component
 * Renders spotlights and lighting presets using the unified Asset Hub standard selection grid
 * with a single shared reusable settings editor panel.
 */

let selectedSpotlightIdx = 0;
let activePresetId = null;

const LIGHTING_PRESETS = [
  {
    id: 'preset_dark_stage',
    name: 'Dark Stage',
    icon: '🎭',
    ambientIntensity: 0.05,
    sub: 'Dramatic • 1 Spot',
    gradient: 'radial-gradient(circle at center, rgba(147, 51, 234, 0.45) 0%, #141418 70%)',
    spotlights: [
      { id: 1, enabled: true, angleH: 45, angleV: 60, cone: 35, intensity: 2.5, color: '#ffffff' }
    ]
  },
  {
    id: 'preset_dual_concert',
    name: 'Dual Concert',
    icon: '🎸',
    ambientIntensity: 0.10,
    sub: 'Gold & Cyan Spots',
    gradient: 'radial-gradient(circle at center, rgba(245, 158, 11, 0.4) 0%, rgba(6, 182, 212, 0.35) 50%, #141418 80%)',
    spotlights: [
      { id: 1, enabled: true, angleH: 45, angleV: 55, cone: 35, intensity: 2.5, color: '#ffb703' },
      { id: 2, enabled: true, angleH: -135, angleV: 45, cone: 30, intensity: 2.2, color: '#00f0ff' }
    ]
  },
  {
    id: 'preset_studio_solo',
    name: 'Studio Solo',
    icon: '✨',
    ambientIntensity: 0.70,
    sub: 'Balanced Studio',
    gradient: 'radial-gradient(circle at center, rgba(56, 189, 248, 0.4) 0%, #141418 70%)',
    spotlights: [
      { id: 1, enabled: true, angleH: 45, angleV: 60, cone: 35, intensity: 2.0, color: '#ffffff' }
    ]
  }
];

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

export function renderSpotlightCardsUI(deps = {}) {
  const {
    currentSettings,
    addSpotlightBtn,
    updateSpotlightPosition,
    updateStageLighting,
    saveSettingsFile,
    showSpeechBubble,
    t = (k, f) => f
  } = deps;

  const container = document.getElementById('spotlight-cards-container');
  if (!container) return;

  if (!Array.isArray(currentSettings.spotlights) || currentSettings.spotlights.length === 0) {
    currentSettings.spotlights = [
      { id: 1, enabled: true, angleH: 45, angleV: 60, cone: 35, intensity: 2.0, color: '#ffffff' }
    ];
  }

  if (selectedSpotlightIdx >= currentSettings.spotlights.length) {
    selectedSpotlightIdx = Math.max(0, currentSettings.spotlights.length - 1);
  }

  if (addSpotlightBtn) {
    addSpotlightBtn.disabled = currentSettings.spotlights.length >= 10;
    addSpotlightBtn.style.opacity = currentSettings.spotlights.length >= 10 ? '0.5' : '1.0';
  }

  container.innerHTML = `
    <!-- Standardized Light Selection Grid (Asset Hub Standard) -->
    <div id="spotlight-grid" class="studio-select-grid" style="grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); max-height: 180px;"></div>

    <!-- Single Shared Reusable Light Setting Panel -->
    <div id="spotlight-editor-panel" style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.12);">
      <div class="studio-card-header" style="margin-bottom: 6px;">
        <span id="spot-editor-title" class="studio-card-title" style="font-size: 0.92em; color: #38bdf8;">💡 Light #${selectedSpotlightIdx + 1} Configuration</span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <label class="studio-switch" title="Toggle Light On/Off">
            <input type="checkbox" id="spot-editor-enable">
            <span class="studio-slider-knob"></span>
          </label>
        </div>
      </div>

      <div class="studio-row">
        <div class="studio-row-label">
          <label for="spot-editor-h" class="studio-row-title">${t('spotlight_angle_h', 'Horizontal Orbit Angle')}</label>
          <span class="studio-row-sub">Azimuth angle (-180° to 180°)</span>
        </div>
        <div class="studio-number-wrapper">
          <input type="number" id="spot-editor-h" class="studio-number-input" min="-180" max="180" step="1">
          <span class="studio-unit-suffix">°</span>
        </div>
      </div>

      <div class="studio-row">
        <div class="studio-row-label">
          <label for="spot-editor-v" class="studio-row-title">${t('spotlight_angle_v', 'Vertical Elevation Angle')}</label>
          <span class="studio-row-sub">Elevation angle (0° to 90°)</span>
        </div>
        <div class="studio-number-wrapper">
          <input type="number" id="spot-editor-v" class="studio-number-input" min="0" max="90" step="1">
          <span class="studio-unit-suffix">°</span>
        </div>
      </div>

      <div class="studio-row">
        <div class="studio-row-label">
          <label for="spot-editor-cone" class="studio-row-title">${t('spotlight_cone', 'Beam Cone Angle')}</label>
          <span class="studio-row-sub">Beam spread cone (10° to 80°)</span>
        </div>
        <div class="studio-number-wrapper">
          <input type="number" id="spot-editor-cone" class="studio-number-input" min="10" max="80" step="1">
          <span class="studio-unit-suffix">°</span>
        </div>
      </div>

      <div class="studio-row">
        <div class="studio-row-label">
          <label for="spot-editor-int" class="studio-row-title">${t('spotlight_intensity', 'Spotlight Intensity')}</label>
          <span class="studio-row-sub">Luminosity multiplier</span>
        </div>
        <div class="studio-number-wrapper">
          <input type="number" id="spot-editor-int" class="studio-number-input" min="0.0" max="10.0" step="0.1">
          <span class="studio-unit-suffix">x</span>
        </div>
      </div>

      <div class="studio-row">
        <div class="studio-row-label">
          <label for="spot-editor-color-picker" class="studio-row-title">${t('spotlight_color', 'Spotlight Color')}</label>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <input type="color" id="spot-editor-color-picker" style="width: 28px; height: 24px; padding: 0; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; cursor: pointer; background: none;">
          <input type="text" id="spot-editor-hex-text" maxlength="7" style="width: 68px; font-family: monospace; font-size: 0.85em; padding: 3px 6px; text-transform: uppercase; background: #14151e; border: 1px solid rgba(255,255,255,0.12); color: #38bdf8; border-radius: 4px; text-align: center;">
        </div>
      </div>

      <div class="studio-row">
        <div class="studio-row-label">
          <label for="spot-editor-color-preset" class="studio-row-title">Color Preset</label>
        </div>
        <select id="spot-editor-color-preset" class="studio-select" style="width: 160px;">
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
    </div>
  `;

  const grid = container.querySelector('#spotlight-grid');
  const editorTitle = container.querySelector('#spot-editor-title');
  const editorEnable = container.querySelector('#spot-editor-enable');
  const editorH = container.querySelector('#spot-editor-h');
  const editorV = container.querySelector('#spot-editor-v');
  const editorCone = container.querySelector('#spot-editor-cone');
  const editorInt = container.querySelector('#spot-editor-int');
  const editorColorPicker = container.querySelector('#spot-editor-color-picker');
  const editorHexText = container.querySelector('#spot-editor-hex-text');
  const editorColorPreset = container.querySelector('#spot-editor-color-preset');

  // Populate Grid Cards (Asset Hub standard)
  const populateGrid = () => {
    grid.innerHTML = '';

    // 1. Render Preset Cards
    LIGHTING_PRESETS.forEach(preset => {
      const card = document.createElement('div');
      const isSelected = activePresetId === preset.id;
      card.className = `studio-select-card lighting-card ${isSelected ? 'selected' : ''}`;
      card.setAttribute('data-preset-id', preset.id);

      card.innerHTML = `
        <div class="studio-select-thumb asset-thumbnail-wrapper" style="background: ${preset.gradient};">
          <div style="font-size: 2em; filter: drop-shadow(0 0 8px rgba(255,255,255,0.4));">${preset.icon}</div>
          <span class="asset-ext-badge" style="color: #38bdf8; border-color: rgba(56,189,248,0.4); background: rgba(56,189,248,0.15); margin-top: 4px;">
            .PRESET
          </span>
        </div>
        <div class="studio-select-label asset-card-label">${preset.icon} ${preset.name}</div>
        <div class="studio-select-sub asset-card-sub">${isSelected ? '🟢 Active' : preset.sub}</div>
      `;

      card.addEventListener('click', () => {
        activePresetId = preset.id;
        currentSettings.enableStudioLights = true;
        currentSettings.ambientIntensity = preset.ambientIntensity;
        currentSettings.spotlights = JSON.parse(JSON.stringify(preset.spotlights));
        selectedSpotlightIdx = 0;

        const ambientSlider = document.getElementById('ambient-intensity');
        if (ambientSlider) ambientSlider.value = preset.ambientIntensity;
        const enableStudioCheck = document.getElementById('enable-studio-lights');
        if (enableStudioCheck) enableStudioCheck.checked = true;

        if (updateStageLighting) updateStageLighting();
        if (updateSpotlightPosition) updateSpotlightPosition();
        if (saveSettingsFile) saveSettingsFile();
        if (showSpeechBubble) showSpeechBubble(`Applied Lighting Preset: ${preset.name}`);

        populateGrid();
        syncEditorPanel();
      });

      grid.appendChild(card);
    });

    // 2. Render Custom Spotlight Cards
    currentSettings.spotlights.forEach((spotConfig, idx) => {
      const card = document.createElement('div');
      const isSelected = !activePresetId && idx === selectedSpotlightIdx;
      card.className = `studio-select-card spotlight-card ${isSelected ? 'selected' : ''}`;
      card.setAttribute('data-idx', idx);

      const colorHex = spotConfig.color || '#ffffff';
      const isEnabled = spotConfig.enabled !== false;

      card.innerHTML = `
        <div class="studio-select-thumb asset-thumbnail-wrapper" style="background: radial-gradient(circle at center, ${colorHex}33 0%, #141418 70%);">
          <div style="font-size: 2em; filter: drop-shadow(0 0 8px ${colorHex});">${isEnabled ? '💡' : '🌑'}</div>
          <span class="asset-ext-badge" style="color: ${colorHex}; border-color: ${colorHex}55; background: ${colorHex}18; margin-top: 4px;">
            ${isEnabled ? 'ACTIVE' : 'OFF'}
          </span>
          ${currentSettings.spotlights.length > 1 ? `<button class="asset-card-del-btn" data-action="delete" data-idx="${idx}" title="Remove Light">×</button>` : ''}
        </div>
        <div class="studio-select-label asset-card-label">💡 Light #${idx + 1}</div>
        <div class="studio-select-sub asset-card-sub">${spotConfig.angleH}° • ${spotConfig.angleV}° • ${parseFloat(spotConfig.intensity || 2.0).toFixed(1)}x</div>
      `;

      const delBtn = card.querySelector('[data-action="delete"]');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          currentSettings.spotlights.splice(idx, 1);
          if (selectedSpotlightIdx >= currentSettings.spotlights.length) {
            selectedSpotlightIdx = Math.max(0, currentSettings.spotlights.length - 1);
          }
          activePresetId = null;
          renderSpotlightCardsUI(deps);
          if (updateSpotlightPosition) updateSpotlightPosition();
          if (saveSettingsFile) saveSettingsFile();
        });
      }

      card.addEventListener('click', () => {
        activePresetId = null;
        selectedSpotlightIdx = idx;
        grid.querySelectorAll('.studio-select-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        syncEditorPanel();
      });

      grid.appendChild(card);
    });
  };

  // Sync Shared Editor with currently selected light
  const syncEditorPanel = () => {
    const activeSpot = currentSettings.spotlights[selectedSpotlightIdx];
    if (!activeSpot) return;

    if (editorTitle) editorTitle.textContent = `💡 Light #${selectedSpotlightIdx + 1} Configuration`;
    if (editorEnable) editorEnable.checked = activeSpot.enabled !== false;
    if (editorH) editorH.value = activeSpot.angleH !== undefined ? activeSpot.angleH : 45;
    if (editorV) editorV.value = activeSpot.angleV !== undefined ? activeSpot.angleV : 60;
    if (editorCone) editorCone.value = activeSpot.cone !== undefined ? activeSpot.cone : 35;
    if (editorInt) editorInt.value = parseFloat(activeSpot.intensity !== undefined ? activeSpot.intensity : 2.0).toFixed(1);
    if (editorColorPicker) editorColorPicker.value = activeSpot.color || '#ffffff';
    if (editorHexText) editorHexText.value = (activeSpot.color || '#ffffff').toUpperCase();
    if (editorColorPreset) editorColorPreset.value = '';
  };

  // Editor Input Handlers
  if (editorEnable) {
    editorEnable.addEventListener('change', () => {
      const activeSpot = currentSettings.spotlights[selectedSpotlightIdx];
      if (activeSpot) {
        activePresetId = null;
        activeSpot.enabled = editorEnable.checked;
        populateGrid();
        if (updateSpotlightPosition) updateSpotlightPosition();
        if (saveSettingsFile) saveSettingsFile();
      }
    });
  }

  if (editorH) {
    editorH.addEventListener('input', () => {
      const activeSpot = currentSettings.spotlights[selectedSpotlightIdx];
      const val = parseInt(editorH.value, 10);
      if (activeSpot && !isNaN(val)) {
        activePresetId = null;
        activeSpot.angleH = val;
        populateGrid();
        if (updateSpotlightPosition) updateSpotlightPosition();
      }
    });
    editorH.addEventListener('change', () => { if (saveSettingsFile) saveSettingsFile(); });
  }

  if (editorV) {
    editorV.addEventListener('input', () => {
      const activeSpot = currentSettings.spotlights[selectedSpotlightIdx];
      const val = parseInt(editorV.value, 10);
      if (activeSpot && !isNaN(val)) {
        activePresetId = null;
        activeSpot.angleV = val;
        populateGrid();
        if (updateSpotlightPosition) updateSpotlightPosition();
      }
    });
    editorV.addEventListener('change', () => { if (saveSettingsFile) saveSettingsFile(); });
  }

  if (editorCone) {
    editorCone.addEventListener('input', () => {
      const activeSpot = currentSettings.spotlights[selectedSpotlightIdx];
      const val = parseInt(editorCone.value, 10);
      if (activeSpot && !isNaN(val)) {
        activePresetId = null;
        activeSpot.cone = val;
        if (updateSpotlightPosition) updateSpotlightPosition();
      }
    });
    editorCone.addEventListener('change', () => { if (saveSettingsFile) saveSettingsFile(); });
  }

  if (editorInt) {
    editorInt.addEventListener('input', () => {
      const activeSpot = currentSettings.spotlights[selectedSpotlightIdx];
      const val = parseFloat(editorInt.value);
      if (activeSpot && !isNaN(val)) {
        activePresetId = null;
        activeSpot.intensity = val;
        populateGrid();
        if (updateSpotlightPosition) updateSpotlightPosition();
      }
    });
    editorInt.addEventListener('change', () => { if (saveSettingsFile) saveSettingsFile(); });
  }

  const applyColor = (newHex) => {
    const activeSpot = currentSettings.spotlights[selectedSpotlightIdx];
    if (activeSpot) {
      activePresetId = null;
      activeSpot.color = newHex;
      if (editorColorPicker && editorColorPicker.value !== newHex) editorColorPicker.value = newHex;
      if (editorHexText && editorHexText.value !== newHex.toUpperCase()) editorHexText.value = newHex.toUpperCase();
      populateGrid();
      if (updateSpotlightPosition) updateSpotlightPosition();
      if (saveSettingsFile) saveSettingsFile();
    }
  };

  if (editorColorPicker) editorColorPicker.addEventListener('input', () => applyColor(editorColorPicker.value));
  if (editorHexText) {
    editorHexText.addEventListener('input', () => {
      let val = editorHexText.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) applyColor(val);
    });
  }

  if (editorColorPreset) {
    editorColorPreset.addEventListener('change', () => {
      if (editorColorPreset.value) applyColor(editorColorPreset.value);
    });
  }

  populateGrid();
  syncEditorPanel();
}

export function setSelectedSpotlightIndex(idx) {
  selectedSpotlightIdx = idx;
  activePresetId = null;
}
