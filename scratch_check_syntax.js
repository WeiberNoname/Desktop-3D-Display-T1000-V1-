const fs = require('fs');
const path = require('path');

function getAllJsFiles(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'DesktopPet-win32-x64' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllJsFiles(fullPath));
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = getAllJsFiles('.');
console.log(`Checking ${files.length} JS/MJS files...`);

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  
  // Extract all imported identifiers and ensure they exist
  const importLines = content.match(/import\s+\{([^}]+)\}\s+from/g) || [];
  const importedNames = new Set();
  importLines.forEach(line => {
    const match = line.match(/import\s+\{([^}]+)\}\s+from/);
    if (match) {
      match[1].split(',').forEach(item => {
        const parts = item.trim().split(/\s+as\s+/);
        const name = parts[parts.length - 1].trim();
        if (name) importedNames.add(name);
      });
    }
  });

  // Check if any identifier called in code is undefined from known list
  // Specifically check renderer.js
  if (file.endsWith('renderer.js')) {
    const usedImports = [
      'buildSaveSettingsCallback', 'buildSaveSettingsConfig', 'createSettingsUIDelegates',
      'createInteractionDelegates', 'createRenderLoopDelegates', 'createModelDelegates',
      'createFormSyncManager', 'AppStore', 'SettingsManager', 'updateGearPositionUtil',
      'showSpeechBubble', 'updateSpotlightPositionUtil', 'updateStageLightingUtil',
      'createProceduralMascot', 'SakuraRainManager', 'setupInteractionUtil',
      'scanForModelsUtil', 'detectAndLoadAssetUtil', 'fallbackToProceduralUtil',
      'loadCustomModelUtil', 'applySelectedAnimationUtil', 'generateModelPreviewUtil',
      'populateModelDropdownUtil', 'startBackgroundPreviewGeneratorUtil',
      'generateMascotPreviewInBackgroundUtil', 'forceRefreshAllPreviewsUtil',
      'setupStudioTabsUtil', 'renderSpotlightCardsUIUtil', 'populateAnimationDropdownUtil',
      'syncSlidersUIUtil', 'handleSaveSettingsUtil', 'updateAnimationFrameUtil',
      'PreviewViewportEngine', 'updateFPSCameraUtil', 'updateXYZVisibilityUtil',
      'resetCameraAndPositionUtil', 'initializeAppUtil', 'setupSettingsUIUtil',
      'triggerInteractionUtil', 'onWindowResizeUtil', 'getModelLoaderCtxUtil',
      'getPreviewGeneratorCtxUtil'
    ];

    for (const id of usedImports) {
      if (content.includes(id) && !content.includes(`import`) && !importedNames.has(id)) {
        // check if imported or declared
        const isImported = importedNames.has(id) || content.includes(`import ${id}`) || content.includes(`import * as ${id}`);
        const isDeclared = content.includes(`function ${id}`) || content.includes(`const ${id}`) || content.includes(`let ${id}`);
        if (!isImported && !isDeclared) {
          console.error(`[ERROR] ${file} uses ${id} but it is NOT imported or declared!`);
        }
      }
    }
  }
}
console.log('Static audit completed.');
