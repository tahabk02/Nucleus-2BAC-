import * as THREE from 'three';
import { HologramSpec } from '../types/lesson';

export function createGlowSpriteTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.22, 'rgba(255, 255, 255, 0.78)');
    grad.addColorStop(0.55, 'rgba(255, 255, 255, 0.18)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      8,
      size / 2,
      size / 2,
      size / 2
    );
    grad.addColorStop(0, 'rgba(2, 4, 12, 0.85)');
    grad.addColorStop(0.55, 'rgba(2, 4, 12, 0.35)');
    grad.addColorStop(1, 'rgba(2, 4, 12, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createPolarLabFloorTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#07090f';
    ctx.fillRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;

    const centerGlow = ctx.createRadialGradient(cx, cy, 16, cx, cy, size * 0.48);
    centerGlow.addColorStop(0, 'rgba(56, 189, 248, 0.14)');
    centerGlow.addColorStop(0.4, 'rgba(30, 58, 138, 0.08)');
    centerGlow.addColorStop(1, 'rgba(7, 9, 15, 0)');
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, size, size);

    // Subtle orthogonal hairlines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.045)';
    ctx.lineWidth = 1;
    const step = size / 16;
    for (let i = 0; i <= 16; i++) {
      const p = i * step;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }

    // Concentric precision observatory rings
    const radii = [110, 200, 310, 440];
    radii.forEach((r, idx) => {
      ctx.strokeStyle =
        idx % 2 === 0 ? 'rgba(56, 189, 248, 0.18)' : 'rgba(148, 163, 184, 0.10)';
      ctx.lineWidth = idx === 1 ? 1.5 : 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Degree markers
    ctx.strokeStyle = 'rgba(245, 176, 65, 0.30)';
    for (let deg = 0; deg < 360; deg += 10) {
      const rad = (deg * Math.PI) / 180;
      const inner = deg % 30 === 0 ? 296 : 304;
      const outer = 312;
      ctx.lineWidth = deg % 30 === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(rad) * inner, cy + Math.sin(rad) * inner);
      ctx.lineTo(cx + Math.cos(rad) * outer, cy + Math.sin(rad) * outer);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createHologramTexture(
  spec: HologramSpec,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const w = 768;
  const h = 420;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, w, h);

    // Architectural dark obsidian translucent card
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, 'rgba(13, 17, 28, 0.94)');
    bgGrad.addColorStop(1, 'rgba(7, 9, 15, 0.90)');
    roundRect(ctx, 12, 12, w - 24, h - 24, 18);
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // Subtle radial corner accent glow
    const glow = ctx.createRadialGradient(48, 48, 4, 48, 48, 280);
    glow.addColorStop(0, hexWithAlpha(spec.accentHex, 0.14));
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    roundRect(ctx, 12, 12, w - 24, h - 24, 18);
    ctx.fill();

    // Hairline perimeter
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 12, 12, w - 24, h - 24, 18);
    ctx.stroke();

    // Precision corner accents
    ctx.strokeStyle = spec.accentHex;
    ctx.lineWidth = 3;
    const cLen = 20;
    ctx.beginPath();
    ctx.moveTo(26, 26 + cLen);
    ctx.lineTo(26, 26);
    ctx.lineTo(26 + cLen, 26);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w - 26 - cLen, h - 26);
    ctx.lineTo(w - 26, h - 26);
    ctx.lineTo(w - 26, h - 26 - cLen);
    ctx.stroke();

    // Header typography
    ctx.fillStyle = spec.accentHex;
    ctx.font = '600 19px "JetBrains Mono", monospace';
    ctx.fillText(spec.title, 48, 66);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(spec.subtitle, 48, 96);

    // Clean hairline divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(48, 120);
    ctx.lineTo(w - 48, 120);
    ctx.stroke();

    // Clean unboxed formula lines separated by subtle hairlines
    let yOffset = 172;
    spec.formulaLines.forEach((line, idx) => {
      ctx.fillStyle = spec.accentHex;
      ctx.beginPath();
      ctx.arc(56, yOffset - 9, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f1f5f9';
      ctx.font = '600 28px "JetBrains Mono", monospace';
      ctx.fillText(line, 76, yOffset);

      if (idx < spec.formulaLines.length - 1) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(48, yOffset + 26);
        ctx.lineTo(w - 48, yOffset + 26);
        ctx.stroke();
      }

      yOffset += 78;
    });
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Renders a 16:9 procedural animated observatory VideoPlane canvas frame
 */
export function drawVideoMonitorFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  title: string,
  caption: string,
  accentHex: string,
  timeSec: number,
  playing: boolean
) {
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#080b14');
  grad.addColorStop(1, '#0d111c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Fine oscilloscope grid
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Soft radial highlight behind waveform
  const rad = ctx.createRadialGradient(width * 0.5, height * 0.55, 10, width * 0.5, height * 0.55, width * 0.45);
  rad.addColorStop(0, hexWithAlpha(accentHex, 0.16));
  rad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, width, height);

  // Dual animated physics waveform
  const waveBaseY = height * 0.56;
  ctx.strokeStyle = hexWithAlpha(accentHex, 0.30);
  ctx.lineWidth = 7;
  ctx.beginPath();
  for (let i = 0; i <= 120; i++) {
    const u = i / 120;
    const x = 36 + u * (width - 72);
    const envelope = Math.exp(-u * 1.9);
    const osc = Math.sin(u * 16 - timeSec * 4.0) * 30 * envelope;
    const y = waveBaseY - envelope * 68 + osc + 32;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Header strip
  ctx.fillStyle = accentHex;
  ctx.font = '600 15px "JetBrains Mono", monospace';
  ctx.fillText(playing ? 'Moniteur 3D · Lecture' : 'Moniteur 3D · Pause', 32, 42);

  ctx.fillStyle = '#f1f5f9';
  ctx.font = '600 24px "Outfit", sans-serif';
  ctx.fillText(title, 32, 80);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(caption.slice(0, 68), 32, height - 38);

  // Progress bar
  const progress = playing ? ((timeSec * 0.08) % 1) : 0.35;
  ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
  ctx.fillRect(32, height - 20, width - 64, 3);
  ctx.fillStyle = accentHex;
  ctx.fillRect(32, height - 20, (width - 64) * progress, 3);

  if (!playing) {
    ctx.fillStyle = 'rgba(5, 6, 15, 0.45)';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 32, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#e6f1ff';
    ctx.beginPath();
    ctx.moveTo(width / 2 - 9, height / 2 - 13);
    ctx.lineTo(width / 2 + 15, height / 2);
    ctx.lineTo(width / 2 - 9, height / 2 + 13);
    ctx.closePath();
    ctx.fill();
  }
}

function hexWithAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(0, 229, 255, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 4
): number {
  const words = text.split(/\s+/);
  let line = '';
  let currentY = y;
  let linesDrawn = 0;

  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      linesDrawn++;
      if (linesDrawn >= maxLines) {
        ctx.fillText(`${line}...`, x, currentY);
        return currentY + lineHeight;
      }
      ctx.fillText(line, x, currentY);
      line = words[i];
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

export interface CoursePageRenderInput {
  index: number;
  totalChapters?: number;
  title: string;
  subtitle: string;
  sheetRefs: string;
  keyDefinition: string;
  fxColorHex: string;
  formulaLines: string[];
  captions: string[];
  highlightText: string;
}

/**
 * Generates a high-resolution 1024x768 3D Lesson Page CanvasTexture
 */
export function createCoursePageTexture(
  page: CoursePageRenderInput,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const w = 1024;
  const h = 768;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#0c1222');
    bgGrad.addColorStop(1, '#060810');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle scientific grid overlay
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.05)';
    ctx.lineWidth = 1;
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

    // Soft radial aura top-left
    const aura = ctx.createRadialGradient(140, 110, 10, 140, 110, 420);
    aura.addColorStop(0, hexWithAlpha(page.fxColorHex, 0.2));
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, w, h);

    // Outer double border
    ctx.strokeStyle = hexWithAlpha(page.fxColorHex, 0.55);
    ctx.lineWidth = 3;
    roundRect(ctx, 18, 18, w - 36, h - 36, 20);
    ctx.stroke();

    // Header bar
    const maxIdxLabel = String(page.totalChapters ?? 9).padStart(2, '0');
    ctx.fillStyle = page.fxColorHex;
    ctx.font = '700 20px "JetBrains Mono", monospace';
    ctx.fillText(
      `CHAPITRE ${String(page.index).padStart(2, '0')} / ${maxIdxLabel}  ·  ${page.sheetRefs.toUpperCase()}`,
      48,
      66
    );

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 18px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('COURS 3D · 2BAC', w - 48, 66);
    ctx.textAlign = 'left';

    // Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 34px "Outfit", sans-serif';
    const cleanTitle = page.title.replace(/^\d+\.\s*/, '');
    let nextY = wrapCanvasText(ctx, cleanTitle, 48, 118, w - 96, 40, 2);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
    nextY = wrapCanvasText(ctx, page.subtitle, 48, nextY + 6, w - 96, 28, 2);

    // Hairline divider
    const divY = Math.max(204, nextY + 12);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(48, divY);
    ctx.lineTo(w - 48, divY);
    ctx.stroke();

    // Key Definition block
    const defTop = divY + 22;
    roundRect(ctx, 48, defTop, w - 96, 134, 14);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.fill();
    ctx.strokeStyle = hexWithAlpha(page.fxColorHex, 0.35);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = page.fxColorHex;
    ctx.font = '700 15px "JetBrains Mono", monospace';
    ctx.fillText('DÉFINITION & PRINCIPE CLÉ', 70, defTop + 30);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
    wrapCanvasText(ctx, page.keyDefinition, 70, defTop + 62, w - 140, 28, 3);

    // Formulas section
    let fY = defTop + 162;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 15px "JetBrains Mono", monospace';
    ctx.fillText('FORMULES ESSENTIELLES', 48, fY);
    fY += 22;

    page.formulaLines.slice(0, 3).forEach((line, idx) => {
      roundRect(ctx, 48, fY, w - 96, 68, 12);
      ctx.fillStyle = 'rgba(7, 10, 18, 0.88)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = page.fxColorHex;
      ctx.beginPath();
      ctx.arc(72, fY + 34, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 26px "JetBrains Mono", monospace';
      ctx.fillText(line, 92, fY + 42);

      if (page.captions[idx]) {
        ctx.fillStyle = '#64748b';
        ctx.font = '500 14px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(page.captions[idx].slice(0, 46), w - 68, fY + 40);
        ctx.textAlign = 'left';
      }
      fY += 80;
    });

    // Bottom Highlight & Signature
    if (page.highlightText) {
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '500 17px "Plus Jakarta Sans", sans-serif';
      wrapCanvasText(ctx, page.highlightText, 48, h - 74, w - 300, 24, 2);
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '600 15px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Taha Winmers × 2BAC', w - 48, h - 42);
    ctx.textAlign = 'left';
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Loads one of the handwritten 2BAC summary sheets and rotates it -90° onto a 1024x768
 * upright landscape CanvasTexture for the back face of each 3D Course Page.
 */
export function createHandwrittenSheetTexture(
  imagePath: string,
  sheetLabel: string,
  accentHex: string,
  maxAnisotropy: number,
  upright = false
): THREE.CanvasTexture {
  const w = 1024;
  const h = 768;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = hexWithAlpha(accentHex, 0.5);
    ctx.lineWidth = 4;
    roundRect(ctx, 16, 16, w - 32, h - 32, 18);
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 24px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Chargement ${sheetLabel}...`, w / 2, h / 2);
    ctx.textAlign = 'left';
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    if (!ctx) return;
    ctx.fillStyle = '#070a12';
    ctx.fillRect(0, 0, w, h);

    if (upright) {
      const pad = 22;
      const availW = w - pad * 2;
      const availH = h - pad * 2 - 44;
      const scale = Math.min(availW / img.width, availH / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      ctx.drawImage(
        img,
        (w - drawW) / 2,
        46 + (availH - drawH) / 2,
        drawW,
        drawH
      );
    } else {
      // Rotate -90 deg (counter-clockwise) so the rotated sheet sits upright horizontally
      ctx.save();
      ctx.translate(w / 2, h / 2 + 16);
      ctx.rotate(-Math.PI / 2);
      const pad = 28;
      const availW = h - pad * 2 - 42;
      const availH = w - pad * 2;
      const scale = Math.min(availW / img.width, availH / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    }

    // Top sleek label ribbon
    ctx.fillStyle = 'rgba(7, 10, 18, 0.9)';
    ctx.fillRect(0, 0, w, 46);
    ctx.fillStyle = accentHex;
    ctx.font = '700 18px "JetBrains Mono", monospace';
    ctx.fillText(`FICHE MANUSCRITE ORIGINALE · ${sheetLabel}`, 28, 30);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 16px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Taha Winmers · 2BAC', w - 28, 30);
    ctx.textAlign = 'left';

    ctx.strokeStyle = hexWithAlpha(accentHex, 0.65);
    ctx.lineWidth = 3;
    roundRect(ctx, 8, 8, w - 16, h - 16, 14);
    ctx.stroke();

    tex.needsUpdate = true;
  };
  img.src = imagePath;

  return tex;
}

export interface ComparatorPlateData {
  slotLabel: string;
  symbol: string;
  name: string;
  A: number;
  Z: number;
  N: number;
  stable: boolean;
  deltaMassU: number;
  bindingEnergyMeV: number;
  energyPerNucleonMeV: number;
  accentHex: string;
}

export function drawComparatorPlateCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: ComparatorPlateData
) {
  ctx.fillStyle = '#070a14';
  ctx.fillRect(0, 0, w, h);

  // Subtle vertical specular gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, hexWithAlpha(data.accentHex, 0.14));
  bgGrad.addColorStop(0.55, 'rgba(11, 15, 25, 0.96)');
  bgGrad.addColorStop(1, 'rgba(7, 9, 15, 0.98)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Crisp perimeter border
  ctx.strokeStyle = hexWithAlpha(data.accentHex, 0.65);
  ctx.lineWidth = 3;
  roundRect(ctx, 8, 8, w - 16, h - 16, 16);
  ctx.stroke();

  // Top hairline header
  ctx.fillStyle = data.accentHex;
  ctx.font = '700 17px "JetBrains Mono", monospace';
  ctx.fillText(data.slotLabel, 26, 38);

  ctx.fillStyle = data.stable ? '#34d399' : '#fbbf24';
  ctx.font = '600 16px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(data.stable ? 'STABLE' : 'INSTABLE', w - 26, 38);
  ctx.textAlign = 'left';

  // Nuclide notation A / Z X + Name
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 28px "JetBrains Mono", monospace';
  ctx.fillText(`${data.A}`, 26, 78);
  ctx.font = '700 22px "JetBrains Mono", monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`${data.Z}`, 26, 102);

  const symOffsetX = data.A >= 100 ? 86 : data.A >= 10 ? 70 : 54;
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 44px "Outfit", sans-serif';
  ctx.fillText(data.symbol, symOffsetX, 96);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(data.name, symOffsetX + 62, 88);

  // Hairline divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(26, 118);
  ctx.lineTo(w - 26, 118);
  ctx.stroke();

  // Nucleon composition line
  ctx.font = '600 18px "JetBrains Mono", monospace';
  ctx.fillStyle = '#ff6b52';
  ctx.fillText(`Z=${data.Z} p⁺`, 26, 148);
  ctx.fillStyle = '#9fd8ff';
  ctx.fillText(`N=${data.N} n⁰`, 168, 148);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`A=${data.A}`, 320, 148);

  // Mass defect & Binding Energy metrics
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 15px "JetBrains Mono", monospace';
  ctx.fillText('Défaut Δm', 26, 182);
  ctx.fillText('Liaison E_l', 194, 182);
  ctx.fillText('Cohésion E_l/A', 352, 182);

  ctx.fillStyle = '#fbbf24';
  ctx.font = '700 20px "JetBrains Mono", monospace';
  ctx.fillText(`${data.deltaMassU.toFixed(4)} u`, 26, 212);

  ctx.fillStyle = data.accentHex;
  ctx.fillText(`${data.bindingEnergyMeV.toFixed(1)} MeV`, 194, 212);

  ctx.fillStyle = '#34d399';
  ctx.fillText(`${data.energyPerNucleonMeV.toFixed(2)} MeV`, 352, 212);
}

