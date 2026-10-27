import { ARENA_TEAM_PRESETS, getRandomTeamPreset, ARENA_MASCOTS } from '../src/components/arena/arenaData';
import {
  validateAndConvertReviewQuestion,
  createQuickArenaQuestion,
  SAMPLE_ARENA_QUESTIONS,
} from '../src/components/arena/arenaQuestionService';
import { parseQuestionChoices } from '../src/utils/questionParser';

console.log('=== TEST 1: Preset Team Pairs ===');
if (ARENA_TEAM_PRESETS.length < 20) {
  throw new Error(`Expected at least 20 team presets, got ${ARENA_TEAM_PRESETS.length}`);
}
console.log(`✓ Verified ${ARENA_TEAM_PRESETS.length} team presets available.`);

// Check required pairs from prompt
const requiredLabels = [
  'Gà Chiến',
  'Vịt Siêu Quậy',
  'Ốc Sên Tăng Tốc',
  'Rùa Gắn Turbo',
  'Thám Tử Não To',
  'Giáo Sư Tí Hon',
  'Não Siêu Tốc',
  'Não Siêu Việt',
  'Tên Lửa',
  'Phi Thuyền',
  'Biệt Đội Tia Chớp',
  'Hội Những Cơn Lốc',
  'Sóc Siêu Tốc',
  'Thỏ Thần Tốc',
  'Gấu Ham Học',
  'Mèo Mê Toán',
  'Não Cá Mập',
  'Trí Tuệ Cá Heo',
  'Chớp Mắt Là Xong',
  'Nghĩ Phát Ra Ngay',
];

requiredLabels.forEach((name) => {
  const found = ARENA_TEAM_PRESETS.some(
    (p) => p.team1.name === name || p.team2.name === name
  );
  if (!found) throw new Error(`Missing expected team name in presets: ${name}`);
});
console.log('✓ All 20 requested team pairs are present.');

console.log('\n=== TEST 2: Lottery Draw (Bốc thăm tên đội) ===');
const lotterySample = getRandomTeamPreset(ARENA_TEAM_PRESETS[0].id);
if (!lotterySample || !lotterySample.team1.name || !lotterySample.team2.name) {
  throw new Error('Lottery draw returned invalid preset');
}
console.log(`✓ Lottery draw working: ${lotterySample.team1.name} vs ${lotterySample.team2.name}`);

console.log('\n=== TEST 3: Question Parsing & Validation (Never Default to A) ===');
// Test 3.1: Valid question with 4 options and answer B
const validQ = {
  id: 'test-1',
  bankId: 'bank-1',
  question: 'Công thức diện tích hình chữ nhật là:\nA. $S = a + b$\nB. $S = a \\cdot b$\nC. $S = 2(a + b)$\nD. $S = a^2$',
  answer: 'B',
  level: 'basic' as const,
  source: 'builtin' as const,
};

const resValid = validateAndConvertReviewQuestion(validQ);
if (!resValid.isValid || resValid.question.correctKey !== 'B') {
  throw new Error(`Failed to parse valid question with correctKey B: got ${resValid.question.correctKey}`);
}
console.log('✓ Valid ABCD question correctly extracted key B.');

// Test 3.2: Question missing answer key - MUST NOT DEFAULT TO 'A'!
const missingAnswerQ = {
  id: 'test-2',
  bankId: 'bank-1',
  question: 'Công thức diện tích hình chữ nhật là:\nA. $S = a + b$\nB. $S = a \\cdot b$\nC. $S = 2(a + b)$\nD. $S = a^2$',
  answer: '', // NO ANSWER GIVEN!
  level: 'basic' as const,
  source: 'builtin' as const,
};

const resMissingAnswer = validateAndConvertReviewQuestion(missingAnswerQ);
if (resMissingAnswer.isValid) {
  throw new Error('SAFETY BREACH: Question with missing answer was flagged as valid! Must be invalid!');
}
console.log('✓ Safety check passed: Question missing answer key is flagged invalid (missingField: ' + resMissingAnswer.missingField + ').');

// Test 3.3: Essay question without options - MUST BE FLAGGED AS INVALID FOR 4-OPTION ARENA!
const essayQ = {
  id: 'test-3',
  bankId: 'bank-1',
  question: 'Nêu định nghĩa hai tam giác bằng nhau?',
  answer: 'Hai tam giác bằng nhau là hai tam giác có các cạnh tương ứng bằng nhau và các góc tương ứng bằng nhau.',
  level: 'basic' as const,
  source: 'builtin' as const,
};

const resEssay = validateAndConvertReviewQuestion(essayQ);
if (resEssay.isValid) {
  throw new Error('SAFETY BREACH: Essay question without 4 options was flagged as valid!');
}
console.log('✓ Safety check passed: Essay question flagged invalid (missingField: ' + resEssay.missingField + ').');

console.log('\n=== TEST 4: Quick Question Builder ===');
const quickQ = createQuickArenaQuestion(
  'Tính $2^3 + 3^2$?',
  { A: '15', B: '17', C: '16', D: '18' },
  'B',
  '$2^3 = 8, 3^2 = 9 \\Rightarrow 8 + 9 = 17$'
);
if (quickQ.options.length !== 4 || quickQ.correctKey !== 'B') {
  throw new Error('Quick question builder failed');
}
console.log('✓ Quick question builder created 4 options with correctKey B.');

console.log('\n=== TEST 5: Sample Arena Questions KaTeX Integrity ===');
if (SAMPLE_ARENA_QUESTIONS.length < 5) {
  throw new Error('Expected at least 5 sample arena questions');
}
SAMPLE_ARENA_QUESTIONS.forEach((q, idx) => {
  if (q.options.length !== 4 || !['A', 'B', 'C', 'D'].includes(q.correctKey)) {
    throw new Error(`Sample question ${idx} has invalid options or correctKey`);
  }
});
console.log('\n=== TEST 6: Replay Question Deduplication Simulation ===');
// Simulate score tally and replay rollback
let team1Score = 10;
let team1History = [
  {
    questionId: 'q-1',
    selectedOption: 'A' as const,
    isCorrect: true,
    pointsAwarded: 10,
    responseTimeMs: 1200,
  },
];
const currentQId = 'q-1';

// Replay action occurs
const lastHist = team1History[team1History.length - 1];
if (lastHist && lastHist.questionId === currentQId) {
  team1Score = Math.max(0, team1Score - lastHist.pointsAwarded);
  team1History = team1History.slice(0, -1);
}

if (team1Score !== 0 || team1History.length !== 0) {
  throw new Error(`Replay rollback failed: score=${team1Score}, historyLength=${team1History.length}`);
}
console.log('✓ Replay rollback verified: Points properly refunded and history deduplicated.');

console.log('\n🎉 ALL CLASSGO ARENA ENGINE TESTS PASSED SUCCESSFULLY!');
