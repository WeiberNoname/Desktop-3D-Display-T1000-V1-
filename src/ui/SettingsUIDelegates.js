/**
 * Settings UI Delegates Module (<80 lines)
 * Encapsulates setupSettingsUI delegation call.
 */

export function createSettingsUIDelegates(deps) {
  const {
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
    handleSaveSettings,
    resetCameraAndPosition,
    updateIgnoreMouseState,
    applySelectedAnimation,
    fallbackToProcedural,
    loadCustomModel,
    getAssetsPath,
    path,
    stateAccessors
  } = deps;

  return {
    setupSettingsUI: () => {
      setupSettingsUIUtil({
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
        setupStudioTabs: setupStudioTabsUtil,
        handleSaveSettings,
        resetCameraAndPosition,
        updateIgnoreMouseState,
        applySelectedAnimation,
        fallbackToProcedural,
        loadFlagModel: deps.loadFlagModel,
        loadCustomModel,
        getAssetsPath,
        path,
        state: stateAccessors
      });
    }
  };
}
