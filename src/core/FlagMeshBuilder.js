/**
 * Procedural 3D Waving Country Flag Mesh Builder & Cloth Simulation Engine
 * Constructs a metallic flagpole mast, base mount, finial ornament, and
 * subdivided double-sided cloth plane geometry with real-time wave physics deformation.
 */

/**
 * Creates default high-resolution procedural flag canvas textures.
 * Supported cool presets: 'cyber' | 'dragon' | 'galaxy' | 'sakura' | 'aurora' | 'ocean' | 'default'
 * (Also handles legacy presets gracefully)
 * @param {string} preset - Flag preset identifier
 * @returns {string} Data URL of the generated flag image
 */
export function createPresetFlagTexture(preset = 'dragon') {
  if (typeof document === 'undefined') {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');

  const w = canvas.width;
  const h = canvas.height;

  // Normalize preset and handle legacy mappings
  let p = (preset || 'dragon').toLowerCase();
  if (p === 'world') p = 'ocean';
  if (p === 'rainbow') p = 'aurora';
  if (p === 'star') p = 'galaxy';

  if (p === 'cyber') {
    // ⚡ Cyber Neon / Synthwave Grid
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#090a1a');
    grad.addColorStop(0.5, '#1e113a');
    grad.addColorStop(1, '#0c1626');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // High-tech neon cyan and purple grid
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.22)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= w; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Glowing diagonal laser stripes
    ctx.strokeStyle = 'rgba(255, 0, 128, 0.35)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.7);
    ctx.lineTo(w * 0.7, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.3, h);
    ctx.lineTo(w, h * 0.3);
    ctx.stroke();

    // Outer neon glowing frame
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 10;
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 20;
    ctx.strokeRect(30, 30, w - 60, h - 60);

    // Inner cyan frame
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 15;
    ctx.strokeRect(45, 45, w - 90, h - 90);

    // Central Cyber Hexagon & Pulse Star
    ctx.beginPath();
    drawHexagon(ctx, w / 2, h / 2, 140, '#00f0ff', 6);
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#00f0ff';
    drawStar(ctx, w / 2, h / 2, 8, 90, 45, '#00f0ff');
    drawStar(ctx, w / 2, h / 2, 4, 115, 25, '#ffffff');
    ctx.shadowBlur = 0;

  } else if (p === 'galaxy') {
    // 🌌 Cosmic Nebula / Starlight Cosmos
    const grad = ctx.createRadialGradient(w * 0.45, h * 0.5, 50, w / 2, h / 2, w * 0.7);
    grad.addColorStop(0, '#38165e');
    grad.addColorStop(0.4, '#1b0c36');
    grad.addColorStop(0.8, '#0b0821');
    grad.addColorStop(1, '#03020b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Nebula dust clouds
    const nebulaGlow = ctx.createRadialGradient(w * 0.65, h * 0.4, 30, w * 0.65, h * 0.4, 260);
    nebulaGlow.addColorStop(0, 'rgba(0, 210, 255, 0.35)');
    nebulaGlow.addColorStop(0.6, 'rgba(168, 85, 247, 0.20)');
    nebulaGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = nebulaGlow;
    ctx.fillRect(0, 0, w, h);

    const magentaGlow = ctx.createRadialGradient(w * 0.35, h * 0.6, 20, w * 0.35, h * 0.6, 220);
    magentaGlow.addColorStop(0, 'rgba(244, 63, 94, 0.32)');
    magentaGlow.addColorStop(0.7, 'rgba(139, 92, 246, 0.15)');
    magentaGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = magentaGlow;
    ctx.fillRect(0, 0, w, h);

    // Stardust field
    drawStardust(ctx, w, h, 80);

    // Constellation connecting lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(w * 0.25, h * 0.3);
    ctx.lineTo(w * 0.38, h * 0.22);
    ctx.lineTo(w * 0.5, h * 0.35);
    ctx.lineTo(w * 0.62, h * 0.25);
    ctx.lineTo(w * 0.75, h * 0.38);
    ctx.stroke();

    // Central Cosmic Ring & Diamond Star
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-0.35);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 160, 50, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 20;
    drawDiamondStar(ctx, w / 2, h / 2, 75, '#ffffff', '#ffd700');
    ctx.shadowBlur = 0;

    // Outer Celestial Gold Trim
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, w - 48, h - 48);

  } else if (p === 'sakura') {
    // 🌸 Sakura Blossom / Japanese Mon Crest
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#2d0918');
    grad.addColorStop(0.5, '#691b35');
    grad.addColorStop(1, '#a83258');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Soft misty sunrise circle behind crest
    const sunGlow = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, 220);
    sunGlow.addColorStop(0, 'rgba(255, 230, 240, 0.9)');
    sunGlow.addColorStop(0.5, 'rgba(254, 205, 211, 0.6)');
    sunGlow.addColorStop(1, 'rgba(244, 63, 94, 0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 220, 0, Math.PI * 2);
    ctx.fill();

    // Traditional Japanese Gold Crest (Mon) Circle
    ctx.strokeStyle = '#fcd34d';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 140, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(252, 211, 77, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 155, 0, Math.PI * 2);
    ctx.stroke();

    // Center Stylized 5-Petal Sakura Flower
    drawCherryBlossom(ctx, w / 2, h / 2, 85, '#ffffff', '#f43f5e', '#fcd34d');

    // Drifting Sakura Petals across the flag
    const petalCoords = [
      { x: w * 0.18, y: h * 0.22, r: 18, rot: 0.4 },
      { x: w * 0.28, y: h * 0.45, r: 14, rot: 1.1 },
      { x: w * 0.15, y: h * 0.72, r: 20, rot: -0.6 },
      { x: w * 0.78, y: h * 0.25, r: 16, rot: 0.8 },
      { x: w * 0.85, y: h * 0.55, r: 22, rot: -0.3 },
      { x: w * 0.72, y: h * 0.78, r: 15, rot: 0.5 }
    ];
    petalCoords.forEach(pt => drawPetal(ctx, pt.x, pt.y, pt.r, pt.rot, '#fecdd3', '#f43f5e'));

    // Elegant gold border
    ctx.strokeStyle = '#fcd34d';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, w - 40, h - 40);

  } else if (p === 'aurora') {
    // ❄️ Nordic Aurora / Northern Lights & Frost Star
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#020b14');
    grad.addColorStop(0.35, '#05232d');
    grad.addColorStop(0.7, '#073b3a');
    grad.addColorStop(1, '#031720');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Ethereal Aurora Wave Ribbons (Emerald & Cyan & Violet)
    drawAuroraBand(ctx, w, h, 0.25, '#10b981', 'rgba(16, 185, 129, 0.4)', 0.55);
    drawAuroraBand(ctx, w, h, 0.42, '#06b6d4', 'rgba(6, 182, 212, 0.45)', 0.7);
    drawAuroraBand(ctx, w, h, 0.60, '#8b5cf6', 'rgba(139, 92, 246, 0.35)', 0.4);

    // Distant stars in arctic sky
    drawStardust(ctx, w, h, 50);

    // Nordic 8-Point Frost Compass Star
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 22;
    drawNordicFrostStar(ctx, w / 2, h / 2, 110, '#e0f2fe', '#38bdf8');
    ctx.shadowBlur = 0;

    // Crystalline icy border
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 8;
    ctx.strokeRect(24, 24, w - 48, h - 48);

  } else if (p === 'eclipse') {
    // 🌑 Solar Eclipse / Minimalist Celestial Horizon
    ctx.fillStyle = '#0a0c10';
    ctx.fillRect(0, 0, w, h);

    // Subtle dark gradient horizon
    const horizonGrad = ctx.createLinearGradient(0, h * 0.45, 0, h);
    horizonGrad.addColorStop(0, 'rgba(15, 23, 42, 0)');
    horizonGrad.addColorStop(1, 'rgba(15, 23, 42, 0.7)');
    ctx.fillStyle = horizonGrad;
    ctx.fillRect(0, 0, w, h);

    // Minimalist Hairline Horizon Line
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, h * 0.62);
    ctx.lineTo(w - 40, h * 0.62);
    ctx.stroke();

    // Solar Eclipse Corona Glow
    const corona = ctx.createRadialGradient(w / 2, h * 0.46, 70, w / 2, h * 0.46, 175);
    corona.addColorStop(0, 'rgba(251, 191, 36, 0.95)');
    corona.addColorStop(0.3, 'rgba(245, 158, 11, 0.55)');
    corona.addColorStop(0.65, 'rgba(239, 68, 68, 0.25)');
    corona.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.46, 175, 0, Math.PI * 2);
    ctx.fill();

    // Minimalist Corona Ring
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.46, 88, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Dark Moon Disc (occluding sun)
    ctx.fillStyle = '#0a0c10';
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.46, 85, 0, Math.PI * 2);
    ctx.fill();

    // Radiant Diamond Flare at Top Edge of Eclipse
    drawDiamondStar(ctx, w / 2, h * 0.46 - 85, 32, '#ffffff', '#fde047');

    // Clean Minimalist Frame
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
    ctx.lineWidth = 3;
    ctx.strokeRect(32, 32, w - 64, h - 64);

  } else if (p === 'prism') {
    // 📐 Geometric Prism / Neo-Bauhaus Abstract Modernism
    ctx.fillStyle = '#11141a';
    ctx.fillRect(0, 0, w, h);

    // Dynamic diagonal color bands across canvas
    drawPrismBand(ctx, 0, h * 0.3, w, h * 0.1, '#06b6d4', 0.85); // Cyan band
    drawPrismBand(ctx, 0, h * 0.5, w, h * 0.35, '#f59e0b', 0.90); // Amber band
    drawPrismBand(ctx, 0, h * 0.72, w, h * 0.6, '#f43f5e', 0.85); // Coral magenta band

    // Clean geometric contrast triangle overlay
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(w * 0.2, 0);
    ctx.lineTo(w * 0.55, h);
    ctx.lineTo(0, h);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    // Re-draw clean crisp diagonal slice
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.2, 0);
    ctx.lineTo(w * 0.55, h);
    ctx.stroke();

    // Central Minimalist Geometric Ring & Focal Dot
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(w * 0.55, h * 0.45, 95, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Small minimalist focal dot
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(w * 0.55, h * 0.45, 20, 0, Math.PI * 2);
    ctx.fill();

    // Modernist hairline border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 4;
    ctx.strokeRect(28, 28, w - 56, h - 56);

  } else if (p === 'zen') {
    // ☯️ Zen Harmony / Enso & Balance
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, w, h);

    // Warm subtle radial aura
    const aura = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, 220);
    aura.addColorStop(0, 'rgba(251, 191, 36, 0.12)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, w, h);

    // Vertical subtle balance axis
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2, 40);
    ctx.lineTo(w / 2, h - 40);
    ctx.stroke();

    // Minimalist Brushed Gold Enso Circle
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(0, 0, 110, -Math.PI * 0.85, Math.PI * 0.75);
    ctx.stroke();

    // Counterpart Ivory Arc
    ctx.strokeStyle = '#f4f4f5';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, 88, Math.PI * 0.15, Math.PI * 1.75);
    ctx.stroke();

    // Minimalist Balance Nodes
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, -42, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f4f4f5';
    ctx.beginPath();
    ctx.arc(0, 42, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Zen minimalist frame
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, w - 60, h - 60);

  } else if (p === 'ocean') {
    // 🌊 Abyssal Wave / Maritime Compass & Tidal Swell
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#041726');
    grad.addColorStop(0.5, '#083344');
    grad.addColorStop(1, '#0e7490');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Dynamic wave curves across bottom
    drawOceanWaveLayer(ctx, w, h * 0.72, '#0891b2', 0.25);
    drawOceanWaveLayer(ctx, w, h * 0.82, '#0284c7', 0.45);
    drawOceanWaveLayer(ctx, w, h * 0.90, '#0369a1', 0.65);

    // Golden Navigator Compass Rose / Astrolabe
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 18;
    drawNavigationalCompass(ctx, w / 2, h * 0.45, 120, '#fbbf24', '#ffffff');
    ctx.shadowBlur = 0;

    // Nautical rope gold border
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 10;
    ctx.strokeRect(22, 22, w - 44, h - 44);

  } else {
    // 🐉 Default / Mythic Dragon & Golden Imperial Crest
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#130d17');
    grad.addColorStop(0.5, '#28111e');
    grad.addColorStop(1, '#0e0811');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Deep crimson/gold heraldic glow
    const halo = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, 240);
    halo.addColorStop(0, 'rgba(220, 38, 38, 0.45)');
    halo.addColorStop(0.6, 'rgba(217, 119, 6, 0.25)');
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);

    // Ornate Golden Crest Frame
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 10;
    ctx.strokeRect(24, 24, w - 48, h - 48);

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 3;
    ctx.strokeRect(38, 38, w - 76, h - 76);

    // Corner filigree flourishes
    drawCornerFlourish(ctx, 45, 45, 1, 1);
    drawCornerFlourish(ctx, w - 45, 45, -1, 1);
    drawCornerFlourish(ctx, 45, h - 45, 1, -1);
    drawCornerFlourish(ctx, w - 45, h - 45, -1, -1);

    // Central Sun Disc & Mythic Dragon Emblem
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 130, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 6;
    ctx.stroke();

    drawDragonEmblem(ctx, w / 2, h / 2, 100, '#fbbf24', '#ef4444');
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

/** Helper: Hexagon for Cyberpunk theme */
function drawHexagon(ctx, x, y, r, strokeColor, lineWidth = 4) {
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const hx = x + r * Math.cos(angle);
    const hy = y + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.stroke();
}

/** Helper: Diamond 4-point Celestial Star for Galaxy theme */
function drawDiamondStar(ctx, cx, cy, r, fill1, fill2) {
  ctx.fillStyle = fill1;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx, cy, cx + r * 0.35, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + r);
  ctx.quadraticCurveTo(cx, cy, cx - r * 0.35, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - r);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = fill2;
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + r * 0.35);
  ctx.quadraticCurveTo(cx, cy, cx + r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - r * 0.35);
  ctx.quadraticCurveTo(cx, cy, cx - r, cy);
  ctx.closePath();
  ctx.fill();
}

/** Helper: Stardust particle field generator */
function drawStardust(ctx, w, h, count = 60) {
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < count; i++) {
    const sx = (Math.sin(i * 997.3) * 0.5 + 0.5) * (w - 60) + 30;
    const sy = (Math.cos(i * 613.7) * 0.5 + 0.5) * (h - 60) + 30;
    const sr = (i % 5 === 0) ? 2.5 : 1.2;
    const opacity = (i % 3 === 0) ? 0.9 : 0.5;
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Helper: 5-Petal Japanese Cherry Blossom (Sakura) */
function drawCherryBlossom(ctx, cx, cy, r, petalFill, innerGlow, centerColor) {
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI * 2) / 5);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-r * 0.38, -r * 0.55, -r * 0.45, -r * 0.95, -r * 0.15, -r);
    ctx.lineTo(0, -r * 0.85); // Notch in petal tip
    ctx.lineTo(r * 0.15, -r);
    ctx.bezierCurveTo(r * 0.45, -r * 0.95, r * 0.38, -r * 0.55, 0, 0);
    ctx.fillStyle = petalFill;
    ctx.fill();
    ctx.strokeStyle = innerGlow;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
  // Center pistil / stamen
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = centerColor;
  ctx.fill();
  ctx.restore();
}

/** Helper: Drifting Sakura Petal */
function drawPetal(ctx, x, y, r, rot, fill, stroke) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.bezierCurveTo(r * 0.7, -r * 0.5, r * 0.6, r * 0.8, 0, r);
  ctx.bezierCurveTo(-r * 0.6, r * 0.8, -r * 0.7, -r * 0.5, 0, -r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

/** Helper: Radiant Aurora Wave Ribbon */
function drawAuroraBand(ctx, w, h, yRatio, strokeColor, glowColor, amplitude = 0.5) {
  ctx.save();
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 30;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 18;
  ctx.beginPath();
  const baseY = h * yRatio;
  for (let x = 0; x <= w; x += 20) {
    const wave = Math.sin(x * 0.008 + yRatio * 5) * 45 * amplitude + Math.cos(x * 0.015) * 20;
    if (x === 0) ctx.moveTo(x, baseY + wave);
    else ctx.lineTo(x, baseY + wave);
  }
  ctx.stroke();
  ctx.restore();
}

/** Helper: Nordic 8-Point Frost Star */
function drawNordicFrostStar(ctx, cx, cy, r, primaryColor, secondaryColor) {
  drawStar(ctx, cx, cy, 8, r, r * 0.32, primaryColor);
  drawStar(ctx, cx, cy, 8, r * 0.65, r * 0.15, secondaryColor);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

/** Helper: Ocean Wave Curve */
function drawOceanWaveLayer(ctx, w, startY, color, alpha) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(0, startY);
  for (let x = 0; x <= w; x += 30) {
    const y = startY + Math.sin(x * 0.012) * 22 + Math.cos(x * 0.024) * 12;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, 640);
  ctx.lineTo(0, 640);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Helper: Navigational Compass Rose */
function drawNavigationalCompass(ctx, cx, cy, r, goldColor, whiteColor) {
  ctx.strokeStyle = goldColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2);
  ctx.stroke();

  drawStar(ctx, cx, cy, 4, r * 1.15, r * 0.22, goldColor);
  drawStar(ctx, cx, cy, 4, r * 0.85, r * 0.18, whiteColor);
}

/** Helper: Mythic Dragon / Imperial Crest Silhouette */
function drawDragonEmblem(ctx, cx, cy, r, goldColor, flameColor) {
  ctx.save();
  ctx.translate(cx, cy);

  // Wings / Flame crest arc
  ctx.fillStyle = flameColor;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.8);
  ctx.bezierCurveTo(r * 0.9, -r * 0.9, r * 1.1, 0, r * 0.6, r * 0.6);
  ctx.bezierCurveTo(r * 0.4, r * 0.3, 0, r * 0.5, 0, 0);
  ctx.bezierCurveTo(0, r * 0.5, -r * 0.4, r * 0.3, -r * 0.6, r * 0.6);
  ctx.bezierCurveTo(-r * 1.1, 0, -r * 0.9, -r * 0.9, 0, -r * 0.8);
  ctx.fill();

  // Golden Dragon Core / Sun Crest
  ctx.fillStyle = goldColor;
  ctx.beginPath();
  ctx.arc(0, -r * 0.1, r * 0.42, 0, Math.PI * 2);
  ctx.fill();

  // Central 8-pointed golden sunburst
  drawStar(ctx, 0, -r * 0.1, 8, r * 0.65, r * 0.28, '#ffffff');
  ctx.restore();
}

/** Helper: Modernist Diagonal Prism Band */
function drawPrismBand(ctx, x1, y1, x2, y2, color, alpha = 0.85) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y1 - 80);
  ctx.lineTo(x2, y2 + 80);
  ctx.lineTo(x1, y2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Helper: Baroque Corner Filigree */
function drawCornerFlourish(ctx, x, y, dirX, dirY) {
  ctx.save();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y + dirY * 40);
  ctx.quadraticCurveTo(x, y, x + dirX * 40, y);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x + dirX * 16, y + dirY * 16, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#f59e0b';
  ctx.fill();
  ctx.restore();
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
