import { Student } from '../types';

export interface StudentScoreSummary {
  txScores: (number | null)[];
  txCount: number;
  txAvg: number | null;
  gk: number | null;
  ck: number | null;
  finalAvg: number | null;
  evaluation: 'Xuất sắc' | 'Giỏi' | 'Khá' | 'Đạt' | 'Chưa đạt' | 'Chưa đủ điểm';
}

/**
 * Calculates standard Vietnamese Ministry of Education (Bộ GD&ĐT) subject GPA
 * Công thức ĐTBmhk = [Tổng ĐĐGtx + 2*ĐĐGgk + 3*ĐĐGck] / (Số bài ĐĐGtx + 2 + 3)
 */
export function calculateStudentGrade(student: Student): StudentScoreSummary {
  const scores = student.scores || {};
  const txList = [scores.tx1, scores.tx2, scores.tx3, scores.tx4].filter(
    (v): v is number => typeof v === 'number' && !isNaN(v)
  );

  const txSum = txList.reduce((acc, val) => acc + val, 0);
  const txCount = txList.length;
  const txAvg = txCount > 0 ? Number((txSum / txCount).toFixed(1)) : null;

  const gk = typeof scores.gk === 'number' && !isNaN(scores.gk) ? scores.gk : null;
  const ck = typeof scores.ck === 'number' && !isNaN(scores.ck) ? scores.ck : null;

  let finalAvg: number | null = null;
  let evaluation: StudentScoreSummary['evaluation'] = 'Chưa đủ điểm';

  // Can calculate if has at least 1 TX, GK, and CK
  if (txCount > 0 && gk !== null && ck !== null) {
    const totalWeightedScore = txSum + 2 * gk + 3 * ck;
    const totalWeights = txCount + 2 + 3;
    finalAvg = Number((totalWeightedScore / totalWeights).toFixed(1));

    if (finalAvg >= 9.0) {
      evaluation = 'Xuất sắc';
    } else if (finalAvg >= 8.0) {
      evaluation = 'Giỏi';
    } else if (finalAvg >= 6.5) {
      evaluation = 'Khá';
    } else if (finalAvg >= 5.0) {
      evaluation = 'Đạt';
    } else {
      evaluation = 'Chưa đạt';
    }
  } else if (txCount > 0 || gk !== null || ck !== null) {
    // Partial average for preview
    let partialSum = txSum;
    let partialWeights = txCount;
    if (gk !== null) {
      partialSum += 2 * gk;
      partialWeights += 2;
    }
    if (ck !== null) {
      partialSum += 3 * ck;
      partialWeights += 3;
    }
    if (partialWeights > 0) {
      finalAvg = Number((partialSum / partialWeights).toFixed(1));
    }
  }

  return {
    txScores: [scores.tx1 ?? null, scores.tx2 ?? null, scores.tx3 ?? null, scores.tx4 ?? null],
    txCount,
    txAvg,
    gk,
    ck,
    finalAvg,
    evaluation,
  };
}
