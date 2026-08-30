/**
 * Settings UI Event Listeners Module (<180 lines)
 * Encapsulates DOM element queries, live slider value label updates, studio preset triggers,
 * gear/close button hover states, and settings header window drag listeners.
 */

import { setupDiagnosticsUI } from './SettingsDiagnosticsUI.js';
import { setupSettingsPanelResize } from './SettingsPanelResizeHandler.js';
import { soundManager } from '../core/SoundManager.js';
import { setSelectedSpotlightIndex } from './SpotlightCardsUI.js';

export function setupSettingsUI(deps) {
  const {
    currentSettings,
    ipcRenderer,
    t,
    showSpeechBubble,
    updateSpotlightPosition,
    updateStageLighting,
    saveSettingsFile,
    syncSlidersUI,
    populateModelDropdown,
    populateAnimationDropdown,
    forceRefreshAllPreviews,
    renderSpotlightCardsUI,
    setupStudioTabs,
    handleSaveSettings,
    resetCameraAndPosition,
    state
  } = deps;

  const gearBtn = document.getElementById('settings-btn');
  const panel = document.getElementById('settings-panel');
  const langSelect = document.getElementById('lang-select');
  const widthSlider = document.getElementById('win-width');
  const heightSlider = document.getElementById('win-height');
  const scaleSlider = document.getElementById('model-scale');
  const bobbingCheck = document.getElementById('model-bobbing');

  const spinXCheck = document.getElementById('spin-x');
  const spinYCheck = document.getElementById('spin-y');
  const spinZCheck = document.getElementById('spin-z');

  const speedXSlider = document.getElementById('speed-x');
  const speedYSlider = document.getElementById('speed-y');
  const speedZSlider = document.getElementById('speed-z');
  const targetFpsSlider = document.getElementById('target-fps');
  const numTargetFps = document.getElementById('num-target-fps');
  const valTargetFps = document.getElementById('val-target-fps');

  const gpuOptimizeCheck = document.getElementById('gpu-optimize');
  const mouseOptimizeCheck = document.getElementById('mouse-optimize');
  const settingsLeftCheck = document.getElementById('settings-left');
  const lockPositionCheck = document.getElementById('lock-position');
  const viewOnlyCheck = document.getElementById('view-only');
  const enablePhysicsCheck = document.getElementById('enable-physics');
  const physicsFloorCheck = document.getElementById('physics-floor');
  const physicsGravitySlider = document.getElementById('physics-gravity');
  const physicsElasticitySlider = document.getElementById('physics-elasticity');
  const valPhysicsGravity = document.getElementById('val-physics-gravity');
  const valPhysicsElasticity = document.getElementById('val-physics-elasticity');
  const modelSelect = document.getElementById('model-select');
  const animSelect = document.getElementById('anim-select');

  const valWidth = document.getElementById('val-width');
  const valHeight = document.getElementById('val-height');
  const valScale = document.getElementById('val-scale');

  const valSpeedX = document.getElementById('val-speed-x');
  const valSpeedY = document.getElementById('val-speed-y');
  const valSpeedZ = document.getElementById('val-speed-z');

  const fontScaleSlider = document.getElementById('font-scale');
  const valFontScale = document.getElementById('val-font-scale');

  const enableStudioLightsCheck = document.getElementById('enable-studio-lights');
  const ambientIntensitySlider = document.getElementById('ambient-intensity');
  const valAmbientIntensity = document.getElementById('val-ambient-intensity');
  const btnDarkStage = document.getElementById('btn-dark-stage');
  const btnDualConcert = document.getElementById('btn-dual-concert');
  const addSpotlightBtn = document.getElementById('add-spotlight-btn');

  if (setupStudioTabs) setupStudioTabs();

  if (addSpotlightBtn) {
    addSpotlightBtn.addEventListener('click', () => {
      if (!Array.isArray(currentSettings.spotlights)) currentSettings.spotlights = [];
      if (currentSettings.spotlights.length >= 10) {
        if (showSpeechBubble) showSpeechBubble(t('max_spotlights_reached'), 2000);
        return;
      }
      const nextNum = currentSettings.spotlights.length + 1;
      const defaultColors = ['#ffffff', '#ffb703', '#00f0ff', '#ff007f', '#a855f7', '#22c55e', '#ef4444', '#3b82f6', '#eab308', '#ec4899'];
      const nextColor = defaultColors[(nextNum - 1) % defaultColors.length];
      const defaultAngles = [45, -135, -45, 135, 0, 90, -90, 180, 60, -120];
      const nextAngleH = defaultAngles[(nextNum - 1) % defaultAngles.length];

      currentSettings.spotlights.push({
        id: nextNum,
        enabled: true,
        angleH: nextAngleH,
        angleV: 55,
        cone: 35,
        intensity: 2.0,
        color: nextColor
      });
      setSelectedSpotlightIndex(currentSettings.spotlights.length - 1);
      if (renderSpotlightCardsUI) renderSpotlightCardsUI();
      if (updateSpotlightPosition) updateSpotlightPosition();
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  const refreshPreviewsBtn = document.getElementById('refresh-previews-btn');
  if (refreshPreviewsBtn) {
    refreshPreviewsBtn.addEventListener('click', () => {
      if (forceRefreshAllPreviews) forceRefreshAllPreviews();
    });
  }

  const closeBtn = document.getElementById('app-close-btn');
  const updateHoverState = (overUI) => {
    state.isMouseOverUI = overUI;
    if (deps.updateIgnoreMouseState) deps.updateIgnoreMouseState();
  };

  if (gearBtn) {
    gearBtn.style.display = 'flex';
    gearBtn.addEventListener('mouseenter', () => updateHoverState(true));
    gearBtn.addEventListener('mouseleave', () => updateHoverState(false));
  }

  if (closeBtn) {
    closeBtn.style.display = 'flex';
    closeBtn.addEventListener('mouseenter', () => updateHoverState(true));
    closeBtn.addEventListener('mouseleave', () => updateHoverState(false));
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      ipcRenderer.send('close-app');
    });
  }

  const detectEdge = setupSettingsPanelResize({
    panel,
    currentSettings,
    ipcRenderer,
    saveSettingsFile,
    widthSlider,
    heightSlider,
    valWidth,
    valHeight,
    camera: deps.camera,
    renderer: deps.renderer,
    state
  });

  const settingsHeader = document.getElementById('settings-header');
  if (settingsHeader) {
    settingsHeader.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || currentSettings.lockPosition || (state && state.isResizingPanel)) return;
      if (detectEdge && detectEdge(e)) return;
      state.isDragging = true;
      state.dragStartScreenX = e.screenX;
      state.dragStartScreenY = e.screenY;
      state.dragMoveDistance = 0;
      settingsHeader.style.cursor = 'grabbing';
      document.body.style.cursor = 'grabbing';
      if (deps.updateIgnoreMouseState) deps.updateIgnoreMouseState();
    });
  }

  if (widthSlider) widthSlider.max = window.screen.width;
  if (heightSlider) heightSlider.max = window.screen.height;

  if (modelSelect) {
    modelSelect.addEventListener('change', () => {
      const newModel = modelSelect.value;
      currentSettings.activeModel = newModel;
      currentSettings.activeAnimation = 'default';
      if (saveSettingsFile) saveSettingsFile();

      if (newModel === 'procedural') {
        if (deps.fallbackToProcedural) deps.fallbackToProcedural();
      } else if (newModel === 'flag') {
        if (deps.loadFlagModel) deps.loadFlagModel();
      } else if (deps.loadCustomModel) {
        const regAsset = window.__assetRegistryManager ? window.__assetRegistryManager.getAssets('model').find(a => a.name === newModel || a.id === newModel) : null;
        if (regAsset && (regAsset.objectUrl || regAsset.file)) {
          deps.loadCustomModel(regAsset.objectUrl);
        } else if (deps.getAssetsPath && deps.path) {
          const fullPath = deps.path.join(deps.getAssetsPath(), newModel);
          deps.loadCustomModel(fullPath);
        }
      }
      if (populateAnimationDropdown) populateAnimationDropdown();
    });
  }

  if (animSelect) {
    animSelect.addEventListener('change', () => {
      currentSettings.activeAnimation = animSelect.value;
      if (deps.applySelectedAnimation) deps.applySelectedAnimation();
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  const bindSliderInput = (elem, valElem, format = (v) => v) => {
    if (elem && valElem) elem.addEventListener('input', () => { valElem.innerText = format(elem.value); });
  };
  bindSliderInput(widthSlider, valWidth);
  bindSliderInput(heightSlider, valHeight);
  bindSliderInput(scaleSlider, valScale, (v) => parseFloat(v).toFixed(2));
  bindSliderInput(speedXSlider, valSpeedX, (v) => parseFloat(v).toFixed(1));
  bindSliderInput(speedYSlider, valSpeedY, (v) => parseFloat(v).toFixed(1));
  bindSliderInput(speedZSlider, valSpeedZ, (v) => parseFloat(v).toFixed(1));
  bindSliderInput(physicsGravitySlider, valPhysicsGravity, (v) => parseFloat(v).toFixed(1));
  bindSliderInput(physicsElasticitySlider, valPhysicsElasticity, (v) => parseFloat(v).toFixed(2));

  if (targetFpsSlider) {
    targetFpsSlider.addEventListener('input', () => {
      const val = parseInt(targetFpsSlider.value, 10);
      if (valTargetFps) valTargetFps.innerText = val;
      if (numTargetFps) numTargetFps.value = val;
      currentSettings.targetFps = val;
    });
  }

  if (numTargetFps) {
    numTargetFps.addEventListener('input', () => {
      let val = parseInt(numTargetFps.value, 10);
      if (isNaN(val)) return;
      val = Math.max(15, Math.min(240, val));
      if (valTargetFps) valTargetFps.innerText = val;
      if (targetFpsSlider) targetFpsSlider.value = val;
      currentSettings.targetFps = val;
    });
  }

  if (enableStudioLightsCheck) {
    enableStudioLightsCheck.addEventListener('change', () => {
      currentSettings.enableStudioLights = enableStudioLightsCheck.checked;
      if (updateStageLighting) updateStageLighting();
    });
  }
  if (ambientIntensitySlider && valAmbientIntensity) {
    ambientIntensitySlider.addEventListener('input', () => {
      currentSettings.ambientIntensity = parseFloat(ambientIntensitySlider.value);
      valAmbientIntensity.innerText = parseFloat(ambientIntensitySlider.value).toFixed(2);
      if (updateStageLighting) updateStageLighting();
    });
  }

  const sakuraRainCheck = document.getElementById('sakura-rain');
  if (sakuraRainCheck) {
    sakuraRainCheck.addEventListener('change', () => {
      currentSettings.sakuraRain = sakuraRainCheck.checked;
      soundManager.syncAtmosphere(currentSettings);
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  const snowFallCheck = document.getElementById('snow-fall');
  if (snowFallCheck) {
    snowFallCheck.addEventListener('change', () => {
      currentSettings.snowFall = snowFallCheck.checked;
      soundManager.syncAtmosphere(currentSettings);
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  const activatePreset = (intensity, spotlights, bubbleText, duration) => {
    currentSettings.enableStudioLights = true;
    currentSettings.ambientIntensity = intensity;
    currentSettings.spotlights = spotlights;
    if (syncSlidersUI) syncSlidersUI();
    if (saveSettingsFile) saveSettingsFile();
    if (showSpeechBubble) showSpeechBubble(bubbleText, duration);
  };

  if (btnDarkStage) {
    btnDarkStage.addEventListener('click', () => activatePreset(
      0.05,
      Array.isArray(currentSettings.spotlights) && currentSettings.spotlights.length > 0
        ? currentSettings.spotlights.map(s => ({ ...s, enabled: true }))
        : [{ id: 1, enabled: true, angleH: 45, angleV: 60, cone: 35, intensity: 2.5, color: '#ffffff' }],
      "🎭 Dark Stage Mode Activated!",
      2000
    ));
  }
  if (btnDualConcert) {
    btnDualConcert.addEventListener('click', () => activatePreset(
      0.10,
      [
        { id: 1, enabled: true, angleH: 45, angleV: 55, cone: 35, intensity: 2.5, color: '#ffb703' },
        { id: 2, enabled: true, angleH: -135, angleV: 45, cone: 30, intensity: 2.2, color: '#00f0ff' }
      ],
      "🎸 Concert Dual Spotlight Activated!",
      2200
    ));
  }

  if (fontScaleSlider) {
    fontScaleSlider.addEventListener('input', () => {
      const scale = parseFloat(fontScaleSlider.value);
      if (!isNaN(scale)) {
        if (valFontScale) valFontScale.innerText = scale.toFixed(2);
        if (panel) panel.style.setProperty('--panel-font-scale', scale);
      }
    });
  }

  const closeSettings = () => {
    state.isSettingsOpen = false;
    if (panel) panel.classList.add('hidden');
    if (updateSpotlightPosition) updateSpotlightPosition();
    soundManager.syncAtmosphere(currentSettings);
    ipcRenderer.send('set-ignore-mouse', true);
  };

  if (gearBtn) {
    gearBtn.addEventListener('click', () => {
      if (state.dragMoveDistance >= 8) return;
      if (state.isSettingsOpen) {
        if (syncSlidersUI) syncSlidersUI();
        closeSettings();
      } else {
        state.isSettingsOpen = true;
        if (populateModelDropdown) populateModelDropdown();
        if (syncSlidersUI) syncSlidersUI();
        if (panel) panel.classList.remove('hidden');
        ipcRenderer.send('set-ignore-mouse', false);
      }
    });
  }

  const panelCloseBtn = document.getElementById('close-btn');
  if (panelCloseBtn) {
    panelCloseBtn.addEventListener('click', () => {
      if (syncSlidersUI) syncSlidersUI();
      closeSettings();
    });
  }

  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      if (handleSaveSettings) await handleSaveSettings(closeSettings);
    });
  }

  const disableClickThrough = () => ipcRenderer.send('set-ignore-mouse', false);
  if (gearBtn) gearBtn.addEventListener('mouseenter', disableClickThrough);
  if (closeBtn) closeBtn.addEventListener('mouseenter', disableClickThrough);
  if (panel) panel.addEventListener('mouseenter', disableClickThrough);

  setupDiagnosticsUI({ ipcRenderer, showSpeechBubble, resetCameraAndPosition });
}
