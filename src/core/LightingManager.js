/**
 * Stage Lighting Manager
 * Handles stage spotlights, polar math transformations, frustum helpers,
 * and studio light intensity scaling.
 */

/**
 * Updates stage spotlight positions and properties based on configuration.
 * @param {Object} scene - THREE.Scene instance.
 * @param {Array} spotlights - Array of spotlight configuration objects.
 * @param {Array} stageSpotLights - Array of THREE.SpotLight instances in scene.
 * @param {Array} stageSpotLightHelpers - Array of THREE.SpotLightHelper instances.
 * @param {Boolean} isSettingsOpen - Flag indicating if settings UI is open.
 * @param {Object} THREE - Three.js library reference.
 */
export function updateSpotlightPosition(scene, spotlights, stageSpotLights, stageSpotLightHelpers, isSettingsOpen, THREE) {
  if (!scene || !THREE) return;

  let spots = spotlights;
  if (!Array.isArray(spots) || spots.length === 0) {
    spots = [{
      id: 1,
      enabled: true,
      angleH: 45,
      angleV: 60,
      cone: 35,
      intensity: 2.0,
      color: '#ffffff'
    }];
  }

  // Adjust THREE.SpotLight pool size matching spotlights count
  while (stageSpotLights.length < spots.length) {
    const light = new THREE.SpotLight(0xffffff, 2.0, 30, Math.PI / 5, 0.4, 1.0);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 30;
    light.shadow.bias = -0.001;
    scene.add(light);
    scene.add(light.target);

    const helper = new THREE.SpotLightHelper(light);
    helper.visible = false;
    scene.add(helper);

    stageSpotLights.push(light);
    stageSpotLightHelpers.push(helper);
  }

  // Remove excess lights if count decreased
  while (stageSpotLights.length > spots.length) {
    const light = stageSpotLights.pop();
    const helper = stageSpotLightHelpers.pop();
    if (light) {
      scene.remove(light);
      scene.remove(light.target);
      if (light.dispose) light.dispose();
    }
    if (helper) {
      scene.remove(helper);
      if (helper.dispose) helper.dispose();
    }
  }

  // Update properties for each spotlight in scene
  spots.forEach((spotConfig, idx) => {
    const light = stageSpotLights[idx];
    const helper = stageSpotLightHelpers[idx];
    if (!light) return;

    const isEnabled = !!spotConfig.enabled;
    light.visible = isEnabled;

    if (helper) {
      helper.visible = isEnabled && Boolean(isSettingsOpen);
    }

    if (!isEnabled) return;

    const angleH = typeof spotConfig.angleH === 'number' ? spotConfig.angleH : 45;
    const angleV = typeof spotConfig.angleV === 'number' ? spotConfig.angleV : 60;
    const coneDeg = typeof spotConfig.cone === 'number' ? spotConfig.cone : 35;
    const intensity = typeof spotConfig.intensity === 'number' ? spotConfig.intensity : 2.0;

    const radH = angleH * (Math.PI / 180);
    const radV = angleV * (Math.PI / 180);
    const radCone = (coneDeg * Math.PI) / 180;

    const radius = 6.0;
    const cosV = Math.cos(radV);
    const sinV = Math.sin(radV);
    const sinH = Math.sin(radH);
    const cosH = Math.cos(radH);

    const x = radius * cosV * sinH;
    const y = radius * sinV;
    const z = radius * cosV * cosH;

    light.position.set(x, y, z);
    light.angle = radCone;
    light.intensity = intensity;

    if (spotConfig.color) {
      light.color.set(spotConfig.color);
    }

    if (helper && helper.visible) {
      helper.update();
    }
  });
}

/**
 * Updates stage studio light intensities proportionally.
 * @param {Object} ambientLight - THREE.AmbientLight instance.
 * @param {Object} keyLight - THREE.DirectionalLight instance.
 * @param {Object} fillLight - THREE.PointLight instance.
 * @param {Object} rimLight - THREE.DirectionalLight instance.
 * @param {Object} settings - Current application settings.
 */
export function updateStageLighting(ambientLight, keyLight, fillLight, rimLight, settings) {
  if (!ambientLight) return;

  const isStudioEnabled = settings ? settings.enableStudioLights !== false : true;
  const masterAmb = settings && typeof settings.ambientIntensity === 'number' ? settings.ambientIntensity : 0.7;

  if (!isStudioEnabled) {
    ambientLight.intensity = 0;
    if (keyLight) keyLight.intensity = 0;
    if (fillLight) fillLight.intensity = 0;
    if (rimLight) rimLight.intensity = 0;
  } else {
    const factor = masterAmb / 0.7;
    ambientLight.intensity = masterAmb;
    if (keyLight) keyLight.intensity = 1.0 * factor;
    if (fillLight) fillLight.intensity = 0.6 * factor;
    if (rimLight) rimLight.intensity = 0.5 * factor;
  }
}
