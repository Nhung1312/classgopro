import assert from 'node:assert/strict';
import { detectMarkersInCanvas, getCardMatrix6x6 } from '../src/services/arucoService';

function image(cardId: number | null, turns = 0) {
  const width = 320, height = 320;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  if (cardId !== null) {
    let matrix = getCardMatrix6x6(cardId);
    for (let k = 0; k < turns; k++) matrix = matrix[0].map((_, c) => matrix.map(row => row[c]).reverse());
    for (let y = 0; y < 192; y++) for (let x = 0; x < 192; x++) {
      const value = matrix[Math.floor(y / 32)][Math.floor(x / 32)] ? 0 : 255;
      const i = ((y + 64) * width + x + 64) * 4;
      data[i] = data[i + 1] = data[i + 2] = value;
    }
  }
  return { width, height, data };
}
for (const id of Array.from({ length: 120 }, (_, i) => i + 1)) {
  for (let rot = 0; rot < 4; rot++) {
    const frame = image(id, rot);
    const ctx = { getImageData: () => frame } as unknown as CanvasRenderingContext2D;
    const found = detectMarkersInCanvas(ctx, frame.width, frame.height);
    assert.equal(found.length, 1, `one card ${id}, clockwise rotation ${rot}: ${JSON.stringify(found)}`);
    assert.equal(found[0].cardId, id);
    assert.equal(found[0].option, ['A', 'D', 'C', 'B'][rot]);
  }
}
const blank = image(null);
assert.deepEqual(detectMarkersInCanvas({ getImageData: () => blank } as any, blank.width, blank.height), []);
console.log('PASS: image-to-marker pipeline, card identity and A/B/C/D orientations; blank frame rejected. Physical camera not tested.');


// Two realistic, mildly blurred and perspective-skewed cards in one camera frame.
// Single-card flat-image tests alone cannot detect regressions on mobile.
type Point = { x: number; y: number };
function projectCorners(quad: Point[]) {
  const [p0, p1, p2, p3] = quad;
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y, dy3 = p0.y - p1.y + p2.y - p3.y;
  const det = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / det;
  const h = (dx1 * dy3 - dx3 * dy1) / det;
  return {
    a: p1.x - p0.x + g * p1.x, b: p3.x - p0.x + h * p3.x, c: p0.x,
    d: p1.y - p0.y + g * p1.y, e: p3.y - p0.y + h * p3.y, f: p0.y, g, h,
  };
}
function drawObliqueCard(data: Uint8ClampedArray, width: number, height: number,
  cardId: number, x: number, y: number, size: number, tilt: number) {
  const quad: Point[] = [
    { x: x - size / 2 + size * tilt, y: y + size * tilt },
    { x: x + size / 2, y },
    { x: x + size / 2 - size * tilt, y: y + size },
    { x: x - size / 2, y: y + size - size * tilt },
  ];
  const { a, b, c, d, e, f, g, h } = projectCorners(quad);
  const matrix = getCardMatrix6x6(cardId);
  const left = Math.floor(Math.min(...quad.map(p => p.x))) - 1;
  const right = Math.ceil(Math.max(...quad.map(p => p.x))) + 1;
  const top = Math.floor(Math.min(...quad.map(p => p.y))) - 1;
  const bottom = Math.ceil(Math.max(...quad.map(p => p.y))) + 1;
  for (let py = Math.max(0, top); py < Math.min(height, bottom); py++) {
    for (let px = Math.max(0, left); px < Math.min(width, right); px++) {
      const xx = px - c, yy = py - f;
      const au = a - px * g, bu = b - px * h, du = d - py * g, eu = e - py * h;
      const det = au * eu - bu * du;
      if (Math.abs(det) < 1e-7) continue;
      const u = (xx * eu - bu * yy) / det;
      const v = (au * yy - xx * du) / det;
      if (u < 0 || v < 0 || u >= 1 || v >= 1) continue;
      const bit = matrix[Math.floor(v * 6)][Math.floor(u * 6)];
      const idx = (py * width + px) * 4;
      data[idx] = data[idx + 1] = data[idx + 2] = bit ? 0 : 255;
    }
  }
}
function twoCardFrame(size: number, tilt: number, blurred: boolean) {
  const width = 640, height = 360;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let p = 0; p < data.length; p += 4) {
    data[p] = data[p + 1] = data[p + 2] = 235;
    data[p + 3] = 255;
  }
  drawObliqueCard(data, width, height, 1, 200, 90, size, tilt);
  drawObliqueCard(data, width, height, 2, 400, 90, size, tilt);
  if (blurred) {
    const original = new Uint8ClampedArray(data);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const weight = (kx === 0 ? 2 : 1) * (ky === 0 ? 2 : 1);
            sum += original[((y + ky) * width + x + kx) * 4] * weight;
          }
        }
        const idx = (y * width + x) * 4;
        data[idx] = data[idx + 1] = data[idx + 2] = Math.round(sum / 16);
      }
    }
  }
  return { width, height, data };
}
for (const tc of [
  { size: 48, tilt: 0.10, blurred: false },
  { size: 48, tilt: 0.10, blurred: true },
  { size: 96, tilt: 0.18, blurred: false },
  { size: 96, tilt: 0.18, blurred: true },
]) {
  const frame = twoCardFrame(tc.size, tc.tilt, tc.blurred);
  const found = detectMarkersInCanvas(
    { getImageData: () => frame } as unknown as CanvasRenderingContext2D,
    frame.width, frame.height,
  );
  assert.deepEqual(found.map(marker => marker.cardId).sort((a, b) => a - b), [1, 2],
    `Two oblique cards must both be detected: ${JSON.stringify(tc)}: ${JSON.stringify(found)}`);
}
console.log('PASS: two perspective-skewed cards together, mild blur; no false IDs.');
