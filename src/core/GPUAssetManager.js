/**
 * Comprehensive GPU Asset & VRAM Lifecycle Manager (<100 lines)
 * Recursively cleans, disposes, and frees all geometries, materials,
 * textures, and skeletal bone buffers from WebGL VRAM to prevent memory leaks.
 */

/**
 * Recursively disposes all GPU resources associated with a material.
 * @param {Object} material - THREE.Material instance.
 */
export function disposeMaterial(material) {
  if (!material) return;

  // List of standard Three.js texture properties
  const textureSlots = [
    'map',
    'alphaMap',
    'aoMap',
    'bumpMap',
    'displacementMap',
    'emissiveMap',
    'envMap',
    'lightMap',
    'metalnessMap',
    'normalMap',
    'roughnessMap',
    'specularMap',
    'gradientMap'
  ];

  for (let i = 0; i < textureSlots.length; i++) {
    const slot = textureSlots[i];
    const tex = material[slot];
    if (tex && typeof tex.dispose === 'function') {
      try {
        tex.dispose();
      } catch (e) {
        console.warn(`Error disposing texture ${slot}:`, e);
      }
    }
  }

  // Dispose uniforms if it's a ShaderMaterial
  if (material.uniforms) {
    for (const key in material.uniforms) {
      const u = material.uniforms[key];
      if (u && u.value && u.value.isTexture && typeof u.value.dispose === 'function') {
        try {
          u.value.dispose();
        } catch (e) { }
      }
    }
  }

  try {
    material.dispose();
  } catch (e) {
    console.warn('Error disposing material:', e);
  }
}

/**
 * Traverses a 3D object hierarchy and aggressively disposes all geometries,
 * materials, textures, skeletons, and buffers from GPU memory.
 * @param {Object} rootNode - THREE.Object3D / THREE.Scene / THREE.Group to recursively clean.
 */
export function disposeHierarchy(rootNode) {
  if (!rootNode) return;

  if (typeof rootNode.traverse === 'function') {
    rootNode.traverse((child) => {
      // 1. Dispose Geometry & Buffers
      if (child.geometry && typeof child.geometry.dispose === 'function') {
        try {
          child.geometry.dispose();
        } catch (e) {
          console.warn('Error disposing geometry:', e);
        }
      }

      // 2. Dispose Materials & Attached Textures
      if (child.material) {
        if (Array.isArray(child.material)) {
          for (let i = 0; i < child.material.length; i++) {
            disposeMaterial(child.material[i]);
          }
        } else {
          disposeMaterial(child.material);
        }
      }

      // 3. Dispose Skeletal Rigging & Bone Textures
      if (child.skeleton) {
        if (child.skeleton.boneTexture && typeof child.skeleton.boneTexture.dispose === 'function') {
          try {
            child.skeleton.boneTexture.dispose();
          } catch (e) { }
        }
        if (typeof child.skeleton.dispose === 'function') {
          try {
            child.skeleton.dispose();
          } catch (e) { }
        }
      }
    });
  }

  // Remove all child references
  if (rootNode.children && Array.isArray(rootNode.children)) {
    while (rootNode.children.length > 0) {
      rootNode.remove(rootNode.children[0]);
    }
  }
}
