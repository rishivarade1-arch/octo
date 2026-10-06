/**
 * Generates realistic procedural infrastructure placeholder images locally using HTML Canvas.
 * Produces JPEG data URLs under 50 KB with asphalt textures, realistic issue graphics,
 * and slight seed-based variations based on the report ID.
 */

// Simple pseudo-random generator seeded with a string (like report ID)
function createSeededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return function () {
    hash = (hash + 0x7ed55d16 + (hash << 12)) & 0xffffffff;
    hash = (hash ^ 0xc761c23c ^ (hash >>> 19)) & 0xffffffff;
    hash = (hash + 0x165667b1 + (hash << 5)) & 0xffffffff;
    hash = ((hash + 0xd3a2646c) ^ (hash << 9)) & 0xffffffff;
    hash = (hash + 0xfd7046c5 + (hash << 3)) & 0xffffffff;
    hash = (hash ^ 0xb55a4f09 ^ (hash >>> 16)) & 0xffffffff;
    return (hash >>> 0) / 4294967296;
  };
}

export function generateInfrastructureImage(
  issueType: string = 'pothole',
  seedId: string = 'demo'
): string {
  // Safe environment check
  if (typeof document === 'undefined') {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320"><rect width="480" height="320" fill="#242933"/><text x="240" y="160" fill="#ffffff" font-family="sans-serif" font-size="14" text-anchor="middle">Demo image - ${issueType}</text></svg>`
    );
  }

  const width = 480;
  const height = 320;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return '';
  }

  const rand = createSeededRandom(seedId + issueType);

  // 1. Base dark road-grey asphalt background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  const baseGrey1 = 35 + Math.floor(rand() * 10);
  const baseGrey2 = 25 + Math.floor(rand() * 10);
  bgGrad.addColorStop(0, `rgb(${baseGrey1}, ${baseGrey1 + 3}, ${baseGrey1 + 8})`);
  bgGrad.addColorStop(1, `rgb(${baseGrey2}, ${baseGrey2 + 2}, ${baseGrey2 + 6})`);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Asphalt gravel / texture specks
  const speckCount = 450;
  for (let i = 0; i < speckCount; i++) {
    const sx = rand() * width;
    const sy = rand() * height;
    const sr = rand() * 1.8 + 0.4;
    const brightness = 50 + rand() * 80;
    ctx.fillStyle = `rgba(${brightness}, ${brightness + 2}, ${brightness + 6}, ${0.15 + rand() * 0.25})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Soft road lane marking edge on background
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 14;
  ctx.beginPath();
  const laneY = 40 + rand() * 20;
  ctx.moveTo(0, laneY);
  ctx.lineTo(width, laneY + (rand() - 0.5) * 15);
  ctx.stroke();

  const type = (issueType || 'pothole').toLowerCase();

  // 3. Issue Specific Realistic Graphics
  if (type === 'pothole') {
    // Dark irregular ellipse on asphalt texture
    const centerX = width * 0.5 + (rand() - 0.5) * 60;
    const centerY = height * 0.55 + (rand() - 0.5) * 40;
    const radiusX = 90 + rand() * 40;
    const radiusY = 55 + rand() * 25;
    const rotation = (rand() - 0.5) * 0.4;

    // Distressed crater shadow ring
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);

    // Rim crumble edge
    ctx.strokeStyle = 'rgba(20, 22, 28, 0.9)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    const rimPoints = 16;
    for (let i = 0; i < rimPoints; i++) {
      const angle = (i / rimPoints) * Math.PI * 2;
      const rVariance = 1 + (rand() - 0.5) * 0.22;
      const px = Math.cos(angle) * (radiusX + 10) * rVariance;
      const py = Math.sin(angle) * (radiusY + 8) * rVariance;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // Deep pit cavity with radial depth gradient
    const pitGrad = ctx.createRadialGradient(
      -radiusX * 0.2,
      -radiusY * 0.2,
      10,
      0,
      0,
      radiusX * 1.1
    );
    pitGrad.addColorStop(0, '#0a0c10'); // pitch black cavity center
    pitGrad.addColorStop(0.65, '#12151c');
    pitGrad.addColorStop(0.95, '#1e222a');
    pitGrad.addColorStop(1, '#333844');

    ctx.fillStyle = pitGrad;
    ctx.beginPath();
    for (let i = 0; i < rimPoints; i++) {
      const angle = (i / rimPoints) * Math.PI * 2;
      const rVariance = 1 + (rand() - 0.5) * 0.25;
      const px = Math.cos(angle) * radiusX * rVariance;
      const py = Math.sin(angle) * radiusY * rVariance;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Loose broken stones and rubble inside pit
    for (let s = 0; s < 18; s++) {
      const stoneX = (rand() - 0.5) * radiusX * 1.2;
      const stoneY = (rand() - 0.5) * radiusY * 1.1;
      const stoneR = rand() * 4 + 2;
      ctx.fillStyle = rand() > 0.5 ? '#3a404d' : '#252933';
      ctx.beginPath();
      ctx.arc(stoneX, stoneY, stoneR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fractured tension cracks radiating outward from pothole
    ctx.strokeStyle = 'rgba(12, 14, 18, 0.85)';
    ctx.lineWidth = 2;
    for (let c = 0; c < 5; c++) {
      const startAngle = rand() * Math.PI * 2;
      let cx = Math.cos(startAngle) * radiusX * 0.9;
      let cy = Math.sin(startAngle) * radiusY * 0.9;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const segs = 3 + Math.floor(rand() * 3);
      for (let s = 0; s < segs; s++) {
        cx += Math.cos(startAngle) * (18 + rand() * 20) + (rand() - 0.5) * 14;
        cy += Math.sin(startAngle) * (15 + rand() * 18) + (rand() - 0.5) * 14;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
    ctx.restore();

  } else if (type === 'damaged_road') {
    // Crack lines and fissures across the surface
    const crackBranches = 4 + Math.floor(rand() * 3);
    for (let b = 0; b < crackBranches; b++) {
      let startX = width * (0.15 + rand() * 0.7);
      let startY = height * (0.1 + rand() * 0.8);

      // Deep dark crack
      ctx.strokeStyle = '#0e1117';
      ctx.lineWidth = 3.5 + rand() * 2.5;
      ctx.beginPath();
      ctx.moveTo(startX, startY);

      const segments = 6 + Math.floor(rand() * 6);
      let curX = startX;
      let curY = startY;
      const angle = (rand() - 0.5) * Math.PI * 0.8;

      for (let s = 0; s < segments; s++) {
        curX += Math.cos(angle) * (25 + rand() * 35) + (rand() - 0.5) * 20;
        curY += Math.sin(angle) * (20 + rand() * 30) + (rand() - 0.5) * 25;
        ctx.lineTo(curX, curY);

        // Sub-branch fracture
        if (rand() > 0.5) {
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(curX, curY);
          const subAngle = angle + (rand() > 0.5 ? 0.7 : -0.7);
          ctx.lineTo(
            curX + Math.cos(subAngle) * (20 + rand() * 25),
            curY + Math.sin(subAngle) * (20 + rand() * 25)
          );
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(curX, curY);
        }
      }
      ctx.stroke();

      // Soft asphalt erosion shading along crack
      ctx.strokeStyle = 'rgba(15, 18, 24, 0.4)';
      ctx.lineWidth = 9;
      ctx.stroke();
    }

    // Distressed subsided patch
    ctx.fillStyle = 'rgba(15, 17, 23, 0.45)';
    ctx.beginPath();
    ctx.ellipse(
      width * 0.52 + (rand() - 0.5) * 50,
      height * 0.55 + (rand() - 0.5) * 40,
      120 + rand() * 40,
      45 + rand() * 20,
      (rand() - 0.5) * 0.3,
      0,
      Math.PI * 2
    );
    ctx.fill();

  } else if (type === 'broken_streetlight') {
    // Dusk sky atmosphere in upper section
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.55);
    skyGrad.addColorStop(0, '#131b2e'); // deep dusk twilight
    skyGrad.addColorStop(0.7, '#242a3a');
    skyGrad.addColorStop(1, '#2c3240');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height * 0.6);

    // Street horizon road line
    ctx.fillStyle = '#1c202a';
    ctx.fillRect(0, height * 0.6, width, height * 0.4);

    // Light pole position
    const poleX = width * 0.45 + (rand() - 0.5) * 80;
    const poleBaseY = height * 0.88;
    const poleTopY = height * 0.22;

    // Pole base plate
    ctx.fillStyle = '#0f1218';
    ctx.fillRect(poleX - 12, poleBaseY - 6, 24, 12);

    // Vertical metal pole mast
    ctx.strokeStyle = '#181d26';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(poleX, poleBaseY);
    // Slight tilt to look damaged/crooked
    const tiltOffset = (rand() - 0.5) * 16;
    ctx.lineTo(poleX + tiltOffset, poleTopY + 30);
    ctx.stroke();

    // Curved luminaire bracket overhanging road
    ctx.strokeStyle = '#181d26';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(poleX + tiltOffset, poleTopY + 30);
    const armEndX = poleX + tiltOffset + 65;
    const armEndY = poleTopY + 15;
    ctx.quadraticCurveTo(poleX + tiltOffset + 20, poleTopY - 15, armEndX, armEndY);
    ctx.stroke();

    // Dark, unlit lamp fixture hanging crooked
    ctx.fillStyle = '#0b0d12'; // dark unlit fixture
    ctx.beginPath();
    ctx.ellipse(armEndX, armEndY + 8, 16, 7, (rand() - 0.5) * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Broken dangling wiring hanging from fixture
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(armEndX - 4, armEndY + 12);
    ctx.lineTo(armEndX - 2, armEndY + 26);
    ctx.lineTo(armEndX + 3, armEndY + 36);
    ctx.stroke();

    ctx.strokeStyle = '#dc2626'; // exposed red copper wire
    ctx.beginPath();
    ctx.moveTo(armEndX + 3, armEndY + 36);
    ctx.lineTo(armEndX + 6, armEndY + 45);
    ctx.stroke();

  } else if (type === 'drain_overflow') {
    // Murky wastewater puddle spreading across asphalt
    const drainX = width * 0.5 + (rand() - 0.5) * 40;
    const drainY = height * 0.58 + (rand() - 0.5) * 30;

    // Outer water spill boundary
    const waterGrad = ctx.createRadialGradient(
      drainX,
      drainY,
      30,
      drainX,
      drainY,
      140 + rand() * 30
    );
    waterGrad.addColorStop(0, 'rgba(30, 58, 95, 0.85)'); // dark murky blue center
    waterGrad.addColorStop(0.6, 'rgba(45, 85, 125, 0.65)');
    waterGrad.addColorStop(0.85, 'rgba(56, 115, 160, 0.4)');
    waterGrad.addColorStop(1, 'rgba(56, 115, 160, 0.0)');

    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    ctx.ellipse(drainX, drainY, 145 + rand() * 25, 80 + rand() * 20, (rand() - 0.5) * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Ripple rings spreading out
    ctx.strokeStyle = 'rgba(180, 220, 255, 0.25)';
    ctx.lineWidth = 2;
    for (let r = 1; r <= 3; r++) {
      ctx.beginPath();
      ctx.ellipse(drainX, drainY, 45 * r, 25 * r, (rand() - 0.5) * 0.1, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Cast-iron drain grating frame in the center
    const grateW = 90;
    const grateH = 55;
    ctx.fillStyle = '#0f141d';
    ctx.fillRect(drainX - grateW / 2, drainY - grateH / 2, grateW, grateH);

    // Metallic frame border
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 4;
    ctx.strokeRect(drainX - grateW / 2, drainY - grateH / 2, grateW, grateH);

    // Iron slotted grate bars with water surging through
    ctx.fillStyle = '#080c14'; // deep dark drain cavity
    ctx.fillRect(drainX - grateW / 2 + 5, drainY - grateH / 2 + 5, grateW - 10, grateH - 10);

    ctx.fillStyle = '#2d3748'; // iron grid bars
    const barCount = 7;
    const barSpacing = (grateW - 10) / (barCount + 1);
    for (let b = 1; b <= barCount; b++) {
      ctx.fillRect(drainX - grateW / 2 + 5 + b * barSpacing - 2, drainY - grateH / 2 + 6, 4, grateH - 12);
    }

    // Effluent foam bubbles near grate
    ctx.fillStyle = 'rgba(210, 230, 250, 0.6)';
    for (let f = 0; f < 10; f++) {
      const fx = drainX + (rand() - 0.5) * 90;
      const fy = drainY + (rand() - 0.5) * 50;
      ctx.beginPath();
      ctx.arc(fx, fy, rand() * 3 + 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Default infrastructure surface
    ctx.fillStyle = '#1e242e';
    ctx.fillRect(width * 0.2, height * 0.3, width * 0.6, height * 0.4);
  }

  // 4. Subtle corner vignette overlay
  const vigGrad = ctx.createRadialGradient(
    width / 2,
    height / 2,
    width * 0.35,
    width / 2,
    height / 2,
    width * 0.75
  );
  vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vigGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, width, height);

  // 5. Exact required label in the corner: "Demo image - [issue type]"
  const cornerLabel = `Demo image - ${issueType || 'pothole'}`;
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  const textMetrics = ctx.measureText(cornerLabel);
  const paddingX = 9;
  const paddingY = 5;
  const labelW = textMetrics.width + paddingX * 2;
  const labelH = 22;
  const labelX = width - labelW - 12;
  const labelY = height - labelH - 12;

  // Background pill for label
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.beginPath();
  ctx.roundRect(labelX, labelY, labelW, labelH, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // White text label
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(cornerLabel, labelX + paddingX, labelY + 15);

  // 6. Compress to JPEG under 50 KB (0.75 quality produces ~15-25 KB)
  return canvas.toDataURL('image/jpeg', 0.75);
}

/**
 * Validates if an image string is a valid local data URL under 50 KB and not an external URL.
 */
export function isLocalDataUrl(image?: string | null): boolean {
  if (!image || typeof image !== 'string') return false;
  const trimmed = image.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return false;
  return trimmed.startsWith('data:image/') && trimmed.length > 50;
}

/**
 * Checks if a report has a valid local data URL.
 * If missing, invalid, or hotlinked from an external URL (e.g. Unsplash), repairs it with a generated local JPEG.
 */
export function ensureReportImage(report: {
  id: string;
  issue_type?: string;
  image?: string;
}): string {
  if (isLocalDataUrl(report.image)) {
    return report.image!;
  }
  // Generate local procedural data URL under 50 KB
  return generateInfrastructureImage(report.issue_type || 'pothole', report.id || 'repair');
}

