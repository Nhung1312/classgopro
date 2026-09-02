import { Student, ScoreCommentRule } from '../types';
import { calculateStudentGrade } from './gradeCalculator';

export interface CommentCategory {
  label: string;
  comments: string[];
}

export const VNEDU_MATH_COMMENT_TEMPLATES = {
  EXCELLENT: [
    'Hoàn thành xuất sắc nhiệm vụ học tập môn Toán. Tư duy logic và giải toán rất tốt.',
    'Nắm rất vững kiến thức, tiếp thu bài nhanh, tích cực phát biểu xây dựng bài.',
    'Tư duy toán học sắc bén, giải quyết tốt các bài toán nâng cao và thực tế.',
    'Tính toán chính xác, kỹ năng giải toán xuất sắc, tích cực giúp đỡ bạn bè.',
  ],
  GOOD: [
    'Hoàn thành tốt nhiệm vụ học tập môn Toán. Nắm chắc kiến thức cơ bản.',
    'Tiếp thu bài nhanh, chăm chỉ làm bài tập và tính toán chính xác.',
    'Ý thức học tập tốt, giải toán tốt, cần phát huy thêm ở phần nâng cao.',
    'Tích cực xây dựng bài, trình bày bài giải rõ ràng, mạch lạc.',
  ],
  FAIR: [
    'Hoàn thành yêu cầu môn học. Có ý thức học tập, cần cẩn thận hơn khi tính toán.',
    'Nắm được kiến thức cơ bản, cần rèn luyện thêm kỹ năng tính toán và trình bày.',
    'Tiếp thu bài tương đối tốt, cần tích cực phát biểu xây dựng bài hơn.',
    'Có tinh thần cố gắng trong học tập, cần làm bài tập về nhà đầy đủ.',
  ],
  PASS: [
    'Đạt yêu cầu môn học. Cần rèn luyện thêm bài tập cơ bản và tập trung nghe giảng.',
    'Cần chú ý tính toán cẩn thận hơn để tránh những sai sót cơ bản.',
    'Cần chủ động hỏi thầy cô và bạn bè khi gặp bài tập chưa hiểu.',
    'Cần dành thêm thời gian tự học và hoàn thành đầy đủ bài tập được giao.',
  ],
  NEED_IMPROVEMENT: [
    'Chưa đạt yêu cầu môn học. Cần cố gắng nhiều hơn và ôn tập lại kiến thức cơ bản.',
    'Cần tập trung chú ý nghe giảng trên lớp và chủ động nhờ thầy cô phụ đạo.',
    'Cần dành nhiều thời gian ôn luyện lại các công thức và dạng bài cơ bản.',
  ],
  NO_SCORE: [
    'Chưa đủ cột điểm kiểm tra đánh giá theo quy định.',
    'Cần bổ sung các bài kiểm tra còn thiếu trong học kỳ.',
  ],
};

export const DEFAULT_SCORE_COMMENT_RULES: ScoreCommentRule[] = [
  {
    id: 'rule_excellent',
    minScore: 9.0,
    maxScore: 10.0,
    label: 'Xuất sắc (9.0 - 10.0)',
    evaluation: 'Xuất sắc',
    comment: 'Hoàn thành xuất sắc nhiệm vụ học tập môn Toán. Tư duy logic và giải toán rất tốt.',
    alternatives: VNEDU_MATH_COMMENT_TEMPLATES.EXCELLENT,
    color: 'purple',
  },
  {
    id: 'rule_good',
    minScore: 8.0,
    maxScore: 8.9,
    label: 'Giỏi (8.0 - 8.9)',
    evaluation: 'Giỏi',
    comment: 'Hoàn thành tốt nhiệm vụ học tập. Nắm chắc kiến thức, tiếp thu bài nhanh.',
    alternatives: VNEDU_MATH_COMMENT_TEMPLATES.GOOD,
    color: 'emerald',
  },
  {
    id: 'rule_fair',
    minScore: 6.5,
    maxScore: 7.9,
    label: 'Khá (6.5 - 7.9)',
    evaluation: 'Khá',
    comment: 'Hoàn thành yêu cầu môn học. Có ý thức học tập, cần cẩn thận hơn khi tính toán.',
    alternatives: VNEDU_MATH_COMMENT_TEMPLATES.FAIR,
    color: 'indigo',
  },
  {
    id: 'rule_pass',
    minScore: 5.0,
    maxScore: 6.4,
    label: 'Đạt (5.0 - 6.4)',
    evaluation: 'Đạt',
    comment: 'Đạt yêu cầu môn học. Cần rèn luyện thêm bài tập cơ bản và tập trung nghe giảng.',
    alternatives: VNEDU_MATH_COMMENT_TEMPLATES.PASS,
    color: 'amber',
  },
  {
    id: 'rule_need_improvement',
    minScore: 0.0,
    maxScore: 4.9,
    label: 'Chưa đạt (< 5.0)',
    evaluation: 'Chưa đạt',
    comment: 'Chưa đạt yêu cầu. Cần cố gắng nhiều hơn và dành thời gian ôn tập lại kiến thức.',
    alternatives: VNEDU_MATH_COMMENT_TEMPLATES.NEED_IMPROVEMENT,
    color: 'rose',
  },
];

const LOCAL_STORAGE_RULES_KEY = 'vnedu_math_comment_rules_v2';

export function loadScoreCommentRules(): ScoreCommentRule[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_RULES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load saved comment rules', e);
  }
  return DEFAULT_SCORE_COMMENT_RULES;
}

export function saveScoreCommentRules(rules: ScoreCommentRule[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_RULES_KEY, JSON.stringify(rules));
  } catch (e) {
    console.error('Failed to save comment rules', e);
  }
}

/**
 * Returns comment from custom rules matrix
 */
export function getCommentFromRules(
  score: number | null,
  rules: ScoreCommentRule[],
  enableVariation: boolean = false,
  studentIndex: number = 0,
  noScoreComment: string = 'Chưa đủ cột điểm đánh giá.'
): string {
  if (score === null || isNaN(score)) {
    return noScoreComment;
  }

  // Find matching rule based on score
  const matchedRule = rules.find(
    (r) => score >= r.minScore - 0.001 && score <= r.maxScore + 0.001
  );

  if (!matchedRule) {
    // Fallback if boundary mismatch
    if (score >= 9.0) return rules[0]?.comment || 'Hoàn thành xuất sắc nhiệm vụ học tập môn Toán.';
    if (score >= 8.0) return rules[1]?.comment || 'Hoàn thành tốt nhiệm vụ học tập.';
    if (score >= 6.5) return rules[2]?.comment || 'Hoàn thành yêu cầu môn học.';
    if (score >= 5.0) return rules[3]?.comment || 'Đạt yêu cầu môn học.';
    return rules[4]?.comment || 'Cần cố gắng nhiều hơn trong học tập.';
  }

  if (enableVariation && matchedRule.alternatives && matchedRule.alternatives.length > 0) {
    // Pick variation deterministically based on index so it varies naturally across students
    const options = [matchedRule.comment, ...matchedRule.alternatives.filter((a) => a !== matchedRule.comment)];
    const chosen = options[studentIndex % options.length];
    return chosen;
  }

  return matchedRule.comment;
}

export const QUICK_TAG_COMMENTS: CommentCategory[] = [

  {
    label: '🌟 Khen ngợi & Năng lực',
    comments: [
      'Hoàn thành xuất sắc nhiệm vụ học tập.',
      'Tư duy logic sắc bén, giải toán nhanh và chính xác.',
      'Nắm rất vững các định lý, công thức và phương pháp giải.',
      'Tích cực xung phong lên bảng phát biểu xây dựng bài.',
    ],
  },
  {
    label: '👍 Ý thức & Thái độ',
    comments: [
      'Có ý thức học tập rất tốt, vở ghi chép cẩn thận, sạch đẹp.',
      'Chăm chỉ làm bài tập về nhà, chuẩn bị bài chu đáo.',
      'Nghiêm túc trong giờ học, tích cực tương tác với giáo viên.',
      'Hòa đồng, tích cực tham gia hoạt động nhóm trên lớp.',
    ],
  },
  {
    label: '✍️ Kỹ năng môn Toán',
    comments: [
      'Kỹ năng tính toán nhanh, trình bày bài khoa học.',
      'Vẽ hình học chính xác, nắm chắc các bước chứng minh.',
      'Khả năng vận dụng công thức vào bài toán thực tế tốt.',
      'Cần cẩn thận hơn ở các bước tính toán trung gian.',
    ],
  },
  {
    label: '💡 Khích lệ & Nhắc nhở',
    comments: [
      'Có nhiều tiến bộ so với đầu năm học, cần duy trì.',
      'Cần tập trung nghe giảng hơn trong các tiết lý thuyết.',
      'Cần rèn thêm tính cẩn thận, đọc kỹ đề bài trước khi làm.',
      'Cần ôn tập lại các công thức cơ bản và làm thêm bài tập.',
    ],
  },
];

/**
 * Returns suggested comment based on student's grade
 */
export function getAutoCommentByScore(score: number | null): string {
  if (score === null) {
    return 'Chưa đủ cột điểm đánh giá.';
  }
  if (score >= 9.0) {
    return 'Hoàn thành xuất sắc nhiệm vụ học tập môn Toán. Tư duy logic và giải toán rất tốt.';
  }
  if (score >= 8.0) {
    return 'Hoàn thành tốt nhiệm vụ học tập. Nắm chắc kiến thức, tiếp thu bài nhanh.';
  }
  if (score >= 6.5) {
    return 'Hoàn thành yêu cầu môn học. Có ý thức học tập, cần cẩn thận hơn khi tính toán.';
  }
  if (score >= 5.0) {
    return 'Đạt yêu cầu môn học. Cần rèn luyện thêm bài tập cơ bản và tập trung nghe giảng.';
  }
  return 'Chưa đạt yêu cầu. Cần cố gắng nhiều hơn và dành thời gian ôn tập lại kiến thức.';
}

/**
 * Returns a list of smart suggestion strings for a specific student's score
 */
export function getCommentSuggestionsForStudent(score: number | null): string[] {
  if (score === null) {
    return [
      'Chưa đủ cột điểm đánh giá.',
      'Cần bổ sung các bài kiểm tra còn thiếu.',
      'Ý thức học tập tốt, cần hoàn thành đầy đủ bài kiểm tra.',
    ];
  }
  if (score >= 9.0) return VNEDU_MATH_COMMENT_TEMPLATES.EXCELLENT;
  if (score >= 8.0) return VNEDU_MATH_COMMENT_TEMPLATES.GOOD;
  if (score >= 6.5) return VNEDU_MATH_COMMENT_TEMPLATES.FAIR;
  if (score >= 5.0) return VNEDU_MATH_COMMENT_TEMPLATES.PASS;
  return VNEDU_MATH_COMMENT_TEMPLATES.NEED_IMPROVEMENT;
}
