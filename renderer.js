import * as THREE from 'three';
import { GLTFLoader } from './node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { initI18n, t, changeLanguage, getCurrentLanguage } from './i18nManager.js';
import { physicsEngine } from './physicsEngine.js';
import { SettingsManager } from './src/managers/SettingsManager.js';
import { updateGearPosition as updateGearPositionUtil, showSpeechBubble } from './src/ui/uiUtils.js';
import { updateSpotlightPosition as updateSpotlightPositionUtil, updateStageLighting as updateStageLightingUtil } from './src/core/LightingManager.js';
import { createProceduralMascot } from './src/core/MascotBuilder.js';
import { SakuraRainManager } from './src/core/SakuraRainManager.js';
import { SnowFallManager } from './src/core/SnowFallManager.js';
import { setupInteraction as setupInteractionUtil } from './src/core/InteractionManager.js';
import {
  scanForModels as scanForModelsUtil,
  detectAndLoadAsset as detectAndLoadAssetUtil,
  fallbackToProcedural as fallbackToProceduralUtil,
  loadFlagModel as loadFlagModelUtil,
  loadCustomModel as loadCustomModelUtil,
  applySelectedAnimation as applySelectedAnimationUtil
} from './src/core/ModelLoader.js';
import {
  generateModelPreview as generateModelPreviewUtil,
  populateModelDropdown as populateModelDropdownUtil,
  startBackgroundPreviewGenerator as startBackgroundPreviewGeneratorUtil,
  generateMascotPreviewInBackground as generateMascotPreviewInBackgroundUtil,
  forceRefreshAllPreviews as forceRefreshAllPreviewsUtil
} from './src/ui/PreviewGenerator.js';
import { setupStudioTabs as setupStudioTabsUtil } from './src/ui/StudioTabManager.js';
import { setupSoundTabUI } from './src/ui/SoundTabUI.js';
import { setupTextureTabUI } from './src/ui/TextureTabUI.js';
import { setupAIDirectorTabUI } from './src/ui/AIDirectorTabUI.js';
import { soundManager } from './src/core/SoundManager.js';
import { renderSpotlightCardsUI as renderSpotlightCardsUIUtil, hexToRgb, rgbToHex } from './src/ui/SpotlightCardsUI.js';
import {
  populateAnimationDropdown as populateAnimationDropdownUtil,
  syncSlidersUI as syncSlidersUIUtil
} from './src/ui/SettingsPanelUI.js';
import { handleSaveSettings as handleSaveSettingsUtil } from './src/ui/SettingsSaveHandler.js';
import { updateAnimationFrame as updateAnimationFrameUtil } from './src/core/AnimationLoopManager.js';
import { PreviewViewportEngine } from './src/ui/PreviewViewportEngine.js';
import {
  updateFPSCamera as updateFPSCameraUtil,
  updateXYZVisibility as updateXYZVisibilityUtil,
  resetCameraAndPosition as resetCameraAndPositionUtil
} from './src/ui/CameraViewManager.js';
import { initializeApp as initializeAppUtil } from './src/core/AppInitializer.js';
import { setupSettingsUI as setupSettingsUIUtil } from './src/ui/SettingsEventListeners.js';
import {
  triggerInteraction as triggerInteractionUtil,
  onWindowResize as onWindowResizeUtil
} from './src/core/MascotInteractionHandler.js';
import {
  getModelLoaderCtx as getModelLoaderCtxUtil,
  getPreviewGeneratorCtx as getPreviewGeneratorCtxUtil
} from './src/core/ModelContextManager.js';
import { createInteractionStateProxy } from './src/core/InteractionStateFactory.js';
import { createFormSyncManager } from './src/ui/FormSyncManager.js';
import { createModelDelegates } from './src/core/ModelDelegates.js';
import { createRenderLoopDelegates } from './src/core/RenderLoopDelegates.js';
import { createInteractionDelegates } from './src/core/InteractionDelegates.js';
import { createSettingsUIDelegates } from './src/ui/SettingsUIDelegates.js';
import { buildSaveSettingsCallback } from './src/ui/FormDOMGatherer.js';
import { AppStore } from './src/managers/AppStore.js';
import { buildSaveSettingsConfig } from './src/ui/SettingsUIConfigBuilder.js';

// Secure Preload API Bridges (contextIsolation: true compliant)
const ipcRenderer = window.electronAPI || (typeof window.require === 'function' ? window.require('electron').ipcRenderer : {});
const fs = window.fsBridge || (typeof window.require === 'function' ? window.require('fs') : {});
const path = window.pathBridge || (typeof window.require === 'function' ? window.require('path') : {});
const { pathToFileURL } = window.urlBridge || (typeof window.require === 'function' ? window.require('url') : { pathToFileURL: (p) => ({ href: p }) });

// Three.js Scene, Camera, Renderer, and Lighting Objects
let scene, camera, renderer, characterGroup, innerModelGroup, collisionProxy;
let axesHelper = null;
let gridHelper = null;
let stageSpotLights = [];
let stageSpotLightHelpers = [];
let ambientLight = null;
let keyLight = null;
let fillLight = null;
let rimLight = null;
let mixer;
let idleAction = null;
let reactAction = null;
let loadedAnimations = [];
let availableAnimations = [];
let customModelLoaded = false;
let sakuraRainManager = null;
let snowFallManager = null;

// Application Reactive State Store
const appStore = new AppStore();
const appState = appStore.state;

// Application Settings initialized via SettingsManager
let currentSettings = SettingsManager.getDefaultSettings();
let discoveredModels = [];

function updateGearPosition() {
  updateGearPositionUtil(currentSettings);
}

async function init() {
  physicsEngine.onBounce = (vel) => soundManager.playBounceSfx(vel);

  await initializeAppUtil({
    THREE,
    ipcRenderer,
    initI18n,
    physicsEngine,
    currentSettings,
    readSettingsFile,
    state: {
      set hasSettingsFile(v) { appState.hasSettingsFile = v; },
      get hasSettingsFile() { return appState.hasSettingsFile; },
      set wasConfigHealed(v) { appState.wasConfigHealed = v; },
      get wasConfigHealed() { return appState.wasConfigHealed; },
      set scene(s) { scene = s; },
      set camera(c) { camera = c; },
      set renderer(r) { renderer = r; },
      set ambientLight(l) { ambientLight = l; },
      set keyLight(l) { keyLight = l; },
      set fillLight(l) { fillLight = l; },
      set rimLight(l) { rimLight = l; },
      set axesHelper(h) { axesHelper = h; },
      set gridHelper(h) { gridHelper = h; },
      getIsMouseOverCharacter: () => appState.isMouseOverCharacter,
      setIsMouseOverCharacter: (v) => { appState.isMouseOverCharacter = v; }
    },
    callbacks: {
      updateXYZVisibility,
      updateStageLighting,
      updateSpotlightPosition,
      detectAndLoadAsset,
      setupInteraction,
      setupSettingsUI,
      updateGearPosition,
      initPreviewViewport,
      startBackgroundPreviewGenerator,
      initSakuraRain: () => {
        if (!sakuraRainManager && scene) {
          sakuraRainManager = new SakuraRainManager(THREE, scene);
          sakuraRainManager.setEnabled(currentSettings.sakuraRain !== false);
        }
      },
      initSnowFall: () => {
        if (!snowFallManager && scene) {
          snowFallManager = new SnowFallManager(THREE, scene);
          snowFallManager.setEnabled(currentSettings.snowFall === true);
        }
      },
      animate,
      updateIgnoreMouseState: () => updateIgnoreMouseState()
    },
    onWindowResize
  });
}

function updateSpotlightPosition() {
  updateSpotlightPositionUtil(scene, currentSettings.spotlights, stageSpotLights, stageSpotLightHelpers, appState.isSettingsOpen, THREE);
}

function updateStageLighting() {
  updateStageLightingUtil(ambientLight, keyLight, fillLight, rimLight, currentSettings);
}

function createMascot() {
  const result = createProceduralMascot(THREE, scene);
  if (result) {
    characterGroup = result.characterGroup;
    innerModelGroup = result.innerModelGroup;
    collisionProxy = result.collisionProxy;
  }

  // Generate preview thumbnail if missing
  setTimeout(() => {
    generateModelPreview('procedural');
  }, 150);
}

let updateIgnoreMouseState = () => { };

const interactionDelegates = createInteractionDelegates({
  setupInteractionUtil,
  THREE,
  physicsEngine,
  currentSettings,
  ipcRenderer,
  fs,
  path,
  state: appState,
  sceneAccessors: {
    getScene: () => scene,
    getCamera: () => camera,
    getRenderer: () => renderer,
    getCharacterGroup: () => characterGroup,
    getInnerModelGroup: () => innerModelGroup,
    getCollisionProxy: () => collisionProxy
  },
  callbacks: {
    showSpeechBubble,
    triggerInteraction,
    saveSettingsFile,
    updateXYZVisibility: () => updateXYZVisibility(),
    resetCameraAndPosition,
    getAssetsPath,
    onModelImported: (fileName, destPath) => {
      if (mixer) {
        mixer.stopAllAction();
        mixer = null;
      }
      idleAction = null;
      reactAction = null;
      loadedAnimations = [];
      availableAnimations = [];
      if (characterGroup) {
        scene.remove(characterGroup);
      }
      customModelLoaded = false;

      currentSettings.activeModel = fileName;
      currentSettings.activeAnimation = 'default';
      saveSettingsFile();

      const modelSelect = document.getElementById('model-select');
      if (modelSelect) {
        populateModelDropdown();
        modelSelect.value = fileName;
      }

      loadCustomModel(destPath);
    }
  }
});

function setupInteraction() {
  updateIgnoreMouseState = interactionDelegates.setupInteraction();
}



function triggerInteraction() {
  triggerInteractionUtil({
    animationState: appState.animation,
    mixer,
    reactAction,
    idleAction,
    showSpeechBubble,
    currentSettings,
    saveSettingsFile
  });
}

function onWindowResize() {
  onWindowResizeUtil({ camera, renderer });
}

function getAssetsPath() {
  return ipcRenderer.sendSync('get-assets-path');
}

function getModelLoaderCtx() {
  return getModelLoaderCtxUtil({
    THREE,
    GLTFLoader,
    scene,
    camera,
    renderer,
    fs,
    path,
    pathToFileURL,
    currentSettings,
    ipcRenderer,
    getAssetsPath,
    state: {
      hasSettingsFile: appState.hasSettingsFile,
      get discoveredModels() { return discoveredModels; },
      set discoveredModels(v) { discoveredModels = v; },
      get customModelLoaded() { return customModelLoaded; },
      set customModelLoaded(v) { customModelLoaded = v; },
      get mixer() { return mixer; },
      set mixer(v) { mixer = v; },
      get idleAction() { return idleAction; },
      set idleAction(v) { idleAction = v; },
      get reactAction() { return reactAction; },
      set reactAction(v) { reactAction = v; },
      get loadedAnimations() { return loadedAnimations; },
      set loadedAnimations(v) { loadedAnimations = v; },
      get availableAnimations() { return availableAnimations; },
      set availableAnimations(v) { availableAnimations = v; },
      getCharacterGroup: () => characterGroup,
      setCharacterGroup: (g) => { characterGroup = g; },
      getInnerModelGroup: () => innerModelGroup,
      setInnerModelGroup: (g) => { innerModelGroup = g; },
      getCollisionProxy: () => collisionProxy,
      setCollisionProxy: (c) => { collisionProxy = c; }
    },
    callbacks: {
      createMascot,
      createFlag: () => loadFlagModel(),
      generateModelPreview,
      populateAnimationDropdown: () => {
        if (typeof populateAnimationDropdown === 'function') populateAnimationDropdown();
      }
    }
  });
}

const modelDelegates = createModelDelegates({
  fs,
  getAssetsPath,
  getModelLoaderCtx: () => getModelLoaderCtx(),
  getPreviewGeneratorCtx: () => getPreviewGeneratorCtx(),
  scanForModelsUtil,
  detectAndLoadAssetUtil,
  fallbackToProceduralUtil,
  loadCustomModelUtil,
  applySelectedAnimationUtil,
  generateModelPreviewUtil,
  populateModelDropdownUtil,
  startBackgroundPreviewGeneratorUtil,
  generateMascotPreviewInBackgroundUtil,
  forceRefreshAllPreviewsUtil,
  state: {
    set discoveredModels(v) { discoveredModels = v; },
    get discoveredModels() { return discoveredModels; }
  }
});

function readSettingsFile() {
  const result = SettingsManager.readSettingsFile({
    fs,
    path,
    getAssetsPath,
    currentSettings,
    ipcRenderer
  });
  if (result && result.wasConfigHealed) {
    appState.wasConfigHealed = true;
  }
  return result ? result.hasSettingsFile : false;
}

function saveSettingsFile() {
  SettingsManager.saveSettingsFile({
    fs,
    path,
    getAssetsPath,
    currentSettings
  });
}

function getPreviewGeneratorCtx() {
  return getPreviewGeneratorCtxUtil({
    THREE,
    GLTFLoader,
    scene,
    camera,
    renderer,
    fs,
    path,
    pathToFileURL,
    getAssetsPath,
    currentSettings,
    ipcRenderer,
    t,
    state: {
      discoveredModels,
      getCharacterGroup: () => characterGroup
    },
    callbacks: {
      scanForModels,
      populateModelDropdown
    }
  });
}

const scanForModels = modelDelegates.scanForModels;
const detectAndLoadAsset = modelDelegates.detectAndLoadAsset;
const fallbackToProcedural = modelDelegates.fallbackToProcedural;
const loadFlagModel = () => loadFlagModelUtil(getModelLoaderCtx());
const loadCustomModel = modelDelegates.loadCustomModel;
const applySelectedAnimation = modelDelegates.applySelectedAnimation;
const generateModelPreview = modelDelegates.generateModelPreview;
const populateModelDropdown = modelDelegates.populateModelDropdown;
const startBackgroundPreviewGenerator = modelDelegates.startBackgroundPreviewGenerator;
const generateMascotPreviewInBackground = modelDelegates.generateMascotPreviewInBackground;
const forceRefreshAllPreviews = modelDelegates.forceRefreshAllPreviews;

function setupSettingsUI() {
  const { syncSlidersUI, populateAnimationDropdown, renderSpotlightCardsUI } = createFormSyncManager({
    currentSettings,
    getAvailableAnimations: () => availableAnimations,
    syncSlidersUIUtil,
    populateAnimationDropdownUtil,
    renderSpotlightCardsUIUtil,
    updateXYZVisibility: () => updateXYZVisibility(),
    updateStageLighting,
    updateSpotlightPosition,
    saveSettingsFile,
    t
  });

  const settingsUIDelegates = createSettingsUIDelegates({
    setupSettingsUIUtil,
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
    setupStudioTabsUtil,
    applySelectedAnimation,
    fallbackToProcedural,
    loadFlagModel,
    loadCustomModel,
    getAssetsPath,
    path,
    handleSaveSettings: buildSaveSettingsCallback({
      handleSaveSettingsUtil,
      context: buildSaveSettingsConfig({
        currentSettings,
        changeLanguage,
        updateStageLighting,
        updateSpotlightPosition,
        physicsEngine,
        saveSettingsFile,
        state: {
          cameraPitch: appState.cameraPitch,
          cameraYaw: appState.cameraYaw,
          fpsKeyW: appState.fpsKeyW,
          fpsKeyA: appState.fpsKeyA,
          fpsKeyS: appState.fpsKeyS,
          fpsKeyD: appState.fpsKeyD,
          fpsKeySpace: appState.fpsKeySpace,
          fpsKeyShift: appState.fpsKeyShift,
          mixer,
          idleAction,
          reactAction,
          loadedAnimations,
          availableAnimations,
          customModelLoaded,
          getCharacterGroup: () => characterGroup
        },
        THREE,
        scene,
        camera,
        renderer,
        path,
        getAssetsPath,
        ipcRenderer,
        fallbackToProcedural,
        loadFlagModel,
        loadCustomModel,
        applySelectedAnimation,
        updateGearPosition,
        updateXYZVisibility,
        populateModelDropdown
      })
    }),
    resetCameraAndPosition,
    updateIgnoreMouseState: () => updateIgnoreMouseState(),
    stateAccessors: appState
  });

  settingsUIDelegates.setupSettingsUI();
  setupSoundTabUI({
    currentSettings,
    saveSettingsFile,
    t,
    fs,
    path,
    getAssetsPath,
    showSpeechBubble
  });
  setupTextureTabUI({
    currentSettings,
    saveSettingsFile,
    t,
    THREE,
    getInnerModelGroup: () => innerModelGroup,
    forceRefreshAllPreviews
  });
  setupAIDirectorTabUI({
    currentSettings,
    saveSettingsFile,
    t,
    showSpeechBubble,
    callbacks: {
      updateScale: (s) => {
        if (innerModelGroup) innerModelGroup.scale.set(s, s, s);
      },
      loadCustomModel: (name) => {
        loadCustomModel(name);
      },
      resetCameraAndPosition: () => {
        resetCameraAndPosition();
      }
    }
  });
}

function resetCameraAndPosition() {
  resetCameraAndPositionUtil({
    camera,
    THREE,
    state: {
      customModelLoaded,
      set cameraPitch(v) { appState.cameraPitch = v; },
      set cameraYaw(v) { appState.cameraYaw = v; },
      set fpsKeyW(v) { appState.fpsKeyW = v; },
      set fpsKeyS(v) { appState.fpsKeyS = v; },
      set fpsKeyA(v) { appState.fpsKeyA = v; },
      set fpsKeyD(v) { appState.fpsKeyD = v; },
      set fpsKeySpace(v) { appState.fpsKeySpace = v; },
      set fpsKeyShift(v) { appState.fpsKeyShift = v; }
    },
    characterGroup,
    innerModelGroup,
    hasSettingsFile: appState.hasSettingsFile,
    currentSettings,
    physicsEngine
  });
}

const clock = new THREE.Clock();
const previewViewportEngine = new PreviewViewportEngine(THREE);

const renderLoopDelegates = createRenderLoopDelegates({
  clock,
  THREE,
  updateAnimationFrameUtil,
  updateFPSCameraUtil,
  updateXYZVisibilityUtil,
  previewViewportEngine,
  getContext: () => ({
    mixer,
    innerModelGroup,
    characterGroup,
    animationState: appState.animation,
    currentSettings,
    hasSettingsFile: appState.hasSettingsFile,
    reactAction,
    idleAction,
    customModelLoaded,
    physicsEngine,
    camera,
    axesHelper,
    gridHelper,
    renderer,
    scene,
    sakuraRainManager,
    snowFallManager,
    renderPreviewViewport,
    updateFPSCamera,
    isSettingsOpen: appState.isSettingsOpen,
    isMouseOverCharacter: appState.isMouseOverCharacter,
    stageSpotLightHelpers,
    t,
    keys: appState
  })
});

const animate = renderLoopDelegates.animate;
const updateFPSCamera = renderLoopDelegates.updateFPSCamera;
const updateXYZVisibility = renderLoopDelegates.updateXYZVisibility;
const initPreviewViewport = renderLoopDelegates.initPreviewViewport;
const renderPreviewViewport = renderLoopDelegates.renderPreviewViewport;

// Initialize on load
window.addEventListener('DOMContentLoaded', init);
