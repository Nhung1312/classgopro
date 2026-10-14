import type { Student } from '../types';

export interface PyramidSlot {
  student: Student;
  tierIndex: number;
  colIndex: number;
  isWinner: boolean;
  elimProgress: number;
}

/** Tier sizes depend only on class size, never on the selected winner. */
export function calculatePyramidTiers(n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [1];
  if (n === 2) return [1, 1];
  if (n === 3) return [1, 2];
  if (n === 4) return [1, 1, 2];
  if (n === 5) return [1, 2, 2];

  let r = 2;
  for (let candidate = 2; candidate <= 14; candidate++) {
    if ((candidate * (candidate + 1)) / 2 <= n) r = candidate;
  }
  const tiers = Array.from({ length: r }, (_, i) => i + 1);
  let remaining = n - (r * (r + 1)) / 2;
  let tierIdx = r - 1;
  while (remaining > 0) {
    tiers[tierIdx]++;
    remaining--;
    tierIdx--;
    if (tierIdx < 1) tierIdx = r - 1;
  }
  return tiers;
}

// Stable tie-breaker: visual order must NOT use the chosen winner.
const tieBreaker = (student: Student) => {
  let hash = 2166136261;
  for (const char of student.id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
};

/** Build a fixed pyramid layout. A winner can occupy ANY tier or block. */
export function buildPyramidLayout(students: Student[], winnerIds: ReadonlySet<string>) {
  const tiers = calculatePyramidTiers(students.length);
  const blocks: PyramidSlot[] = [];
  let offset = 0;
  for (let tierIndex = 0; tierIndex < tiers.length; tierIndex++) {
    for (let colIndex = 0; colIndex < tiers[tierIndex]; colIndex++) {
      const student = students[offset++];
      blocks.push({
        student, tierIndex, colIndex,
        isWinner: winnerIds.has(student.id),
        elimProgress: 0.5,
      });
    }
  }

  // Dissolve non-winners bottom-up while preserving ALL block positions.
  const nonWinners = blocks.filter(block => !block.isWinner).sort((a, b) =>
    b.tierIndex - a.tierIndex || tieBreaker(a.student) - tieBreaker(b.student)
  );
  nonWinners.forEach((block, idx) => {
    block.elimProgress = 0.08 + (idx / Math.max(1, nonWinners.length)) * 0.80;
  });
  return { tiers, blocks };
}
