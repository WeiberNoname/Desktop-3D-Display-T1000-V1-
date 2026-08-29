/**
 * Procedural 3D Mascot Geometry Builder
 * Constructs the procedural 3D mascot mesh, physical shaders, materials,
 * facial elements, ears, limbs, and collision proxy box.
 */

/**
 * Creates and adds the procedural mascot 3D model to the scene.
 * @param {Object} THREE - Three.js instance.
 * @param {Object} scene - THREE.Scene instance.
 * @returns {Object} { characterGroup, innerModelGroup, collisionProxy }
 */
export function createProceduralMascot(THREE, scene) {
  if (!THREE || !scene) return null;

  const characterGroup = new THREE.Group();
  const innerModelGroup = new THREE.Group();
  characterGroup.add(innerModelGroup);

  // Premium, glossy clay/vinyl toy shaders
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xff7597, // Cute glossy pink
    roughness: 0.15,
    metalness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    sheen: 1.0,
    sheenColor: 0xffb6c1
  });

  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.1
  });

  const eyeHighlightMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff
  });

  const blushMaterial = new THREE.MeshBasicMaterial({
    color: 0xff4f7b,
    transparent: true,
    opacity: 0.7
  });

  const innerEarMaterial = new THREE.MeshStandardMaterial({
    color: 0xffa4b9,
    roughness: 0.3
  });

  const footMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xff4d72,
    roughness: 0.2,
    metalness: 0.05
  });

  // --- Main Body ---
  const bodyGeom = new THREE.SphereGeometry(1.0, 36, 36);
  const bodyMesh = new THREE.Mesh(bodyGeom, bodyMaterial);
  bodyMesh.scale.set(1.15, 0.95, 1.15);
  bodyMesh.position.y = -0.15;
  innerModelGroup.add(bodyMesh);

  // --- Eyes & Highlights ---
  const eyeGeom = new THREE.SphereGeometry(0.12, 16, 16);
  const highlightGeom = new THREE.SphereGeometry(0.04, 8, 8);

  // Left Eye
  const leftEye = new THREE.Mesh(eyeGeom, eyeMaterial);
  leftEye.position.set(-0.35, 0.05, 0.9);

  const leftEyeHighlight1 = new THREE.Mesh(highlightGeom, eyeHighlightMaterial);
  leftEyeHighlight1.position.set(-0.30, 0.11, 0.99);
  innerModelGroup.add(leftEye);
  innerModelGroup.add(leftEyeHighlight1);

  // Right Eye
  const rightEye = new THREE.Mesh(eyeGeom, eyeMaterial);
  rightEye.position.set(0.35, 0.05, 0.9);

  const rightEyeHighlight1 = new THREE.Mesh(highlightGeom, eyeHighlightMaterial);
  rightEyeHighlight1.position.set(0.40, 0.11, 0.99);
  innerModelGroup.add(rightEye);
  innerModelGroup.add(rightEyeHighlight1);

  // --- Blush Cheeks ---
  const blushGeom = new THREE.SphereGeometry(0.16, 16, 16);

  const leftBlush = new THREE.Mesh(blushGeom, blushMaterial);
  leftBlush.scale.set(1, 0.6, 0.2);
  leftBlush.position.set(-0.55, -0.12, 0.88);
  leftBlush.rotation.set(0.1, 0.3, -0.1);
  innerModelGroup.add(leftBlush);

  const rightBlush = new THREE.Mesh(blushGeom, blushMaterial);
  rightBlush.scale.set(1, 0.6, 0.2);
  rightBlush.position.set(0.55, -0.12, 0.88);
  rightBlush.rotation.set(0.1, -0.3, 0.1);
  innerModelGroup.add(rightBlush);

  // --- Cute Smile ---
  const smileGeom = new THREE.TorusGeometry(0.07, 0.02, 8, 24, Math.PI);
  const smileMesh = new THREE.Mesh(smileGeom, eyeMaterial);
  smileMesh.position.set(0, -0.06, 0.99);
  smileMesh.rotation.z = Math.PI; // Invert to curve upwards
  innerModelGroup.add(smileMesh);

  // --- Bunny/Cat Ears ---
  const earGeom = new THREE.ConeGeometry(0.2, 0.8, 18);

  // Left Ear
  const leftEarGroup = new THREE.Group();
  leftEarGroup.position.set(-0.45, 0.6, 0);
  leftEarGroup.rotation.z = 0.25;

  const leftEarOuter = new THREE.Mesh(earGeom, bodyMaterial);
  leftEarOuter.scale.set(1, 1, 0.6);
  leftEarGroup.add(leftEarOuter);

  const leftEarInner = new THREE.Mesh(earGeom, innerEarMaterial);
  leftEarInner.scale.set(0.7, 0.8, 0.4);
  leftEarInner.position.set(0, -0.05, 0.06);
  leftEarGroup.add(leftEarInner);

  innerModelGroup.add(leftEarGroup);

  // Right Ear
  const rightEarGroup = new THREE.Group();
  rightEarGroup.position.set(0.45, 0.6, 0);
  rightEarGroup.rotation.z = -0.25;

  const rightEarOuter = new THREE.Mesh(earGeom, bodyMaterial);
  rightEarOuter.scale.set(1, 1, 0.6);
  rightEarGroup.add(rightEarOuter);

  const rightEarInner = new THREE.Mesh(earGeom, innerEarMaterial);
  rightEarInner.scale.set(0.7, 0.8, 0.4);
  rightEarInner.position.set(0, -0.05, 0.06);
  rightEarGroup.add(rightEarInner);

  innerModelGroup.add(rightEarGroup);

  // --- Feet ---
  const footGeom = new THREE.SphereGeometry(0.22, 16, 16);

  const leftFoot = new THREE.Mesh(footGeom, footMaterial);
  leftFoot.scale.set(1.2, 0.7, 1.2);
  leftFoot.position.set(-0.4, -0.9, 0.2);
  innerModelGroup.add(leftFoot);

  const rightFoot = new THREE.Mesh(footGeom, footMaterial);
  rightFoot.scale.set(1.2, 0.7, 1.2);
  rightFoot.position.set(0.4, -0.9, 0.2);
  innerModelGroup.add(rightFoot);

  // Collision Proxy Box
  const proxyGeom = new THREE.BoxGeometry(1.6, 2.0, 1.6);
  const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
  const collisionProxy = new THREE.Mesh(proxyGeom, proxyMat);
  collisionProxy.position.set(0, 0, 0);
  innerModelGroup.add(collisionProxy);

  // Tilt character slightly forward towards camera
  characterGroup.rotation.x = 0.08;

  scene.add(characterGroup);

  return { characterGroup, innerModelGroup, collisionProxy };
}
