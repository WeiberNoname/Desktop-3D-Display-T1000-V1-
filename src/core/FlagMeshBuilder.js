/**
 * Procedural 3D Waving Country Flag Mesh Builder & Cloth Simulation Engine
 * Constructs a metallic flagpole mast, base mount, finial ornament, and
 * subdivided double-sided cloth plane geometry with real-time wave physics deformation.
 */

/**
 * Creates default high-resolution procedural flag canvas textures.
 * @param {string} preset - 'default' | 'world' | 'cyber' | 'rainbow' | 'star'
 * @returns {string} Data URL of the generated flag image
 */
export function createPresetFlagTexture(preset = 'default') {
  if (typeof document === 'undefined') {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');

  const w = canvas.width;
  const h = canvas.height;

  if (preset === 'world') {
    // UN / World Cyan & Gold Banner with central laurel & globe motif
    ctx.fillStyle = '#006699';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    // Central Globe
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 170, 0, Math.PI * 2);
    ctx.fillStyle = '#0088cc';
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 10;
    ctx.stroke();

    // Longitude & Latitude rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, 90, 170, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w / 2 - 170, h / 2);
    ctx.lineTo(w / 2 + 170, h / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w / 2, h / 2 - 170);
    ctx.lineTo(w / 2, h / 2 + 170);
    ctx.stroke();

    // Gold Star Finials
    drawStar(ctx, w / 2, h / 2 - 210, 5, 28, 14, '#ffd700');
  } else if (preset === 'cyber') {
    // Cyberpunk Neon Grid Flag
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#0f0c29');
    grad.addColorStop(0.5, '#302b63');
    grad.addColorStop(1, '#24243e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Neon grid lines
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 3;
    for (let x = 0; x <= w; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Glowing Neon Hexagon & Circuit
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 14;
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 25;
    ctx.strokeRect(80, 80, w - 160, h - 160);

    drawStar(ctx, w / 2, h / 2, 6, 120, 60, '#00f0ff');
    ctx.shadowBlur = 0;
  } else if (preset === 'rainbow') {
    // Vibrant Pride 6-stripe rainbow flag
    const colors = ['#e40303', '#ff8c00', '#ffed00', '#008026', '#004dff', '#750787'];
    const stripeH = h / colors.length;
    colors.forEach((c, idx) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, idx * stripeH, w, stripeH);
    });
  } else if (preset === 'star') {
    // Royal Deep Navy & Gold Stars
    ctx.fillStyle = '#0a192f';
    ctx.fillRect(0, 0, w, h);

    // Golden cross stripes
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, h * 0.42, w, h * 0.16);
    ctx.fillRect(w * 0.30, 0, w * 0.10, h);

    // Center Emblem Star
    drawStar(ctx, w * 0.35, h / 2, 5, 85, 42, '#ffffff');
  } else {
    // Default Elegant Royal Country Tricolor Flag (Navy, Crimson, Gold with Lion/Sun Crest)
    const stripeW = w / 3;
    ctx.fillStyle = '#1e3a8a'; // Deep Royal Blue
    ctx.fillRect(0, 0, stripeW, h);
    ctx.fillStyle = '#f8fafc'; // Crisp White
    ctx.fillRect(stripeW, 0, stripeW, h);
    ctx.fillStyle = '#dc2626'; // Vibrant Crimson Red
    ctx.fillRect(stripeW * 2, 0, stripeW, h);

    // Center Gold Crest & Star
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 110, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 8;
    ctx.stroke();

    drawStar(ctx, w / 2, h / 2, 5, 80, 38, '#f59e0b');

    // Laurel golden border accents
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 12;
    ctx.strokeRect(16, 16, w - 32, h - 32);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Helper to draw multi-pointed stars on canvas.
 */
function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Constructs the native 3D Country Flag object hierarchy with flagpole and cloth mesh.
 * @param {Object} THREE - Three.js instance
 * @param {Object} scene - THREE.Scene
 * @param {Object} options - Custom settings { customTextureUrl, windSpeed, waveIntensity, roughness, metalness }
 * @returns {Object} { characterGroup, innerModelGroup, collisionProxy, flagClothMesh, flagpoleMesh }
 */
export function createFlagMesh(THREE, scene, options = {}) {
  if (!THREE || !scene) return null;

  const characterGroup = new THREE.Group();
  characterGroup.name = 'FlagCharacterGroup';

  const innerModelGroup = new THREE.Group();
  innerModelGroup.name = 'FlagInnerModelGroup';
  innerModelGroup.userData.isFlagMesh = true;
  characterGroup.add(innerModelGroup);

  // --- 1. Materials ---
  // Metallic Flagpole & Mounts
  const mastMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4af37, // Polished Brass / Gold
    metalness: 0.90,
    roughness: 0.20
  });

  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0x222226, // Sleek Dark Obsidian Base
    metalness: 0.60,
    roughness: 0.35
  });

  // Flag Cloth Material
  const textureUrl = options.customTextureUrl || createPresetFlagTexture(options.flagPreset || 'default');
  const textureLoader = new THREE.TextureLoader();
  const flagTexture = textureLoader.load(textureUrl);
  flagTexture.wrapS = THREE.RepeatWrapping;
  flagTexture.wrapT = THREE.RepeatWrapping;
  flagTexture.repeat.set(options.textureRepeatX || 1.0, options.textureRepeatY || 1.0);

  const clothMaterial = new THREE.MeshStandardMaterial({
    map: flagTexture,
    side: THREE.DoubleSide,
    roughness: options.textureRoughness !== undefined ? options.textureRoughness : 0.50,
    metalness: options.textureMetalness !== undefined ? options.textureMetalness : 0.05,
    shadowSide: THREE.DoubleSide
  });

  // --- 2. Flagpole Geometry ---
  const poleHeight = 3.6;
  const poleRadius = 0.045;
  const poleGeom = new THREE.CylinderGeometry(poleRadius * 0.85, poleRadius, poleHeight, 24);
  const poleMesh = new THREE.Mesh(poleGeom, mastMaterial);
  poleMesh.position.set(-1.15, 0.2, 0);
  poleMesh.castShadow = true;
  poleMesh.receiveShadow = true;
  innerModelGroup.add(poleMesh);

  // Finial Gold Sphere at top
  const finialGeom = new THREE.SphereGeometry(0.11, 20, 20);
  const finialMesh = new THREE.Mesh(finialGeom, mastMaterial);
  finialMesh.position.set(-1.15, poleHeight / 2 + 0.25, 0);
  innerModelGroup.add(finialMesh);

  // Sturdy Pedestal Base Stand
  const baseGeom = new THREE.CylinderGeometry(0.40, 0.48, 0.16, 32);
  const baseMesh = new THREE.Mesh(baseGeom, baseMaterial);
  baseMesh.position.set(-1.15, -poleHeight / 2 + 0.25, 0);
  baseMesh.receiveShadow = true;
  innerModelGroup.add(baseMesh);

  // Grommets & Mounting Fasteners
  const ringGeom = new THREE.TorusGeometry(0.065, 0.02, 12, 24);
  const ringTop = new THREE.Mesh(ringGeom, mastMaterial);
  ringTop.rotation.x = Math.PI / 2;
  ringTop.position.set(-1.15, 1.40, 0);
  innerModelGroup.add(ringTop);

  const ringBottom = new THREE.Mesh(ringGeom, mastMaterial);
  ringBottom.rotation.x = Math.PI / 2;
  ringBottom.position.set(-1.15, 0.0, 0);
  innerModelGroup.add(ringBottom);

  // --- 3. Waving Cloth Plane Geometry ---
  const flagWidth = 2.30;
  const flagHeight = 1.42;
  const segmentsX = 48; // Dense horizontal segments for smooth wind ripple curves
  const segmentsY = 30; // Vertical wave resolution
  const clothGeom = new THREE.PlaneGeometry(flagWidth, flagHeight, segmentsX, segmentsY);

  // Position flag so left edge aligns perfectly with pole
  clothGeom.translate(flagWidth / 2, 0, 0);

  // Cache initial original undeformed positions for harmonic wave calculations
  const originalPositions = clothGeom.attributes.position.array.slice();
  clothGeom.userData.originalPositions = originalPositions;
  clothGeom.userData.flagWidth = flagWidth;
  clothGeom.userData.flagHeight = flagHeight;

  const flagClothMesh = new THREE.Mesh(clothGeom, clothMaterial);
  flagClothMesh.name = 'WavingFlagCloth';
  flagClothMesh.position.set(-1.15, 0.70, 0);
  flagClothMesh.castShadow = true;
  flagClothMesh.receiveShadow = true;
  innerModelGroup.add(flagClothMesh);

  // Store references for dynamic texture update & animation
  innerModelGroup.userData.flagClothMesh = flagClothMesh;
  innerModelGroup.userData.clothMaterial = clothMaterial;

  // Collision proxy for mouse raycasting / physics dragging
  const collisionProxy = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 3.8, 0.8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  collisionProxy.position.set(0, 0.2, 0);
  innerModelGroup.add(collisionProxy);

  scene.add(characterGroup);

  return {
    characterGroup,
    innerModelGroup,
    collisionProxy,
    flagClothMesh,
    poleMesh
  };
}

/**
 * Updates vertex positions of the flag cloth mesh per frame to simulate realistic wind billowing.
 * @param {THREE.Mesh} clothMesh - Flag cloth mesh with custom userData.originalPositions.
 * @param {number} delta - Frame delta time.
 * @param {number} elapsed - Total elapsed time in seconds.
 * @param {number} windSpeed - Wind speed multiplier (default: 3.5).
 * @param {number} waveIntensity - Wave amplitude multiplier (default: 0.35).
 */
export function updateFlagWave(clothMesh, delta, elapsed, windSpeed = 3.5, waveIntensity = 0.35) {
  if (!clothMesh || !clothMesh.geometry || !clothMesh.geometry.attributes.position) return;

  const geom = clothMesh.geometry;
  const pos = geom.attributes.position;
  const orig = geom.userData ? (geom.userData.originalPositions || geom.userData.initialPositions) : null;
  const flagW = (geom.userData && geom.userData.flagWidth) || 2.30;
  if (!orig) return;

  const count = pos.count || (pos.array ? (pos.array.length / 3) : 0);
  const speed = windSpeed * 2.8;
  const intensity = waveIntensity * 0.45;

  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    const ox = orig[idx];
    const oy = orig[idx + 1];
    const oz = orig[idx + 2];

    // Distance ratio from pole (0 at mast anchor, 1 at free flying trailing edge)
    const factor = Math.min(1.0, Math.max(0.0, ox / flagW));

    // Progressive quadratic amplitude increase along flag length
    const progressiveAmp = Math.pow(factor, 1.35) * intensity;

    // Harmonic wind ripple equations (primary traveling sine + secondary high-frequency ripple)
    const wave1 = Math.sin(ox * 3.8 - elapsed * speed) * progressiveAmp;
    const wave2 = Math.sin(ox * 6.2 - elapsed * speed * 1.45 + oy * 1.8) * (progressiveAmp * 0.38);
    const wave3 = Math.cos(oy * 4.5 + elapsed * speed * 0.8) * (progressiveAmp * 0.22);

    // Natural Z-displacement (cloth billowing)
    pos.array[idx + 2] = oz + wave1 + wave2 + wave3;

    // Longitudinal X chord shortening (cloth contracts horizontally as wave depth increases)
    const xContraction = Math.sin(ox * 2.0 - elapsed * speed) * (progressiveAmp * 0.18);
    pos.array[idx] = ox - xContraction;

    // Subtle vertical Y fluttering at corners
    const yFlutter = Math.sin(ox * 4.2 - elapsed * speed * 1.2) * (progressiveAmp * 0.12);
    pos.array[idx + 1] = oy + yFlutter;
  }

  pos.needsUpdate = true;
  geom.computeVertexNormals();
}
