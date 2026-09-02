import { SelectionMode, Student } from '../types';

export interface SelectionResult {
  selected: Student;
  selectedIndex: number;
  minCallCount: number;
  maxCallCount: number;
  candidatePool: Student[];
  candidateCount: number;
  totalStudents: number;
  explanation: string;
}

export interface MultiSelectionResult {
  selectedStudents: Student[];
  totalEligible: number;
  mode: SelectionMode;
  explanation: string;
}

/**
 * Filter students eligible for selection (excluding absent students)
 */
export function getEligibleStudents(students: Student[]): Student[] {
  if (!students) return [];
  return students.filter((s) => !s.isAbsent);
}

/**
 * Executes the Fair Selection or Pure Random Selection algorithm for 1 student.
 */
export function chooseStudent(
  students: Student[],
  mode: SelectionMode = 'FAIR'
): SelectionResult | null {
  const eligible = getEligibleStudents(students);
  if (eligible.length === 0) {
    return null;
  }

  const callCounts = eligible.map((s) => s.callCount || 0);
  const minCallCount = Math.min(...callCounts);
  const maxCallCount = Math.max(...callCounts);

  let candidatePool: Student[];
  let explanation = '';

  if (mode === 'FAIR') {
    candidatePool = eligible.filter((s) => (s.callCount || 0) === minCallCount);
    if (minCallCount === maxCallCount) {
      explanation = `Tất cả ${eligible.length} học sinh có mặt có cùng số lần lên bảng (${minCallCount} lần). Cơ hội chia đều.`;
    } else {
      explanation = `Ưu tiên ${candidatePool.length}/${eligible.length} học sinh có số lần lên bảng thấp nhất (${minCallCount} lần).`;
    }
  } else {
    // Pure random
    candidatePool = [...eligible];
    explanation = `Chế độ ngẫu nhiên hoàn toàn trong ${eligible.length} học sinh có mặt.`;
  }

  // Uniformly pick one student from the candidate pool
  const randomIndex = Math.floor(Math.random() * candidatePool.length);
  const selected = candidatePool[randomIndex];
  const selectedIndex = students.findIndex((s) => s.id === selected.id);

  return {
    selected,
    selectedIndex,
    minCallCount,
    maxCallCount,
    candidatePool,
    candidateCount: candidatePool.length,
    totalStudents: eligible.length,
    explanation,
  };
}

/**
 * Executes multi-student selection (1 to N students) without duplicates,
 * maintaining fair tier-by-tier distribution.
 */
export function chooseMultipleStudents(
  students: Student[],
  count: number = 1,
  mode: SelectionMode = 'FAIR'
): MultiSelectionResult | null {
  const eligible = getEligibleStudents(students);
  if (eligible.length === 0) return null;

  const pickCount = Math.min(Math.max(1, count), eligible.length);
  const selectedStudents: Student[] = [];

  if (mode === 'PURE') {
    // Shuffle eligible students and take first pickCount
    const pool = [...eligible];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return {
      selectedStudents: pool.slice(0, pickCount),
      totalEligible: eligible.length,
      mode,
      explanation: `Đã chọn ngẫu nhiên ${pickCount} học sinh trong số ${eligible.length} bạn có mặt.`,
    };
  }

  // FAIR MODE for Multi-pick:
  // Sort students into tiers by callCount ascending
  // E.g. Tier 0 (called 0 times), Tier 1 (called 1 time), etc.
  const tierMap = new Map<number, Student[]>();
  eligible.forEach((s) => {
    const c = s.callCount || 0;
    if (!tierMap.has(c)) tierMap.set(c, []);
    tierMap.get(c)!.push(s);
  });

  const sortedTiers = Array.from(tierMap.keys()).sort((a, b) => a - b);

  let needed = pickCount;
  for (const tierCount of sortedTiers) {
    if (needed <= 0) break;
    const tierStudents = [...tierMap.get(tierCount)!];

    // Shuffle this tier
    for (let i = tierStudents.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tierStudents[i], tierStudents[j]] = [tierStudents[j], tierStudents[i]];
    }

    const takeFromTier = tierStudents.slice(0, needed);
    selectedStudents.push(...takeFromTier);
    needed -= takeFromTier.length;
  }

  const minCount = Math.min(...eligible.map((s) => s.callCount || 0));
  return {
    selectedStudents,
    totalEligible: eligible.length,
    mode,
    explanation: `Đã chọn ${selectedStudents.length} học sinh theo thứ tự ưu tiên số lần lên bảng ít nhất (từ ${minCount} lần).`,
  };
}

/**
 * Returns summary metrics of call counts for a classroom
 */
export function getStudentStats(students: Student[]) {
  if (!students || students.length === 0) {
    return {
      total: 0,
      uncalledCount: 0,
      calledCount: 0,
      minCount: 0,
      maxCount: 0,
      avgCount: 0,
      distribution: [] as { count: number; studentCount: number; percentage: number }[],
    };
  }

  const total = students.length;
  const counts = students.map((s) => s.callCount || 0);
  const uncalledCount = students.filter((s) => (s.callCount || 0) === 0).length;
  const calledCount = total - uncalledCount;
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);
  const sum = counts.reduce((acc, c) => acc + c, 0);
  const avgCount = Number((sum / total).toFixed(1));

  // Count frequency
  const freqMap: Record<number, number> = {};
  counts.forEach((c) => {
    freqMap[c] = (freqMap[c] || 0) + 1;
  });

  const distribution = Object.entries(freqMap)
    .map(([countStr, studentCount]) => {
      const count = Number(countStr);
      return {
        count,
        studentCount,
        percentage: Math.round((studentCount / total) * 100),
      };
    })
    .sort((a, b) => a.count - b.count);

  return {
    total,
    uncalledCount,
    calledCount,
    minCount,
    maxCount,
    avgCount,
    distribution,
  };
}
