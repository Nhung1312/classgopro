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
  const index = Math.max(0, Math.min(ARUCO_4X4_DICT.length - 1, cardId - 1));
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
function sampleBilinear(
  corners: Point[],
  u: number, // 0..1
  v: number  // 0..1
): Point {
  const [c0, c1, c2, c3] = corners; // c0: top-left, c1: top-right, c2: bottom-right, c3: bottom-left
  const topX = c0.x + (c1.x - c0.x) * u;
  const topY = c0.y + (c1.y - c0.y) * u;
  const botX = c3.x + (c2.x - c3.x) * u;
  const botY = c3.y + (c2.y - c3.y) * u;

  return {
    x: topX + (botX - topX) * v,
    y: topY + (botY - topY) * v,
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

  // 2. Contour detection (Border Following)
  // Scan for 0 -> 1 transitions
  const visited = new Uint8Array(width * height);
  const candidateQuads: Point[][] = [];

  const dx = [1, 1, 0, -1, -1, -1, 0, 1];
  const dy = [0, 1, 1, 1, 0, -1, -1, -1];

  const minPerimeter = Math.max(60, width * 0.08);
  const maxPerimeter = (width + height) * 1.8;

  for (let y = 4; y < height - 4; y += 2) {
    const yWidth = y * width;
    for (let x = 4; x < width - 4; x += 2) {
      const idx = yWidth + x;
      // Start of a black region not yet visited
      if (binary[idx] === 1 && binary[idx - 1] === 0 && visited[idx] === 0) {
        // Trace contour
        const contour: Point[] = [];
        let cx = x;
        let cy = y;
        let dir = 0;
        let steps = 0;
        const maxSteps = 2000;

        contour.push({ x: cx, y: cy });
        visited[cy * width + cx] = 1;

        while (steps < maxSteps) {
          let foundNext = false;
          for (let i = 0; i < 8; i++) {
            const nextDir = (dir + i) % 8;
            const nx = cx + dx[nextDir];
            const ny = cy + dy[nextDir];

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              if (binary[ny * width + nx] === 1) {
                cx = nx;
                cy = ny;
                dir = (nextDir + 5) % 8; // Turn back towards search direction
                foundNext = true;
                break;
              }
            }
          }

          if (!foundNext) break;
          contour.push({ x: cx, y: cy });
          visited[cy * width + cx] = 1;
          steps++;

          if (cx === x && cy === y) break; // Loop closed
        }

        if (contour.length >= 16) {
          // Calculate perimeter
          let perim = 0;
          for (let i = 0; i < contour.length; i++) {
            const next = contour[(i + 1) % contour.length];
            perim += dist(contour[i], next);
          }

          if (perim >= minPerimeter && perim <= maxPerimeter) {
            // Simplify polygon
            const simplified = ramerDouglasPeucker(contour, perim * 0.035);

            // Filter for 4 corners (or 5 if first/last coincide)
            let corners = simplified;
            if (corners.length === 5 && dist(corners[0], corners[4]) < 5) {
              corners = corners.slice(0, 4);
            }

            if (corners.length === 4) {
              // Check convexity
              let isConvex = true;
              let sign = 0;
              for (let i = 0; i < 4; i++) {
                const p0 = corners[i];
                const p1 = corners[(i + 1) % 4];
                const p2 = corners[(i + 2) % 4];
                const cross = (p1.x - p0.x) * (p2.y - p1.y) - (p1.y - p0.y) * (p2.x - p1.x);
                if (cross !== 0) {
                  if (sign === 0) sign = cross > 0 ? 1 : -1;
                  else if ((cross > 0 ? 1 : -1) !== sign) {
                    isConvex = false;
                    break;
                  }
                }
              }

              if (isConvex) {
                // Check aspect ratio of diagonals and edges
                const d1 = dist(corners[0], corners[2]);
                const d2 = dist(corners[1], corners[3]);
                const diagRatio = Math.max(d1, d2) / (Math.min(d1, d2) || 1);

                if (diagRatio < 2.4) {
                  candidateQuads.push(orderClockwise(corners));
                }
              }
            }
          }
        }
      }
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
        const pt = sampleBilinear(quad, u, v);
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
        const pt = sampleBilinear(quad, u, v);
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
