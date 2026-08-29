/**
 * Core 3D Model Loader & Asset Manager
 * Handles 3D asset scanning, GLTF loading, bounding box centering,
 * auto-grounding height calculations, AnimationMixer clip setup, and safe fallbacks.
 */

import { createFlagMesh } from './FlagMeshBuilder.js';

let loadToken = 0;

/**
 * Scans the assets directory for valid 3D model files (.glb, .gltf).
 * @param {Object} fs - File system module reference.
 * @param {Function} getAssetsPath - Callback returning absolute assets directory path.
 * @returns {Array<string>} Array of discovered model filenames.
 */
export function scanForModels(fs, getAssetsPath) {
  if (!fs || typeof getAssetsPath !== 'function') return [];
  const discoveredModels = [];
  const assetsDir = getAssetsPath();

  if (!fs.existsSync(assetsDir)) {
    try {
      fs.mkdirSync(assetsDir, { recursive: true });
    } catch (e) {
      console.warn("Could not create assets directory:", e);
    }
  }

  if (fs.existsSync(assetsDir)) {
    try {
      const files = fs.readdirSync(assetsDir);
      files.forEach(file => {
        if (file.endsWith('.glb') || file.endsWith('.gltf')) {
          discoveredModels.push(file);
        }
      });
    } catch (err) {
      console.error('Error scanning models:', err);
    }
  }
  return discoveredModels;
}

/**
 * Detects active model preference and loads appropriate asset.
 * @param {Object} ctx - Context dependencies (fs, path, GLTFLoader, state, callbacks).
 */
export function detectAndLoadAsset(ctx) {
  const { fs, path, getAssetsPath, currentSettings, state, callbacks } = ctx;
  state.discoveredModels = scanForModels(fs, getAssetsPath);

  if (currentSettings.activeModel === 'flag') {
    console.log('Active mascot is Waving Country Flag.');
    if (callbacks.createFlag) {
      callbacks.createFlag();
    } else {
      loadFlagModel(ctx);
    }
    return;
  }

  if (currentSettings.activeModel === 'procedural') {
    console.log('Active mascot is procedural bunny.');
    if (callbacks.createMascot) callbacks.createMascot();
    return;
  }

  if (currentSettings.activeModel && state.discoveredModels.includes(currentSettings.activeModel)) {
    const assetsDir = getAssetsPath();
    const fullPath = path.join(assetsDir, currentSettings.activeModel);
    console.log('Loading active model:', fullPath);
    loadCustomModel(ctx, fullPath);
    return;
  }

  if (state.discoveredModels.length > 0) {
    currentSettings.activeModel = state.discoveredModels[0];
    const assetsDir = getAssetsPath();
    const fullPath = path.join(assetsDir, currentSettings.activeModel);
    console.log('Active model not found. Defaulting to first discovered model:', fullPath);
    loadCustomModel(ctx, fullPath);
    return;
  }

  console.log('No custom asset found. Defaulting to procedural mascot.');
  currentSettings.activeModel = 'procedural';
  if (callbacks.createMascot) callbacks.createMascot();
}

/**
 * Safely falls back to procedural mascot if custom model loading fails or is selected.
 * @param {Object} ctx - Context dependencies.
 */
export function fallbackToProcedural(ctx) {
  loadToken++; // Invalidate pending custom model loads
  console.log('Falling back to procedural mascot.');
  const { camera, renderer, scene, state, currentSettings, callbacks } = ctx;

  state.customModelLoaded = false;
  currentSettings.activeModel = 'procedural';

  if (state.mixer) {
    state.mixer.stopAllAction();
    state.mixer = null;
  }
  state.idleAction = null;
  state.reactAction = null;
  state.loadedAnimations = [];
  state.availableAnimations = [];

  const existingGroup = state.getCharacterGroup ? state.getCharacterGroup() : null;
  if (existingGroup && scene) {
    scene.remove(existingGroup);
  }

  const targetW = currentSettings.width || 350;
  const targetH = currentSettings.height || 350;
  if (camera) {
    camera.aspect = targetW / targetH;
    camera.updateProjectionMatrix();
    camera.position.set(0, 0, 5.5);
    camera.lookAt(0, 0, 0);
  }
  if (renderer) {
    renderer.setSize(targetW, targetH);
  }

  if (callbacks && callbacks.createMascot) callbacks.createMascot();
  if (callbacks && callbacks.populateAnimationDropdown) callbacks.populateAnimationDropdown();
}

/**
 * Loads the native 3D Waving Country Flag mesh cleanly.
 * @param {Object} ctx - Context dependencies.
 */
export function loadFlagModel(ctx) {
  loadToken++; // Invalidate pending custom model loads
  console.log('Loading Waving 3D Country Flag mesh.');
  const { THREE, scene, camera, renderer, state, currentSettings, callbacks } = ctx;

  state.customModelLoaded = false;
  currentSettings.activeModel = 'flag';

  if (state.mixer) {
    state.mixer.stopAllAction();
    state.mixer = null;
  }
  state.idleAction = null;
  state.reactAction = null;
  state.loadedAnimations = [];
  state.availableAnimations = [];

  const existingGroup = state.getCharacterGroup ? state.getCharacterGroup() : null;
  if (existingGroup && scene) {
    scene.remove(existingGroup);
  }

  const targetW = currentSettings.width || 350;
  const targetH = currentSettings.height || 350;
  if (camera) {
    camera.aspect = targetW / targetH;
    camera.updateProjectionMatrix();
    camera.position.set(0, 0, 5.5);
    camera.lookAt(0, 0, 0);
  }
  if (renderer) {
    renderer.setSize(targetW, targetH);
  }

  const result = createFlagMesh(THREE, scene, {
    customTextureUrl: currentSettings.customTexturePath,
    flagPreset: currentSettings.flagPreset,
    windSpeed: currentSettings.flagWindSpeed,
    waveIntensity: currentSettings.flagWaveIntensity,
    textureRepeatX: currentSettings.textureRepeatX,
    textureRepeatY: currentSettings.textureRepeatY,
    textureRoughness: currentSettings.textureRoughness,
    textureMetalness: currentSettings.textureMetalness
  });

  if (result) {
    if (state.setCharacterGroup) state.setCharacterGroup(result.characterGroup);
    if (state.setInnerModelGroup) state.setInnerModelGroup(result.innerModelGroup);
    if (state.setCollisionProxy) state.setCollisionProxy(result.collisionProxy);
  }

  if (callbacks && callbacks.generateModelPreview) {
    callbacks.generateModelPreview('flag');
  }
  if (callbacks && callbacks.populateAnimationDropdown) {
    callbacks.populateAnimationDropdown();
  }
}

/**
 * Loads custom GLTF/GLB model from file path cleanly with race condition protection.
 * @param {Object} ctx - Context dependencies.
 * @param {string} filePath - Absolute path to GLTF/GLB file.
 */
export function loadCustomModel(ctx, filePath) {
  const currentLoadId = ++loadToken;
  const {
    THREE,
    GLTFLoader,
    scene,
    camera,
    renderer,
    path,
    pathToFileURL,
    currentSettings,
    state,
    callbacks
  } = ctx;

  let fileUrl = filePath;
  try {
    fileUrl = pathToFileURL(filePath).href;
  } catch (e) {
    console.warn("Could not convert path to file URL, using raw path:", e);
  }

  // Clean up previous model and mixer
  const existingGroup = state.getCharacterGroup ? state.getCharacterGroup() : null;
  if (existingGroup && scene) {
    scene.remove(existingGroup);
  }
  if (state.mixer) {
    state.mixer.stopAllAction();
    state.mixer = null;
  }
  state.idleAction = null;
  state.reactAction = null;

  try {
    const loader = new GLTFLoader();
    loader.load(fileUrl, (gltf) => {
      // Discard if another model load was triggered in the meantime
      if (currentLoadId !== loadToken) {
        console.log('Discarding stale GLTF load result');
        return;
      }

      const prevGroup = state.getCharacterGroup ? state.getCharacterGroup() : null;
      if (prevGroup && scene) {
        scene.remove(prevGroup);
      }

      const charGroup = new THREE.Group();
      scene.add(charGroup);
      state.setCharacterGroup(charGroup);

      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      model.position.set(-center.x, -center.y, -center.z);

      // Ensure all textures and materials from GLTF/GLB are active and receive proper lighting
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.side = THREE.DoubleSide;
            child.material.needsUpdate = true;
            if (child.material.map) {
              child.material.map.needsUpdate = true;
            }
          }
        }
      });

      const padding = 1.35;
      const innerGroup = new THREE.Group();
      innerGroup.add(model);
      innerGroup.position.y = - size.y * (padding - 1) / 2;

      charGroup.add(innerGroup);
      state.setInnerModelGroup(innerGroup);

      const proxyGeom = new THREE.BoxGeometry(size.x, size.y, size.z);
      const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
      const collisionProxy = new THREE.Mesh(proxyGeom, proxyMat);
      collisionProxy.position.set(0, 0, 0);
      innerGroup.add(collisionProxy);
      state.setCollisionProxy(collisionProxy);

      charGroup.scale.set(currentSettings.scale, currentSettings.scale, currentSettings.scale);

      const targetW = currentSettings.width || 350;
      const targetH = currentSettings.height || 350;
      camera.aspect = targetW / targetH;
      camera.updateProjectionMatrix();
      renderer.setSize(targetW, targetH);

      const visibleHeight = size.y * currentSettings.scale * padding;
      const zPos = visibleHeight / (2 * Math.tan((camera.fov * Math.PI) / 360));
      camera.position.set(0, 0, zPos + ((size.z * currentSettings.scale) / 2));
      camera.lookAt(0, 0, 0);

      state.loadedAnimations = gltf.animations || [];
      state.availableAnimations = state.loadedAnimations.map((clip, idx) => clip.name || `Animation ${idx + 1}`);

      state.idleAction = null;
      state.reactAction = null;
      if (state.loadedAnimations.length > 0) {
        state.mixer = new THREE.AnimationMixer(model);
        applySelectedAnimation(ctx);
      }

      state.customModelLoaded = true;
      console.log('Successfully loaded custom model at original scale:', filePath);

      if (callbacks && callbacks.populateAnimationDropdown) {
        callbacks.populateAnimationDropdown();
      }

      const fileName = path.basename(filePath);
      setTimeout(() => {
        if (callbacks && callbacks.generateModelPreview) callbacks.generateModelPreview(fileName);
      }, 150);
    }, undefined, (error) => {
      if (currentLoadId === loadToken) {
        console.error('Failed to load custom GLB/GLTF model:', error);
        fallbackToProcedural(ctx);
      }
    });
  } catch (err) {
    if (currentLoadId === loadToken) {
      console.error('Synchronous loader crash:', err);
      fallbackToProcedural(ctx);
    }
  }
}

/**
 * Applies selected animation loop based on activeAnimation setting or auto-keyword matching.
 * @param {Object} ctx - Context dependencies.
 */
export function applySelectedAnimation(ctx) {
  const { THREE, state, currentSettings } = ctx;
  if (!state.mixer) return;

  state.mixer.stopAllAction();
  state.idleAction = null;
  state.reactAction = null;

  if (currentSettings.activeAnimation === 'none') {
    console.log('Animation is set to none (static pose).');
    return;
  }

  const clips = state.loadedAnimations || [];
  if (clips.length === 0) return;

  let targetClip = null;

  if (currentSettings.activeAnimation && currentSettings.activeAnimation !== 'default') {
    targetClip = clips.find(clip => clip.name === currentSettings.activeAnimation);
    if (!targetClip) {
      const idx = parseInt(currentSettings.activeAnimation, 10);
      if (!isNaN(idx) && idx >= 0 && idx < clips.length) {
        targetClip = clips[idx];
      }
    }
  }

  if (!targetClip) {
    const idleKeywords = ['idle', 'stay', 'breathe', 'stand', 'look', 'loop', 'default', 'walk', 'run'];
    targetClip = clips.find(clip => {
      const name = (clip.name || '').toLowerCase();
      return idleKeywords.some(keyword => name.includes(keyword));
    });
    if (!targetClip) {
      targetClip = clips[0];
    }
  }

  if (clips.length > 1) {
    const reactKeywords = ['jump', 'spin', 'click', 'react', 'interact', 'pet', 'wave', 'dance', 'happy'];
    const reactClip = clips.find(clip => {
      const name = (clip.name || '').toLowerCase();
      return reactKeywords.some(keyword => name.includes(keyword)) && clip !== targetClip;
    });
    if (reactClip) {
      state.reactAction = state.mixer.clipAction(reactClip);
      state.reactAction.setLoop(THREE.LoopOnce);
      state.reactAction.clampWhenFinished = true;
      console.log('Auto-detected reaction animation:', reactClip.name || 'Reaction');
    }
  }

  if (targetClip) {
    console.log('Playing active animation loop:', targetClip.name || 'Clip');
    state.idleAction = state.mixer.clipAction(targetClip);
    state.idleAction.setLoop(THREE.LoopRepeat);
    state.idleAction.setEffectiveWeight(1.0);
    state.idleAction.setEffectiveTimeScale(1.0);
    state.idleAction.reset().play();
  }
}
