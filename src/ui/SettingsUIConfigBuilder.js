/**
 * Settings UI Config Builder Module (<75 lines)
 * Encapsulates dependency injection bundle construction for handleSaveSettings.
 */

export function buildSaveSettingsConfig(deps) {
  const {
    currentSettings,
    changeLanguage,
    updateStageLighting,
    updateSpotlightPosition,
    physicsEngine,
    saveSettingsFile,
    state,
    THREE,
    scene,
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
    populateModelDropdown
  } = deps;

  return {
    currentSettings,
    changeLanguage,
    updateStageLighting,
    updateSpotlightPosition,
    physicsEngine,
    saveSettingsFile,
    state,
    THREE,
    scene,
    camera,
    renderer,
    path,
    getAssetsPath,
    ipcRenderer,
    fallbackToProcedural,
    loadFlagModel: deps.loadFlagModel,
    loadCustomModel,
    applySelectedAnimation,
    updateGearPosition,
    updateXYZVisibility,
    populateModelDropdown
  };
}
