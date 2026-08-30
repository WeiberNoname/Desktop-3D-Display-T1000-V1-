/**
 * Texture & 3D Mesh Studio Tab UI Controller
 * Manages custom image uploading, drag-and-drop texture ingestion,
 * flag presets, wind physics tuning, and material shader adjustments.
 */

import { createPresetFlagTexture } from '../core/FlagMeshBuilder.js';

export function setupTextureTabUI(deps) {
  const { currentSettings, saveSettingsFile, t, THREE, getInnerModelGroup, forceRefreshAllPreviews } = deps;

  const fileInput = document.getElementById('texture-file-input');
  const browseBtn = document.getElementById('texture-browse-btn');
  const dropzone = document.getElementById('texture-dropzone');
  const previewImg = document.getElementById('texture-preview-img');
  const filenameLabel = document.getElementById('texture-filename');
  const resetBtn = document.getElementById('texture-reset-btn');

  const windSpeedSlider = document.getElementById('flag-wind-speed');
  const valWindSpeed = document.getElementById('val-flag-wind-speed');
  const waveIntensitySlider = document.getElementById('flag-wave-intensity');
  const valWaveIntensity = document.getElementById('val-flag-wave-intensity');

  const repeatXSlider = document.getElementById('texture-repeat-x');
  const valRepeatX = document.getElementById('val-texture-repeat-x');
  const repeatYSlider = document.getElementById('texture-repeat-y');
  const valRepeatY = document.getElementById('val-texture-repeat-y');

  const roughnessSlider = document.getElementById('texture-roughness');
  const valRoughness = document.getElementById('val-texture-roughness');
  const metalnessSlider = document.getElementById('texture-metalness');
  const valMetalness = document.getElementById('val-texture-metalness');

  const presetButtons = document.querySelectorAll('.flag-preset-btn');

  // Helper to apply texture to active flag / procedural mesh
  const applyTextureToActiveMesh = (textureUrl) => {
    const innerModel = typeof getInnerModelGroup === 'function' ? getInnerModelGroup() : null;
    if (!innerModel) return;

    // 1. If active model is the Waving Flag Cloth mesh
    if (innerModel.userData && innerModel.userData.flagClothMesh) {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(textureUrl, (loadedTex) => {
        loadedTex.wrapS = THREE.RepeatWrapping;
        loadedTex.wrapT = THREE.RepeatWrapping;
        loadedTex.repeat.set(currentSettings.textureRepeatX || 1.0, currentSettings.textureRepeatY || 1.0);

        const mat = innerModel.userData.flagClothMesh.material;
        if (mat) {
          mat.map = loadedTex;
          mat.roughness = currentSettings.textureRoughness !== undefined ? currentSettings.textureRoughness : 0.50;
          mat.metalness = currentSettings.textureMetalness !== undefined ? currentSettings.textureMetalness : 0.05;
          mat.needsUpdate = true;
        }
      });
      return;
    }

    // 2. If active model is a 3D mascot and user selected 'model_default', restore native materials!
    if (currentSettings.flagPreset === 'model_default' || !textureUrl) {
      innerModel.traverse((child) => {
        if (child.isMesh && child.userData.originalMaterial) {
          child.material = Array.isArray(child.userData.originalMaterial)
            ? child.userData.originalMaterial.map(m => m.clone())
            : child.userData.originalMaterial.clone();
          child.material.needsUpdate = true;
        }
      });
      return;
    }

    // 3. If user explicitly applies an image to a procedural/custom mascot
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(textureUrl, (loadedTex) => {
      loadedTex.flipY = false;
      loadedTex.wrapS = THREE.RepeatWrapping;
      loadedTex.wrapT = THREE.RepeatWrapping;
      loadedTex.repeat.set(currentSettings.textureRepeatX || 1.0, currentSettings.textureRepeatY || 1.0);

      innerModel.traverse((child) => {
        if (child.isMesh && child.material && !child.name.toLowerCase().includes('eye')) {
          const mat = Array.isArray(child.material) ? child.material[0] : child.material;
          mat.map = loadedTex;
          mat.roughness = currentSettings.textureRoughness !== undefined ? currentSettings.textureRoughness : 0.50;
          mat.metalness = currentSettings.textureMetalness !== undefined ? currentSettings.textureMetalness : 0.05;
          mat.needsUpdate = true;
        }
      });
    });
  };

  // Initial Sync from Settings
  const initialTexUrl = currentSettings.customTexturePath || createPresetFlagTexture(currentSettings.flagPreset || 'default');
  if (previewImg) {
    previewImg.src = initialTexUrl;
  }
  if (filenameLabel) {
    filenameLabel.innerText = currentSettings.customTexturePath ? (t('custom_image_loaded') || 'Custom Image Loaded') : (`Preset: ${currentSettings.flagPreset || 'default'}`);
  }

  if (windSpeedSlider) {
    windSpeedSlider.value = currentSettings.flagWindSpeed || 3.5;
    if (valWindSpeed) valWindSpeed.innerText = parseFloat(windSpeedSlider.value).toFixed(1);
  }
  if (waveIntensitySlider) {
    waveIntensitySlider.value = currentSettings.flagWaveIntensity || 0.35;
    if (valWaveIntensity) valWaveIntensity.innerText = parseFloat(waveIntensitySlider.value).toFixed(2);
  }
  if (repeatXSlider) {
    repeatXSlider.value = currentSettings.textureRepeatX || 1.0;
    if (valRepeatX) valRepeatX.innerText = parseFloat(repeatXSlider.value).toFixed(1);
  }
  if (repeatYSlider) {
    repeatYSlider.value = currentSettings.textureRepeatY || 1.0;
    if (valRepeatY) valRepeatY.innerText = parseFloat(repeatYSlider.value).toFixed(1);
  }
  if (roughnessSlider) {
    roughnessSlider.value = currentSettings.textureRoughness !== undefined ? currentSettings.textureRoughness : 0.50;
    if (valRoughness) valRoughness.innerText = parseFloat(roughnessSlider.value).toFixed(2);
  }
  if (metalnessSlider) {
    metalnessSlider.value = currentSettings.textureMetalness !== undefined ? currentSettings.textureMetalness : 0.05;
    if (valMetalness) valMetalness.innerText = parseFloat(metalnessSlider.value).toFixed(2);
  }

  // --- Upload / Drag-and-Drop Image Handlers ---
  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert(t('invalid_image_format') || 'Please select a valid image file (.png, .jpg, .webp, .svg)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      currentSettings.customTexturePath = dataUrl;
      currentSettings.flagPreset = 'custom';

      if (previewImg) previewImg.src = dataUrl;
      if (filenameLabel) filenameLabel.innerText = file.name || 'custom_texture.png';

      applyTextureToActiveMesh(dataUrl);
      if (saveSettingsFile) saveSettingsFile();
      if (forceRefreshAllPreviews) forceRefreshAllPreviews();
    };
    reader.readAsDataURL(file);
  };

  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', () => fileInput.click());
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleImageFile(e.target.files[0]);
      }
    });
  }

  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-over');
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleImageFile(e.dataTransfer.files[0]);
      }
    });
  }

  // --- Unified Flag & Texture Card Selection Grid ---
  const textureGrid = document.getElementById('texture-select-grid');
  const countBadge = document.getElementById('texture-count-badge');
  const registry = window.__assetRegistryManager || (typeof AssetRegistryManager !== 'undefined' ? AssetRegistryManager.getInstance() : null);

  const builtInPresets = [
    { id: 'eclipse', name: t('preset_eclipse', 'Solar Eclipse'), icon: '🌑', type: 'preset' },
    { id: 'prism', name: t('preset_prism', 'Geometric Prism'), icon: '📐', type: 'preset' },
    { id: 'zen', name: t('preset_zen', 'Zen Harmony'), icon: '☯️', type: 'preset' },
    { id: 'cyber', name: t('preset_cyber', 'Cyber Neon'), icon: '⚡', type: 'preset' },
    { id: 'dragon', name: t('preset_dragon', 'Mythic Dragon'), icon: '🐉', type: 'preset' },
    { id: 'galaxy', name: t('preset_galaxy', 'Cosmic Nebula'), icon: '🌌', type: 'preset' },
    { id: 'sakura', name: t('preset_sakura', 'Sakura Blossom'), icon: '🌸', type: 'preset' },
    { id: 'aurora', name: t('preset_aurora', 'Nordic Aurora'), icon: '❄️', type: 'preset' },
    { id: 'ocean', name: t('preset_ocean', 'Abyssal Wave'), icon: '🌊', type: 'preset' }
  ];

  const getModelEmbeddedTexture = () => {
    if (window.__activeModelDefaultTextureUrl) return window.__activeModelDefaultTextureUrl;
    const innerModel = typeof getInnerModelGroup === 'function' ? getInnerModelGroup() : null;
    if (!innerModel) return null;
    let foundTexUrl = null;
    innerModel.traverse((child) => {
      if (!foundTexUrl && child.isMesh && child.material && !child.name.includes('Eye') && child.name !== 'WavingFlagCloth') {
        const mat = Array.isArray(child.material) ? child.material[0] : child.material;
        if (mat && mat.map && mat.map.image) {
          const img = mat.map.image;
          try {
            if (typeof document !== 'undefined' && (img.width || img.naturalWidth)) {
              const canvas = document.createElement('canvas');
              canvas.width = img.width || img.naturalWidth || 512;
              canvas.height = img.height || img.naturalHeight || 512;
              const ctx2d = canvas.getContext('2d');
              ctx2d.drawImage(img, 0, 0, canvas.width, canvas.height);
              foundTexUrl = canvas.toDataURL('image/png');
              window.__activeModelDefaultTextureUrl = foundTexUrl;
            }
          } catch (e) {}
        }
      }
    });
    return foundTexUrl;
  };

  const renderTextureGrid = () => {
    if (!textureGrid) return;
    textureGrid.innerHTML = '';

    const modelTexUrl = getModelEmbeddedTexture();
    const modelPreset = modelTexUrl ? [{
      id: 'model_default',
      name: t('preset_model_default', 'Model Original Skin'),
      icon: '🎨',
      type: 'model_texture',
      objectUrl: modelTexUrl
    }] : [];

    const customAssets = registry ? registry.getAssets('texture') : [];
    const allItems = [...modelPreset, ...builtInPresets, ...customAssets];

    if (countBadge) {
      countBadge.textContent = `${allItems.length} Styles`;
    }

    allItems.forEach(item => {
      const card = document.createElement('div');
      const isPreset = item.type === 'preset';
      const isModelTex = item.type === 'model_texture';
      const texUrl = isPreset ? createPresetFlagTexture(item.id) : item.objectUrl;
      const isSelected = isPreset
        ? (currentSettings.flagPreset === item.id && !currentSettings.customTexturePath)
        : (currentSettings.customTexturePath === item.objectUrl || (isModelTex && currentSettings.flagPreset === 'model_default'));

      card.className = `studio-select-card ${isSelected ? 'selected' : ''}`;
      card.setAttribute('data-id', item.id);

      const defaultSub = isModelTex
        ? 'Active Model Skin'
        : (isPreset ? 'Built-in Flag' : ('Imported • ' + (item.sizeFormatted || 'Texture')));

      card.innerHTML = `
        <div class="studio-select-thumb asset-thumbnail-wrapper">
          <img src="${texUrl}" class="asset-thumbnail-img" alt="${item.name}">
        </div>
        <div class="studio-select-label asset-card-label" title="${item.name}">${isPreset || isModelTex ? item.icon + ' ' + item.name : item.name}</div>
        <div class="studio-select-sub asset-card-sub">${isSelected ? '🟢 Active' : defaultSub}</div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('#texture-select-grid .studio-select-card').forEach(c => {
          c.classList.remove('selected');
          const cSub = c.querySelector('.studio-select-sub');
          const cId = c.getAttribute('data-id');
          const cItem = allItems.find(it => it.id === cId);
          if (cSub && cItem) {
            cSub.textContent = cItem.type === 'model_texture'
              ? 'Active Model Skin'
              : (cItem.type === 'preset' ? 'Built-in Flag' : ('Imported • ' + (cItem.sizeFormatted || 'Texture')));
          }
        });
        card.classList.add('selected');
        const activeSub = card.querySelector('.studio-select-sub');
        if (activeSub) activeSub.textContent = '🟢 Active';

        if (isModelTex) {
          currentSettings.customTexturePath = item.objectUrl;
          currentSettings.flagPreset = 'model_default';
          if (filenameLabel) filenameLabel.innerText = item.name;
        } else if (isPreset) {
          currentSettings.customTexturePath = '';
          currentSettings.flagPreset = item.id;
          if (filenameLabel) filenameLabel.innerText = `Preset: ${item.id}`;
        } else {
          currentSettings.customTexturePath = item.objectUrl;
          currentSettings.flagPreset = 'custom';
          if (filenameLabel) filenameLabel.innerText = item.name;
        }

        if (previewImg) previewImg.src = texUrl;
        applyTextureToActiveMesh(texUrl);
        if (saveSettingsFile) saveSettingsFile();
        if (forceRefreshAllPreviews) forceRefreshAllPreviews();
      });

      textureGrid.appendChild(card);
    });
  };

  if (registry) {
    registry.subscribe(() => renderTextureGrid());
  }
  renderTextureGrid();

  // --- Reset Button ---
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const defaultUrl = createPresetFlagTexture('default');
      currentSettings.customTexturePath = '';
      currentSettings.flagPreset = 'default';
      currentSettings.flagWindSpeed = 3.5;
      currentSettings.flagWaveIntensity = 0.35;
      currentSettings.textureRepeatX = 1.0;
      currentSettings.textureRepeatY = 1.0;
      currentSettings.textureRoughness = 0.50;
      currentSettings.textureMetalness = 0.05;

      if (previewImg) previewImg.src = defaultUrl;
      if (filenameLabel) filenameLabel.innerText = 'Preset: default';

      if (windSpeedSlider) { windSpeedSlider.value = 3.5; if (valWindSpeed) valWindSpeed.innerText = '3.5'; }
      if (waveIntensitySlider) { waveIntensitySlider.value = 0.35; if (valWaveIntensity) valWaveIntensity.innerText = '0.35'; }
      if (repeatXSlider) { repeatXSlider.value = 1.0; if (valRepeatX) valRepeatX.innerText = '1.0'; }
      if (repeatYSlider) { repeatYSlider.value = 1.0; if (valRepeatY) valRepeatY.innerText = '1.0'; }
      if (roughnessSlider) { roughnessSlider.value = 0.50; if (valRoughness) valRoughness.innerText = '0.50'; }
      if (metalnessSlider) { metalnessSlider.value = 0.05; if (valMetalness) valMetalness.innerText = '0.05'; }

      applyTextureToActiveMesh(defaultUrl);
      if (saveSettingsFile) saveSettingsFile();
      if (forceRefreshAllPreviews) forceRefreshAllPreviews();
    });
  }

  // --- Slider Event Listeners ---
  if (windSpeedSlider) {
    windSpeedSlider.addEventListener('input', () => {
      const val = parseFloat(windSpeedSlider.value);
      if (valWindSpeed) valWindSpeed.innerText = val.toFixed(1);
      currentSettings.flagWindSpeed = val;
    });
    windSpeedSlider.addEventListener('change', () => { if (saveSettingsFile) saveSettingsFile(); });
  }

  if (waveIntensitySlider) {
    waveIntensitySlider.addEventListener('input', () => {
      const val = parseFloat(waveIntensitySlider.value);
      if (valWaveIntensity) valWaveIntensity.innerText = val.toFixed(2);
      currentSettings.flagWaveIntensity = val;
    });
    waveIntensitySlider.addEventListener('change', () => { if (saveSettingsFile) saveSettingsFile(); });
  }

  const updateMaterialProperties = () => {
    const innerModel = typeof getInnerModelGroup === 'function' ? getInnerModelGroup() : null;
    if (!innerModel) return;

    if (innerModel.userData && innerModel.userData.flagClothMesh) {
      const mat = innerModel.userData.flagClothMesh.material;
      if (mat) {
        if (mat.map) mat.map.repeat.set(currentSettings.textureRepeatX || 1.0, currentSettings.textureRepeatY || 1.0);
        mat.roughness = currentSettings.textureRoughness !== undefined ? currentSettings.textureRoughness : 0.50;
        mat.metalness = currentSettings.textureMetalness !== undefined ? currentSettings.textureMetalness : 0.05;
        mat.needsUpdate = true;
      }
    }
  };

  if (repeatXSlider) {
    repeatXSlider.addEventListener('input', () => {
      const val = parseFloat(repeatXSlider.value);
      if (valRepeatX) valRepeatX.innerText = val.toFixed(1);
      currentSettings.textureRepeatX = val;
      updateMaterialProperties();
    });
    repeatXSlider.addEventListener('change', () => { if (saveSettingsFile) saveSettingsFile(); });
  }

  if (repeatYSlider) {
    repeatYSlider.addEventListener('input', () => {
      const val = parseFloat(repeatYSlider.value);
      if (valRepeatY) valRepeatY.innerText = val.toFixed(1);
      currentSettings.textureRepeatY = val;
      updateMaterialProperties();
    });
    repeatYSlider.addEventListener('change', () => { if (saveSettingsFile) saveSettingsFile(); });
  }

  if (roughnessSlider) {
    roughnessSlider.addEventListener('input', () => {
      const val = parseFloat(roughnessSlider.value);
      if (valRoughness) valRoughness.innerText = val.toFixed(2);
      currentSettings.textureRoughness = val;
      updateMaterialProperties();
    });
    roughnessSlider.addEventListener('change', () => { if (saveSettingsFile) saveSettingsFile(); });
  }

  if (metalnessSlider) {
    metalnessSlider.addEventListener('input', () => {
      const val = parseFloat(metalnessSlider.value);
      if (valMetalness) valMetalness.innerText = val.toFixed(2);
      currentSettings.textureMetalness = val;
      updateMaterialProperties();
    });
    metalnessSlider.addEventListener('change', () => { if (saveSettingsFile) saveSettingsFile(); });
  }
}
