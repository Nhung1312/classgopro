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

export const VNEDU_GDDP_COMMENT_TEMPLATES = {
  EXCELLENT: [
    'Hoàn thành xuất sắc nhiệm vụ môn Giáo dục địa phương. Hiểu sâu sắc văn hóa, lịch sử quê hương.',
    'Nắm rất vững kiến thức địa phương, tích cực tham gia các dự án tìm hiểu di tích và lễ hội truyền thống.',
    'Có tinh thần tự hào và trách nhiệm cao trong việc bảo tồn, phát huy bản sắc văn hóa quê hương.',
    'Kỹ năng thuyết trình, làm bài thu hoạch và dự án trải nghiệm thực tế về địa phương rất tốt.',
  ],
  GOOD: [
    'Hoàn thành tốt nhiệm vụ môn Giáo dục địa phương. Nắm chắc kiến thức bài học.',
    'Có ý thức tìm hiểu các di tích lịch sử, địa lý và danh lam thắng cảnh của địa phương.',
    'Tích cực tham gia thảo luận nhóm và chuẩn bị bài thu hoạch chu đáo.',
    'Yêu quý quê hương, chăm chỉ làm các bài tập tìm hiểu địa phương.',
  ],
  FAIR: [
    'Hoàn thành yêu cầu môn học. Có ý thức tìm hiểu về văn hóa, địa lý quê hương.',
    'Nắm được các nét cơ bản về địa phương, cần cẩn thận hơn khi làm bài thu hoạch.',
    'Tiếp thu bài tương đối tốt, cần tích cực phát biểu xây dựng bài hơn.',
    'Có tinh thần học tập, cần chủ động tham gia các hoạt động nhóm hơn.',
  ],
  PASS: [
    'Đạt yêu cầu môn học. Cần dành thêm thời gian đọc tài liệu và hoàn thành bài tập địa phương.',
    'Cần tập trung nghe giảng và nộp các bài thu hoạch địa phương đúng hạn.',
    'Cần tích cực tìm hiểu thêm về lịch sử, địa lý địa phương nơi mình sinh sống.',
    'Cần chủ động hỏi thầy cô và bạn bè khi thực hiện các nhiệm vụ học tập.',
  ],
  NEED_IMPROVEMENT: [
    'Chưa đạt yêu cầu môn học. Cần hoàn thành các bài tập và bài thu hoạch về địa phương còn thiếu.',
    'Cần chú ý nghe giảng và tích cực hơn trong các giờ học tìm hiểu địa phương.',
    'Cần dành thêm thời gian ôn tập lại các kiến thức cơ bản về địa phương.',
  ],
  NO_SCORE: [
    'Chưa đủ cột điểm kiểm tra đánh giá theo quy định.',
    'Cần bổ sung các bài kiểm tra và bài thu hoạch còn thiếu.',
  ],
};

export const DEFAULT_GDDP_SCORE_COMMENT_RULES: ScoreCommentRule[] = [
  {
    id: 'rule_gddp_excellent',
    minScore: 9.0,
    maxScore: 10.0,
    label: 'Xuất sắc (9.0 - 10.0)',
    evaluation: 'Xuất sắc',
    comment: 'Hoàn thành xuất sắc nhiệm vụ môn Giáo dục địa phương. Hiểu sâu sắc văn hóa, lịch sử quê hương.',
    alternatives: VNEDU_GDDP_COMMENT_TEMPLATES.EXCELLENT,
    color: 'purple',
  },
  {
    id: 'rule_gddp_good',
    minScore: 8.0,
    maxScore: 8.9,
    label: 'Giỏi (8.0 - 8.9)',
    evaluation: 'Giỏi',
    comment: 'Hoàn thành tốt nhiệm vụ môn Giáo dục địa phương. Nắm chắc kiến thức bài học.',
    alternatives: VNEDU_GDDP_COMMENT_TEMPLATES.GOOD,
    color: 'emerald',
  },
  {
    id: 'rule_gddp_fair',
    minScore: 6.5,
    maxScore: 7.9,
    label: 'Khá (6.5 - 7.9)',
    evaluation: 'Khá',
    comment: 'Hoàn thành yêu cầu môn học. Có ý thức tìm hiểu về văn hóa, địa lý quê hương.',
    alternatives: VNEDU_GDDP_COMMENT_TEMPLATES.FAIR,
    color: 'indigo',
  },
  {
    id: 'rule_gddp_pass',
    minScore: 5.0,
    maxScore: 6.4,
    label: 'Đạt (5.0 - 6.4)',
    evaluation: 'Đạt',
    comment: 'Đạt yêu cầu môn học. Cần dành thêm thời gian đọc tài liệu và hoàn thành bài tập địa phương.',
    alternatives: VNEDU_GDDP_COMMENT_TEMPLATES.PASS,
    color: 'amber',
  },
  {
    id: 'rule_gddp_need_improvement',
    minScore: 0.0,
    maxScore: 4.9,
    label: 'Chưa đạt (< 5.0)',
    evaluation: 'Chưa đạt',
    comment: 'Chưa đạt yêu cầu. Cần hoàn thành các bài thu hoạch và ôn tập lại kiến thức về địa phương.',
    alternatives: VNEDU_GDDP_COMMENT_TEMPLATES.NEED_IMPROVEMENT,
    color: 'rose',
  },
];

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
    label: '🏛️ Môn Giáo dục địa phương (GDĐP)',
    comments: [
      'Hiểu biết phong phú về di tích lịch sử và văn hóa địa phương.',
      'Tích cực tham gia dự án bảo tồn làng nghề, danh lam thắng cảnh quê hương.',
      'Bài thu hoạch về truyền thống địa phương trình bày khoa học, sinh động.',
      'Có ý thức tự hào và phát huy bản sắc văn hóa tốt đẹp của quê hương.',
      'Chăm chỉ tìm hiểu đặc điểm kinh tế, xã hội và con người địa phương.',
    ],
  },
  {
    label: '✍️ Kỹ năng môn Toán & Tự nhiên',
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
export function getAutoCommentByScore(score: number | null, subject?: string): string {
  if (score === null) {
    return 'Chưa đủ cột điểm đánh giá.';
  }
  const isGDDP = subject && (subject.toLowerCase().includes('địa phương') || subject.toLowerCase().includes('gddp'));
  if (isGDDP) {
    if (score >= 9.0) return VNEDU_GDDP_COMMENT_TEMPLATES.EXCELLENT[0];
    if (score >= 8.0) return VNEDU_GDDP_COMMENT_TEMPLATES.GOOD[0];
    if (score >= 6.5) return VNEDU_GDDP_COMMENT_TEMPLATES.FAIR[0];
    if (score >= 5.0) return VNEDU_GDDP_COMMENT_TEMPLATES.PASS[0];
    return VNEDU_GDDP_COMMENT_TEMPLATES.NEED_IMPROVEMENT[0];
  }

  if (score >= 9.0) {
    return subject && !subject.toLowerCase().includes('toán')
      ? `Hoàn thành xuất sắc nhiệm vụ học tập môn ${subject}. Nắm rất vững kiến thức.`
      : 'Hoàn thành xuất sắc nhiệm vụ học tập môn Toán. Tư duy logic và giải toán rất tốt.';
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
export function getCommentSuggestionsForStudent(score: number | null, subject?: string): string[] {
  if (score === null) {
    return [
      'Chưa đủ cột điểm đánh giá.',
      'Cần bổ sung các bài kiểm tra còn thiếu.',
      'Ý thức học tập tốt, cần hoàn thành đầy đủ bài kiểm tra.',
    ];
  }
  const isGDDP = subject && (subject.toLowerCase().includes('địa phương') || subject.toLowerCase().includes('gddp'));
  const templates = isGDDP ? VNEDU_GDDP_COMMENT_TEMPLATES : VNEDU_MATH_COMMENT_TEMPLATES;

  if (score >= 9.0) return templates.EXCELLENT;
  if (score >= 8.0) return templates.GOOD;
  if (score >= 6.5) return templates.FAIR;
  if (score >= 5.0) return templates.PASS;
  return templates.NEED_IMPROVEMENT;
}
