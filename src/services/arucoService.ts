/**
 * ClassGo Smart Response Cards - ArUco 4x4 Marker Engine & Detector
 *
 * Standard open fiducial marker system (4x4 data grid + 1-cell border = 6x6 matrix).
 * Supports 120 unique cards with inter-marker & inter-rotation Hamming distance >= 4.
 *
 * Orientation mapping:
 * - Top edge at TOP = 'A' (Rotation 0)
 * - Right edge at TOP = 'B' (Rotation 1 - 90 deg CW)
 * - Bottom edge at TOP = 'C' (Rotation 2 - 180 deg CW)
 * - Left edge at TOP = 'D' (Rotation 3 - 270 deg CW)
 */

import { CardOrientationAnswer, DetectedMarker } from '../types/responseCardTypes';

// Pre-generated optimal 120-card dictionary with Hamming Distance >= 4 across all 4 rotations
function generateDictionary(): number[][] {
  const targetCount = 120;
  const markers: number[][] = [];
  const rotationsList: number[][][] = [];

  function rotate4x4(bits: number[]): number[] {
    const res = new Array(16);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        res[c * 4 + (3 - r)] = bits[r * 4 + c];
      }
    }
    return res;
  }

  function hamming(a: number[], b: number[]): number {
    let d = 0;
    for (let i = 0; i < 16; i++) {
      if (a[i] !== b[i]) d++;
    }
    return d;
  }

  let seed = 133742;
  function rand(): number {
    seed = (seed * 16807 + 7) % 2147483647;
    return (seed % 65536) / 65536;
  }

  let attempts = 0;
  while (markers.length < targetCount && attempts < 200000) {
    attempts++;
    const cand: number[] = [];
    let ones = 0;
    for (let i = 0; i < 16; i++) {
      const bit = rand() > 0.5 ? 1 : 0;
      cand.push(bit);
      if (bit === 1) ones++;
    }
    // Balanced visual density
    if (ones < 6 || ones > 10) continue;

    const r0 = cand;
    const r1 = rotate4x4(r0);
    const r2 = rotate4x4(r1);
    const r3 = rotate4x4(r2);

    const selfDist = Math.min(
      hamming(r0, r1),
      hamming(r0, r2),
      hamming(r0, r3),
      hamming(r1, r2),
      hamming(r1, r3),
      hamming(r2, r3)
    );
    if (selfDist < 4) continue;

    let ok = true;
    for (const prevRots of rotationsList) {
      for (const pr of prevRots) {
        if (
          hamming(r0, pr) < 4 ||
          hamming(r1, pr) < 4 ||
          hamming(r2, pr) < 4 ||
          hamming(r3, pr) < 4
        ) {
          ok = false;
          break;
        }
      }
      if (!ok) break;
    }

    if (ok) {
      markers.push(cand);
      rotationsList.push([r0, r1, r2, r3]);
    }
  }

  return markers;
}

export const ARUCO_4X4_DICT: number[][] = generateDictionary();

/**
 * Returns 6x6 boolean matrix for a card ID (1-based, 1 to 120).
 * true = black, false = white
 */
export function getCardMatrix6x6(cardId: number): boolean[][] {
  if (!Number.isInteger(cardId) || cardId < 1 || cardId > ARUCO_4X4_DICT.length) throw new RangeError('Mã thẻ ngoài phạm vi 1–120.');
  const index = cardId - 1;
  const innerBits = ARUCO_4X4_DICT[index];

  const matrix: boolean[][] = [];
  for (let r = 0; r < 6; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < 6; c++) {
      if (r === 0 || r === 5 || c === 0 || c === 5) {
        // Outer border is solid black
        row.push(true);
      } else {
        // Inner 4x4 data
        const bit = innerBits[(r - 1) * 4 + (c - 1)];
        row.push(bit === 1);
      }
    }
    matrix.push(row);
  }
  return matrix;
}

/**
 * Generates an SVG string of the marker pattern
 */
export function getCardMarkerSVG(cardId: number, size = 240): string {
  const matrix = getCardMatrix6x6(cardId);
  const cellSize = size / 6;

  let rects = '';
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      if (matrix[r][c]) {
        rects += `<rect x="${(c * cellSize).toFixed(2)}" y="${(r * cellSize).toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="#000000" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="shape-rendering: crispEdges;">
    <rect width="${size}" height="${size}" fill="#ffffff" />
    ${rects}
  </svg>`;
}

// =========================================================================
// Real-time Computer Vision Detector
// =========================================================================

interface Point {
  x: number;
  y: number;
}

function dist(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Rotate 4x4 bit array 90 deg CW
function rotateBitsCW(bits: number[]): number[] {
  const res = new Array(16);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      res[c * 4 + (3 - r)] = bits[r * 4 + c];
    }
  }
  return res;
}

function hamming16(a: number[], b: number[]): number {
  let diff = 0;
  for (let i = 0; i < 16; i++) {
    if (a[i] !== b[i]) diff++;
  }
  return diff;
}

/**
 * Evaluates candidate 16 bits against dictionary in 4 rotations.
 * Returns matched card ID and rotation index (0: A, 1: B, 2: C, 3: D), or null if no match.
 */
function matchMarkerBits(bits: number[]): { cardId: number; rotation: number; confidence: number } | null {
  const r0 = bits;
  const r1 = rotateBitsCW(r0);
  const r2 = rotateBitsCW(r1);
  const r3 = rotateBitsCW(r2);
  const candidateRots = [r0, r1, r2, r3];

  let bestCardId = -1;
  let bestRotation = -1;
  let minDiff = 999;

  for (let idx = 0; idx < ARUCO_4X4_DICT.length; idx++) {
    const dictCode = ARUCO_4X4_DICT[idx];
    for (let rot = 0; rot < 4; rot++) {
      const d = hamming16(candidateRots[rot], dictCode);
      if (d < minDiff) {
        minDiff = d;
        bestCardId = idx + 1;
        bestRotation = rot;
      }
    }
    if (minDiff === 0) break; // Perfect match
  }

  // Tolerance: max 1 bit error allowed
  if (minDiff <= 1 && bestCardId > 0) {
    const confidence = minDiff === 0 ? 1.0 : 0.85;
    return { cardId: bestCardId, rotation: bestRotation, confidence };
  }

  return null;
}

/**
 * Bilinear sampling from quadrilateral corners
 */
/**
 * Map a unit-square marker cell into an oblique camera quadrilateral.
 * Perspective correction is essential when the card's far edge looks shorter.
 */
function samplePerspective(corners: Point[], u: number, v: number): Point {
  const [p0, p1, p2, p3] = corners;
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const dy3 = p0.y - p1.y + p2.y - p3.y;
  const determinant = dx1 * dy2 - dx2 * dy1;
  let g = 0;
  let h = 0;
  if (Math.abs(determinant) > 1e-9) {
    g = (dx3 * dy2 - dx2 * dy3) / determinant;
    h = (dx1 * dy3 - dx3 * dy1) / determinant;
  }
  const denominator = g * u + h * v + 1;
  return {
    x: ((p1.x - p0.x + g * p1.x) * u + (p3.x - p0.x + h * p3.x) * v + p0.x) / denominator,
    y: ((p1.y - p0.y + g * p1.y) * u + (p3.y - p0.y + h * p3.y) * v + p0.y) / denominator,
  };
}

/**
 * Fast polygonal contour simplification (Ramer-Douglas-Peucker)
 */
function ramerDouglasPeucker(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;
  const p1 = points[0];
  const p2 = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    // Perpendicular distance from p to line p1-p2
    const num = Math.abs((p2.y - p1.y) * p.x - (p2.x - p1.x) * p.y + p2.x * p1.y - p2.y * p1.x);
    const den = Math.sqrt((p2.y - p1.y) ** 2 + (p2.x - p1.x) ** 2) || 1;
    const d = num / den;
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const rec1 = ramerDouglasPeucker(points.slice(0, index + 1), epsilon);
    const rec2 = ramerDouglasPeucker(points.slice(index), epsilon);
    return rec1.slice(0, -1).concat(rec2);
  }

  return [p1, p2];
}

/** RDP requires distinct endpoints: split a closed contour into two open arcs. */
function simplifyClosedContour(contour: Point[], epsilon: number): Point[] {
  const ring = contour.length > 1 && dist(contour[0], contour[contour.length - 1]) < 1
    ? contour.slice(0, -1) : contour;
  if (ring.length < 4) return ring;
  let opposite = 1;
  for (let i = 2; i < ring.length; i++) {
    if (dist(ring[0], ring[i]) > dist(ring[0], ring[opposite])) opposite = i;
  }
  const a = ramerDouglasPeucker(ring.slice(0, opposite + 1), epsilon);
  const b = ramerDouglasPeucker([...ring.slice(opposite), ring[0]], epsilon);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

/**
 * Order corners clockwise starting from top-left (min sum of x+y)
 */
function orderClockwise(pts: Point[]): Point[] {
  // Compute centroid
  const cx = (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4;
  const cy = (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4;

  // Sort by angle around centroid
  const sorted = [...pts].sort((a, b) => {
    const angleA = Math.atan2(a.y - cy, a.x - cx);
    const angleB = Math.atan2(b.y - cy, b.x - cx);
    return angleA - angleB;
  });

  // Find top-left (minimum x + y)
  let tlIdx = 0;
  let minSum = sorted[0].x + sorted[0].y;
  for (let i = 1; i < 4; i++) {
    const s = sorted[i].x + sorted[i].y;
    if (s < minSum) {
      minSum = s;
      tlIdx = i;
    }
  }

  // Rotate array so top-left is at index 0
  return [
    sorted[tlIdx],
    sorted[(tlIdx + 1) % 4],
    sorted[(tlIdx + 2) % 4],
    sorted[(tlIdx + 3) % 4],
  ];
}

/**
 * Real-time Multi-marker detection on HTML Canvas ImageData
 */
export function detectMarkersInCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): DetectedMarker[] {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 1. Grayscale & Fast Local Adaptive Threshold
  const gray = new Uint8Array(width * height);
  let totalLuma = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const luma = (data[i] * 77 + data[i + 1] * 151 + data[i + 2] * 28) >> 8;
    gray[p] = luma;
    totalLuma += luma;
  }
  const avgLuma = totalLuma / (width * height);

  // Fast Integral Image for Adaptive Threshold
  const integral = new Uint32Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    const yWidth = y * width;
    const intRowCurrent = (y + 1) * (width + 1);
    const intRowPrev = y * (width + 1);

    for (let x = 0; x < width; x++) {
      rowSum += gray[yWidth + x];
      integral[intRowCurrent + (x + 1)] = integral[intRowPrev + (x + 1)] + rowSum;
    }
  }

  // Thresholded binary image: 1 for black (foreground), 0 for white
  const binary = new Uint8Array(width * height);
  const s = Math.max(8, Math.floor(width / 32));
  const t = 7; // threshold offset

  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - s);
    const y1 = Math.min(height, y + s);
    const rowOffset = y * width;

    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - s);
      const x1 = Math.min(width, x + s);
      const count = (x1 - x0) * (y1 - y0);

      const sum =
        integral[y1 * (width + 1) + x1] -
        integral[y0 * (width + 1) + x1] -
        integral[y1 * (width + 1) + x0] +
        integral[y0 * (width + 1) + x0];

      const threshold = (sum / count) - t;
      binary[rowOffset + x] = gray[rowOffset + x] < threshold ? 1 : 0;
    }
  }

  // 2. Trace actual black connected regions, not an arbitrary walk through
  // black interior pixels. The solid marker border is one connected region.
  const visited = new Uint8Array(width * height);
  const candidateQuads: Point[][] = [];
  const stack = new Int32Array(width * height);
  const minSide = 13;
  const minPixels = 30;

  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x <width - 2; x++) {
      const root = y * width + x;
      if (binary[root] !== 1 || visited[root] !== 0) continue;

      let top = 0;
      stack[top++] = root;
      visited[root] = 1;
      let count = 0;
      let minX = x, maxX = x, minY = y, maxY = y;
      let tl: Point = { x, y };
      let tr: Point = { x, y };
      let br: Point = { x, y };
      let bl: Point = { x, y };
      let minSum = x + y, maxSum = minSum;
      let minDiff = x - y, maxDiff = minDiff;
      let touchesBorder = false;

      while (top > 0) {
        const idx = stack[--top];
        const px = idx % width;
        const py = (idx / width) | 0;
        count++;
        if (px < 2 || py < 2 || px >= width - 2 || py >= height - 2) touchesBorder = true;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
        const sum = px + py;
        const diff = px - py;
        if (sum < minSum) { minSum = sum; tl = { x: px, y: py }; }
        if (sum > maxSum) { maxSum = sum; br = { x: px, y: py }; }
        if (diff > maxDiff) { maxDiff = diff; tr = { x: px, y: py }; }
        if (diff < minDiff) { minDiff = diff; bl = { x: px, y: py }; }

        for (let oy = -1; oy <= 1; oy++) {
          const ny = py + oy;
          if (ny < 0 || ny >= height) continue;
          for (let ox = -1; ox <= 1; ox++) {
            const nx = px + ox;
            if ((ox === 0 && oy === 0) || nx < 0 || nx >= width) continue;
            const neighbor = ny * width + nx;
            if (binary[neighbor] === 1 && visited[neighbor] === 0) {
              visited[neighbor] = 1;
              stack[top++] = neighbor;
            }
          }
        }
      }

      if (touchesBorder || count < minPixels) continue;
      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      if (w < minSide || h < minSide || Math.max(w, h) / Math.min(w, h) > 2) continue;
      // Skip dense full-screen patches and tiny line/noise components.
      if (w > width * 0.8 || h > height * 0.8 || count < 0.7 * (w + h)) continue;

      const corners = [tl, tr, br, bl];
      const signedArea =
        (tl.x * tr.y - tr.x * tl.y) +
        (tr.x * br.y - br.x * tr.y) +
        (br.x * bl.y - bl.x * br.y) +
        (bl.x * tl.y - tl.x * bl.y);
      if (Math.abs(signedArea) / 2 < w * h * 0.28) continue;
      const d1 = dist(tl, br);
      const d2 = dist(tr, bl);
      if (Math.max(d1, d2) / (Math.min(d1, d2) || 1) > 2.4) continue;
      candidateQuads.push(corners);
    }
  }

  // 3. Perspective Grid Sampling & Decoding
  const detectedList: DetectedMarker[] = [];
  const orientationKeys: CardOrientationAnswer[] = ['A', 'B', 'C', 'D'];

  for (const quad of candidateQuads) {
    // 6x6 sampling
    let borderBlackCount = 0;
    let borderTotal = 0;
    const innerBits: number[] = new Array(16);

    // Compute local average luma inside the quad to determine threshold
    let quadLumaSum = 0;
    let quadSamples = 0;
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const u = (c + 0.5) / 6;
        const v = (r + 0.5) / 6;
        const pt = samplePerspective(quad, u, v);
        const px = Math.min(width - 1, Math.max(0, Math.round(pt.x)));
        const py = Math.min(height - 1, Math.max(0, Math.round(pt.y)));
        quadLumaSum += gray[py * width + px];
        quadSamples++;
      }
    }
    const localQuadThreshold = quadLumaSum / (quadSamples || 1);

    // Sample cells
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const u = (c + 0.5) / 6;
        const v = (r + 0.5) / 6;
        const pt = samplePerspective(quad, u, v);
        const px = Math.min(width - 1, Math.max(0, Math.round(pt.x)));
        const py = Math.min(height - 1, Math.max(0, Math.round(pt.y)));

        const isBlack = gray[py * width + px] < localQuadThreshold;

        if (r === 0 || r === 5 || c === 0 || c === 5) {
          borderTotal++;
          if (isBlack) borderBlackCount++;
        } else {
          const bitIndex = (r - 1) * 4 + (c - 1);
          innerBits[bitIndex] = isBlack ? 1 : 0;
        }
      }
    }

    // Border check: At least 18 out of 20 border cells must be black
    if (borderBlackCount < 18) continue;

    // Match inner 4x4 bits
    const match = matchMarkerBits(innerBits);
    if (match) {
      const option = orientationKeys[match.rotation];
      detectedList.push({
        cardId: match.cardId,
        option,
        confidence: match.confidence,
        corners: quad,
      });
    }
  }

  // Deduplicate markers detected multiple times in the same frame
  const uniqueMap = new Map<number, DetectedMarker>();
  for (const m of detectedList) {
    if (!uniqueMap.has(m.cardId) || (uniqueMap.get(m.cardId)!.confidence < m.confidence)) {
      uniqueMap.set(m.cardId, m);
    }
  }

  return Array.from(uniqueMap.values());
}

/**
 * Temporal Stability Tracker to confirm detections across multiple video frames
 */
export class MarkerTemporalTracker {
  private history: Map<number, Array<{ option: CardOrientationAnswer; timestamp: number }>> = new Map();
  private confirmed: Map<number, { option: CardOrientationAnswer; timestamp: number }> = new Map();

  /**
   * Updates tracker with markers detected in current frame.
   * Returns list of confirmed markers in this frame.
   */
  public update(frameMarkers: DetectedMarker[], now = Date.now()): DetectedMarker[] {
    const confirmedNow: DetectedMarker[] = [];

    // Add current detections to history
    for (const m of frameMarkers) {
      if (!this.history.has(m.cardId)) {
        this.history.set(m.cardId, []);
      }
      const list = this.history.get(m.cardId)!;
      list.push({ option: m.option, timestamp: now });

      // Keep only last 400ms
      while (list.length > 0 && now - list[0].timestamp > 450) {
        list.shift();
      }

      // Check if candidate option has appeared at least twice with same option
      const countForOption = list.filter((item) => item.option === m.option).length;
      if (countForOption >= 2 || m.confidence >= 0.95) {
        this.confirmed.set(m.cardId, { option: m.option, timestamp: now });
        confirmedNow.push(m);
      }
    }

    return confirmedNow;
  }

  public getConfirmedOption(cardId: number): CardOrientationAnswer | undefined {
    return this.confirmed.get(cardId)?.option;
  }

  public reset(): void {
    this.history.clear();
    this.confirmed.clear();
  }
}
