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
