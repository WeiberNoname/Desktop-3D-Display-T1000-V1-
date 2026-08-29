/**
 * Settings Save & Commit Handler Module (<130 lines)
 * Handles applying form setting modifications, physics reconfiguration,
 * mascot model swapping, camera distance Z framing, and Electron window resizing.
 */

import { soundManager } from '../core/SoundManager.js';

export async function handleSaveSettings(deps) {
  const {
    currentSettings,
    langSelect,
    changeLanguage,
    enableStudioLightsCheck,
    ambientIntensitySlider,
    updateStageLighting,
    updateSpotlightPosition,
    widthSlider,
    heightSlider,
    scaleSlider,
    bobbingCheck,
    spinXCheck,
    spinYCheck,
    spinZCheck,
    speedXSlider,
    speedYSlider,
    speedZSlider,
    gpuOptimizeCheck,
    mouseOptimizeCheck,
    settingsLeftCheck,
    lockPositionCheck,
    viewOnlyCheck,
    enablePhysicsCheck,
    physicsFloorCheck,
    physicsGravitySlider,
    physicsElasticitySlider,
    modelSelect,
    animSelect,
    fontScaleSlider,
    physicsEngine,
    saveSettingsFile,
    state,
    THREE,
    camera,
    renderer,
    path,
    getAssetsPath,
    ipcRenderer,
    fallbackToProcedural,
    loadCustomModel,
    applySelectedAnimation,
    updateGearPosition,
    updateXYZVisibility,
    populateModelDropdown,
    closeSettings
  } = deps;

  if (langSelect && langSelect.value !== currentSettings.language) {
    currentSettings.language = langSelect.value;
    if (changeLanguage) await changeLanguage(currentSettings.language);
    if (populateModelDropdown) populateModelDropdown();
  }

  if (enableStudioLightsCheck) currentSettings.enableStudioLights = enableStudioLightsCheck.checked;
  if (ambientIntensitySlider) currentSettings.ambientIntensity = parseFloat(ambientIntensitySlider.value);

  if (updateStageLighting) updateStageLighting();
  if (updateSpotlightPosition) updateSpotlightPosition();

  currentSettings.width = parseInt(widthSlider.value, 10);
  currentSettings.height = parseInt(heightSlider.value, 10);
  currentSettings.scale = parseFloat(scaleSlider.value);
  currentSettings.bobbing = bobbingCheck.checked;

  currentSettings.spinX = spinXCheck.checked;
  currentSettings.spinY = spinYCheck.checked;
  currentSettings.spinZ = spinZCheck.checked;

  currentSettings.speedX = parseFloat(speedXSlider.value);
  currentSettings.speedY = parseFloat(speedYSlider.value);
  currentSettings.speedZ = parseFloat(speedZSlider.value);

  const targetFpsSliderDom = deps.targetFpsSlider || document.getElementById('target-fps');
  const numTargetFpsDom = deps.numTargetFps || document.getElementById('num-target-fps');
  if (targetFpsSliderDom || numTargetFpsDom) {
    const fpsVal = parseInt(targetFpsSliderDom ? targetFpsSliderDom.value : numTargetFpsDom.value, 10) || 60;
    currentSettings.targetFps = Math.max(15, Math.min(240, fpsVal));
  }

  currentSettings.gpuOptimize = gpuOptimizeCheck.checked;
  const gpuLowPowerDom = deps.gpuLowPowerCheck || document.getElementById('gpu-low-power');
  const idleFpsSaverDom = deps.idleFpsSaverCheck || document.getElementById('idle-fps-saver');
  const dynamicBatterySaverDom = deps.dynamicBatterySaverCheck || document.getElementById('dynamic-battery-saver');
  if (gpuLowPowerDom) currentSettings.gpuLowPower = gpuLowPowerDom.checked;
  if (idleFpsSaverDom) currentSettings.idleFpsSaver = idleFpsSaverDom.checked;
  if (dynamicBatterySaverDom) currentSettings.dynamicBatterySaver = dynamicBatterySaverDom.checked;
  currentSettings.mouseOptimize = mouseOptimizeCheck.checked;
  currentSettings.settingsLeft = settingsLeftCheck.checked;
  currentSettings.lockPosition = lockPositionCheck.checked;
  currentSettings.viewOnly = viewOnlyCheck.checked;
  const sakuraRainDom = deps.sakuraRainCheck || document.getElementById('sakura-rain');
  if (sakuraRainDom) currentSettings.sakuraRain = sakuraRainDom.checked;
  const snowFallDom = deps.snowFallCheck || document.getElementById('snow-fall');
  if (snowFallDom) currentSettings.snowFall = snowFallDom.checked;

  const soundMasterEnableDom = deps.soundMasterEnableCheck || document.getElementById('sound-master-enable');
  if (soundMasterEnableDom) currentSettings.soundMuted = !soundMasterEnableDom.checked;
  const soundMasterVolDom = deps.soundMasterVolSlider || document.getElementById('sound-master-vol');
  if (soundMasterVolDom) currentSettings.soundMasterVolume = parseFloat(soundMasterVolDom.value);
  const soundSnowVolDom = deps.soundSnowVolSlider || document.getElementById('sound-snow-vol');
  if (soundSnowVolDom) currentSettings.soundSnowVolume = parseFloat(soundSnowVolDom.value);
  const soundSakuraVolDom = deps.soundSakuraVolSlider || document.getElementById('sound-sakura-vol');
  if (soundSakuraVolDom) currentSettings.soundSakuraVolume = parseFloat(soundSakuraVolDom.value);
  const soundDrumVolDom = deps.soundDrumVolSlider || document.getElementById('sound-drum-vol');
  if (soundDrumVolDom) currentSettings.soundDrumVolume = parseFloat(soundDrumVolDom.value);
  const soundSnowSyncDom = deps.soundSnowSyncCheck || document.getElementById('sound-snow-sync');
  if (soundSnowSyncDom) currentSettings.soundSnowSync = soundSnowSyncDom.checked;
  const soundSakuraSyncDom = deps.soundSakuraSyncCheck || document.getElementById('sound-sakura-sync');
  if (soundSakuraSyncDom) currentSettings.soundSakuraSync = soundSakuraSyncDom.checked;

  const flagWindSpeedDom = deps.flagWindSpeedSlider || document.getElementById('flag-wind-speed');
  if (flagWindSpeedDom) currentSettings.flagWindSpeed = parseFloat(flagWindSpeedDom.value);
  const flagWaveIntensityDom = deps.flagWaveIntensitySlider || document.getElementById('flag-wave-intensity');
  if (flagWaveIntensityDom) currentSettings.flagWaveIntensity = parseFloat(flagWaveIntensityDom.value);
  const textureRepeatXDom = deps.textureRepeatXSlider || document.getElementById('texture-repeat-x');
  if (textureRepeatXDom) currentSettings.textureRepeatX = parseFloat(textureRepeatXDom.value);
  const textureRepeatYDom = deps.textureRepeatYSlider || document.getElementById('texture-repeat-y');
  if (textureRepeatYDom) currentSettings.textureRepeatY = parseFloat(textureRepeatYDom.value);
  const textureRoughnessDom = deps.textureRoughnessSlider || document.getElementById('texture-roughness');
  if (textureRoughnessDom) currentSettings.textureRoughness = parseFloat(textureRoughnessDom.value);
  const textureMetalnessDom = deps.textureMetalnessSlider || document.getElementById('texture-metalness');
  if (textureMetalnessDom) currentSettings.textureMetalness = parseFloat(textureMetalnessDom.value);

  soundManager.syncAtmosphere(currentSettings);

  if (enablePhysicsCheck) currentSettings.enablePhysics = enablePhysicsCheck.checked;
  if (physicsFloorCheck) currentSettings.physicsFloor = physicsFloorCheck.checked;
  if (physicsGravitySlider) currentSettings.physicsGravity = parseFloat(physicsGravitySlider.value);
  if (physicsElasticitySlider) currentSettings.physicsElasticity = parseFloat(physicsElasticitySlider.value);

  const showXYZCheck = document.getElementById('show-xyz-coords');
  const showGridCheck = document.getElementById('show-ground-grid');
  const enableFpsCheck = document.getElementById('enable-fps-mode');
  if (showXYZCheck) currentSettings.showXYZCoords = showXYZCheck.checked;
  if (showGridCheck) currentSettings.showGroundGrid = showGridCheck.checked;
  if (enableFpsCheck) {
    const fpsWasEnabled = currentSettings.enableFPSMode;
    currentSettings.enableFPSMode = enableFpsCheck.checked;
    if (fpsWasEnabled && !currentSettings.enableFPSMode && camera) {
      camera.position.set(0, 0, 5.5);
      camera.rotation.set(0, 0, 0);
      if (state) {
        state.cameraPitch = 0;
        state.cameraYaw = 0;
        state.fpsKeyW = state.fpsKeyA = state.fpsKeyS = state.fpsKeyD = state.fpsKeySpace = state.fpsKeyShift = false;
      }
    }
  }

  if (updateXYZVisibility) updateXYZVisibility();

  if (physicsEngine) {
    physicsEngine.configure({
      enabled: currentSettings.enablePhysics,
      gravity: currentSettings.physicsGravity,
      restitution: currentSettings.physicsElasticity,
      enableFloor: currentSettings.physicsFloor
    });
    if (!currentSettings.enablePhysics) {
      physicsEngine.reset();
    }
  }

  const oldModel = currentSettings.activeModel;
  const newModel = modelSelect ? modelSelect.value : 'procedural';
  const modelChanged = (oldModel !== newModel);
  currentSettings.activeModel = newModel;

  if (animSelect) currentSettings.activeAnimation = animSelect.value;
  if (fontScaleSlider) currentSettings.fontSizeScale = parseFloat(fontScaleSlider.value);

  if (saveSettingsFile) saveSettingsFile();

  const characterGroup = state && state.getCharacterGroup ? state.getCharacterGroup() : null;

  if (modelChanged) {
    if (state) {
      if (state.mixer) {
        state.mixer.stopAllAction();
        state.mixer = null;
      }
      state.idleAction = null;
      state.reactAction = null;
      state.loadedAnimations = [];
      state.availableAnimations = [];
      state.customModelLoaded = false;
    }
    if (characterGroup && deps.scene) {
      deps.scene.remove(characterGroup);
    }

    if (newModel === 'procedural') {
      if (fallbackToProcedural) fallbackToProcedural();
    } else if (newModel === 'flag') {
      if (deps.loadFlagModel) deps.loadFlagModel();
    } else {
      const assetsDir = getAssetsPath();
      const fullPath = path.join(assetsDir, newModel);
      console.log('Swapping active mascot model to:', fullPath);
      if (loadCustomModel) loadCustomModel(fullPath);
    }
  } else {
    if (applySelectedAnimation) applySelectedAnimation();
  }

  if (updateGearPosition) updateGearPosition();

  if (camera && renderer) {
    camera.aspect = currentSettings.width / currentSettings.height;
    camera.updateProjectionMatrix();
    renderer.setSize(currentSettings.width, currentSettings.height);
  }

  if (characterGroup) {
    characterGroup.scale.set(currentSettings.scale, currentSettings.scale, currentSettings.scale);

    if (state && state.customModelLoaded) {
      const innerModel = characterGroup.children[0];
      if (innerModel) {
        const box = new THREE.Box3().setFromObject(innerModel);
        const size = box.getSize(new THREE.Vector3());
        const padding = 1.35;
        const visibleHeight = size.y * currentSettings.scale * padding;
        const zPos = visibleHeight / (2 * Math.tan((camera.fov * Math.PI) / 360));
        camera.position.set(0, 0, zPos + ((size.z * currentSettings.scale) / 2));
      }
    }
  }

  if (ipcRenderer) {
    ipcRenderer.send('resize-window', { width: currentSettings.width, height: currentSettings.height });
  }

  if (closeSettings) closeSettings();
}
