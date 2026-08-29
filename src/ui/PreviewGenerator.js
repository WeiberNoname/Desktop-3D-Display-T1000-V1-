/**
 * Mascot Preview & Thumbnail Generator Module
 * Handles synchronous canvas snapshot preview generation,
 * background offscreen preview queuing, mascot grid card DOM population,
 * localized card titles, and preview thumbnail cache clearing.
 */

import { createProceduralMascot } from '../core/MascotBuilder.js';
import { createFlagMesh } from '../core/FlagMeshBuilder.js';

export const DEFAULT_FALLBACK_ICON = "data:image/svg+xml;utf8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1c1c22"/>
      <stop offset="100%" stop-color="#0e0e12"/>
    </linearGradient>
    <linearGradient id="triGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="120" height="120" rx="8" fill="url(#bgGrad)"/>
  <rect width="118" height="118" x="1" y="1" rx="7" fill="none" stroke="rgba(251,191,36,0.18)" stroke-width="1"/>
  <path d="M 60 18 L 100 86 C 101.5 88.5 99.8 92 96.8 92 L 23.2 92 C 20.2 92 18.5 88.5 20 86 Z" 
        fill="rgba(245, 158, 11, 0.08)" 
        stroke="url(#triGrad)" 
        stroke-width="3.5" 
        stroke-linejoin="round"
        filter="url(#glow)"/>
  <g>
    <animate attributeName="opacity" values="1;0.05;1" dur="1.1s" repeatCount="indefinite" />
    <line x1="60" y1="40" x2="60" y2="66" stroke="#fbbf24" stroke-width="4.5" stroke-linecap="round"/>
    <circle cx="60" cy="77" r="2.8" fill="#fbbf24"/>
  </g>
  <text x="60" y="108" font-family="Consolas, Monaco, sans-serif" font-size="8" font-weight="bold" fill="#f59e0b" text-anchor="middle" letter-spacing="0.8">GENERATING...</text>
</svg>`.trim());

/**
 * Generates a PNG thumbnail preview for a specific model key from isolated renderer canvas.
 * @param {Object} ctx - Context dependencies.
 * @param {string} modelKey - Active model filename or 'procedural'.
 */
export function generateModelPreview(ctx, modelKey) {
  const { fs, path, getAssetsPath, callbacks } = ctx;
  const assetsDir = getAssetsPath();
  const previewsDir = path.join(assetsDir, '.previews');

  if (!fs.existsSync(previewsDir)) {
    try {
      fs.mkdirSync(previewsDir, { recursive: true });
    } catch (e) {
      console.warn("Could not create previews directory:", e);
    }
  }
  const previewPath = path.join(previewsDir, `${modelKey}.png`);
  if (fs.existsSync(previewPath)) return;

  generateMascotPreviewInBackground(ctx, modelKey);

  if (callbacks && callbacks.populateModelDropdown) {
    callbacks.populateModelDropdown();
  }
}

/**
 * Populates the mascot selection grid DOM cards in the settings panel.
 * @param {Object} ctx - Context dependencies.
 */
export function populateModelDropdown(ctx) {
  const { fs, path, pathToFileURL, getAssetsPath, currentSettings, callbacks, state, t } = ctx;
  if (callbacks && callbacks.scanForModels) {
    callbacks.scanForModels();
  }

  const gridContainer = document.getElementById('model-select-grid');
  const modelSelect = document.getElementById('model-select');
  if (!gridContainer || !modelSelect) return;

  gridContainer.innerHTML = '';

  const discovered = state && state.discoveredModels ? state.discoveredModels : [];
  const options = ['procedural', 'flag', ...discovered];
  const assetsDir = getAssetsPath();

  options.forEach(modelKey => {
    const card = document.createElement('div');
    card.className = 'mascot-card';
    if (currentSettings.activeModel === modelKey) {
      card.classList.add('selected');
    }

    const img = document.createElement('img');
    img.className = 'mascot-thumbnail';
    img.dataset.mascot = modelKey;

    const previewPath = path.join(assetsDir, '.previews', `${modelKey}.png`);
    if (fs.existsSync(previewPath)) {
      img.src = pathToFileURL(previewPath).href + "?t=" + Date.now();
    } else {
      img.src = DEFAULT_FALLBACK_ICON;
    }

    const label = document.createElement('div');
    label.className = 'mascot-card-label';
    if (modelKey === 'procedural') {
      label.textContent = (typeof t === 'function') ? t('default_mascot', 'Default Bunny 🐰') : 'Default Bunny 🐰';
    } else if (modelKey === 'flag') {
      label.textContent = (typeof t === 'function') ? t('model_flag', 'Country Flag 🎌') : 'Country Flag 🎌';
    } else {
      label.textContent = modelKey.replace(/\.(glb|gltf)$/i, '');
    }

    card.appendChild(img);
    card.appendChild(label);

    card.addEventListener('click', () => {
      if (currentSettings.activeModel === modelKey) return;
      gridContainer.querySelectorAll('.mascot-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      modelSelect.value = modelKey;
      modelSelect.dispatchEvent(new Event('change'));
    });

    gridContainer.appendChild(card);
  });
}

/**
 * Starts background preview generator queue for models missing PNG thumbnails.
 * @param {Object} ctx - Context dependencies.
 */
export function startBackgroundPreviewGenerator(ctx) {
  const { fs, path, getAssetsPath, state, callbacks } = ctx;
  if (callbacks && callbacks.scanForModels) {
    callbacks.scanForModels();
  }
  const assetsDir = getAssetsPath();
  const previewsDir = path.join(assetsDir, '.previews');

  if (!fs.existsSync(previewsDir)) {
    try {
      fs.mkdirSync(previewsDir, { recursive: true });
    } catch (e) {
      return;
    }
  }

  const discovered = state && state.discoveredModels ? state.discoveredModels : [];
  const allModels = ['procedural', ...discovered];
  const queue = allModels.filter(modelKey => {
    const previewPath = path.join(previewsDir, `${modelKey}.png`);
    return !fs.existsSync(previewPath);
  });

  if (queue.length > 0) {
    console.log(`Starting background preview generator for ${queue.length} models:`, queue);
    const intervalId = setInterval(() => {
      if (queue.length === 0) {
        clearInterval(intervalId);
        return;
      }

      const nextModel = queue.shift();
      generateMascotPreviewInBackground(ctx, nextModel);
    }, 1000);
  }
}

/**
 * Generates preview snapshot PNG offscreen in an isolated Three.js context.
 * @param {Object} ctx - Context dependencies.
 * @param {string} modelKey - Model key string.
 */
export function generateMascotPreviewInBackground(ctx, modelKey) {
  const {
    THREE,
    GLTFLoader,
    renderer,
    fs,
    path,
    pathToFileURL,
    getAssetsPath
  } = ctx;

  if (!renderer || !THREE) return;

  const assetsDir = getAssetsPath();
  const previewsDir = path.join(assetsDir, '.previews');
  const previewPath = path.join(previewsDir, `${modelKey}.png`);

  if (fs.existsSync(previewPath)) return;

  if (modelKey === 'procedural') {
    const previewScene = new THREE.Scene();
    const previewCamera = new THREE.PerspectiveCamera(45, 1.0, 0.1, 100);
    previewCamera.position.set(0, 0, 5.5);
    previewCamera.lookAt(0, 0, 0);

    const ambLight = new THREE.AmbientLight(0xffffff, 0.9);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(3, 4, 5);
    previewScene.add(ambLight);
    previewScene.add(dirLight);

    createProceduralMascot(THREE, previewScene);

    try {
      renderer.render(previewScene, previewCamera);
      const dataUrl = renderer.domElement.toDataURL("image/png");
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      fs.writeFileSync(previewPath, base64Data, 'base64');
      console.log(`Generated canonical preview for: procedural`);

      const imgEl = document.querySelector(`.mascot-thumbnail[data-mascot="procedural"]`);
      if (imgEl) {
        imgEl.src = pathToFileURL(previewPath).href + "?t=" + Date.now();
      }
    } catch (e) {
      console.warn("Failed background capture for procedural mascot:", e);
    }
  } else if (modelKey === 'flag') {
    const previewScene = new THREE.Scene();
    const previewCamera = new THREE.PerspectiveCamera(45, 1.0, 0.1, 100);
    previewCamera.position.set(0, 0.2, 5.2);
    previewCamera.lookAt(0, 0.2, 0);

    const ambLight = new THREE.AmbientLight(0xffffff, 0.9);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight.position.set(3, 4, 5);
    previewScene.add(ambLight);
    previewScene.add(dirLight);

    createFlagMesh(THREE, previewScene, ctx.currentSettings || {});

    try {
      renderer.render(previewScene, previewCamera);
      const dataUrl = renderer.domElement.toDataURL("image/png");
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      fs.writeFileSync(previewPath, base64Data, 'base64');
      console.log(`Generated canonical preview for: flag`);

      const imgEl = document.querySelector(`.mascot-thumbnail[data-mascot="flag"]`);
      if (imgEl) {
        imgEl.src = pathToFileURL(previewPath).href + "?t=" + Date.now();
      }
    } catch (e) {
      console.warn("Failed background capture for flag mesh:", e);
    }
  } else {
    const filePath = path.join(assetsDir, modelKey);
    let fileUrl = filePath;
    try {
      fileUrl = pathToFileURL(filePath).href;
    } catch (e) { }

    const loader = new GLTFLoader();
    loader.load(fileUrl, (gltf) => {
      const previewScene = new THREE.Scene();
      const previewCamera = new THREE.PerspectiveCamera(45, 1.0, 0.1, 100);

      const ambLight = new THREE.AmbientLight(0xffffff, 0.9);
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
      dirLight.position.set(3, 4, 5);
      previewScene.add(ambLight);
      previewScene.add(dirLight);

      const tempModel = gltf.scene;
      const tempGroup = new THREE.Group();
      previewScene.add(tempGroup);

      const box = new THREE.Box3().setFromObject(tempModel);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      tempModel.position.set(-center.x, -center.y, -center.z);

      const padding = 1.35;
      const innerGroup = new THREE.Group();
      innerGroup.add(tempModel);
      innerGroup.position.y = - size.y * (padding - 1) / 2;
      tempGroup.add(innerGroup);

      const visibleHeight = size.y * padding;
      const zPos = visibleHeight / (2 * Math.tan((previewCamera.fov * Math.PI) / 360));
      previewCamera.position.set(0, 0, zPos + (size.z / 2));
      previewCamera.lookAt(0, 0, 0);

      try {
        renderer.render(previewScene, previewCamera);
        const dataUrl = renderer.domElement.toDataURL("image/png");
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
        fs.writeFileSync(previewPath, base64Data, 'base64');
        console.log(`Generated canonical preview for custom model: ${modelKey}`);

        const imgEl = document.querySelector(`.mascot-thumbnail[data-mascot="${modelKey}"]`);
        if (imgEl) {
          imgEl.src = pathToFileURL(previewPath).href + "?t=" + Date.now();
        }
      } catch (e) {
        console.warn(`Failed background capture for custom model: ${modelKey}`, e);
      }
    }, undefined, (err) => {
      console.warn(`Failed to load ${modelKey} for background preview:`, err);
    });
  }
}

/**
 * Purges cached PNG previews and restarts background preview generation queue.
 * @param {Object} ctx - Context dependencies.
 */
export function forceRefreshAllPreviews(ctx) {
  const { fs, path, getAssetsPath, ipcRenderer } = ctx;
  const assetsDir = getAssetsPath();
  const previewsDir = path.join(assetsDir, '.previews');
  if (fs.existsSync(previewsDir)) {
    try {
      const files = fs.readdirSync(previewsDir);
      files.forEach(file => {
        const filePath = path.join(previewsDir, file);
        fs.unlinkSync(filePath);
      });
    } catch (e) {
      console.warn("Could not clear previews folder:", e);
    }
  }

  const thumbnails = document.querySelectorAll('.mascot-thumbnail');
  thumbnails.forEach(img => {
    img.src = DEFAULT_FALLBACK_ICON;
  });

  startBackgroundPreviewGenerator(ctx);

  if (ipcRenderer) {
    ipcRenderer.send('log-diagnostic', '[Preview Refresh] All mascot thumbnail previews refreshed.');
  }
}
