import assert from 'node:assert/strict';
import { parseBankQuizQuestion, resolveBankCorrectAnswer, isReadyQuizQuestion, type QuizQuestionDraft } from '../src/components/response-cards/questionBankImport';

const content = 'Tính $2+2$?\nA. $1$\nB. $2$\nC. $3$\nD. $4$';
let cases = 0;
for (const letter of ['A', 'B', 'C', 'D'] as const) {
  for (const answer of [letter, letter.toLowerCase(), `${letter}.`, `${letter})`, `(${letter})`, `[${letter}]`,
    `Đáp án: ${letter}`, `Đáp án đúng: ${letter}`, `Đáp án đúng là ${letter}`,
    `Chọn ${letter}.`, `Chọn phương án ${letter}`, `Phương án đúng: ${letter}`,
    `${letter}. Vì đây là kết quả tính toán.`, `  Đáp án: ${letter}\nGiải thích: phép cộng.  `]) {
    const parsed = parseBankQuizQuestion(content, answer);
    assert.equal(parsed?.correctAnswer, letter, answer);
    assert.equal(parsed?.question, 'Tính $2+2$?');
    assert.equal(parsed.options.D, '$4$', 'keep the original options and KaTeX');
    cases++;
  }
}
const parsed = parseBankQuizQuestion(content, '$4$')!;
assert.equal(parsed.correctAnswer, 'D'); cases++;
for (const answer of ['', 'Chưa xác định', 'Không rõ', 'Có nhiều khả năng', 'Bài giải chưa hoàn chỉnh', 'E',
  'A hoặc B', 'B/C', 'C, D', 'Đáp án: A và D', 'Đáp án: B. Chọn D.', '2', 'A + B', 'B-3']) {
  const unknown = parseBankQuizQuestion(content, answer)!;
  assert.equal(unknown.correctAnswer, null, `must not invent a key for ${JSON.stringify(answer)}`);
  const draft: QuizQuestionDraft = { ...unknown, id: 'draft' };
  assert.equal(isReadyQuizQuestion(draft), false);
  assert.equal(isReadyQuizQuestion({ ...draft, correctAnswer: 'C' }), true, 'teacher can confirm a key');
  cases++;
}
assert.equal(resolveBankCorrectAnswer('A > B', { A: 'Một', B: 'Hai', C: 'Ba', D: 'A > B' }), 'D');
assert.equal(resolveBankCorrectAnswer(' cùng đáp án ', { A: 'Cùng đáp án', B: 'B', C: 'Cùng đáp án', D: 'D' }), null);
assert.equal(resolveBankCorrectAnswer('  BÀI   HỌC ', { A: 'A', B: 'B', C: 'Bài học', D: 'D' }), 'C', 'Vietnamese words are not bare answer keys');
assert.equal(parseBankQuizQuestion('Câu hỏi? A. Một B. Hai C. Ba D. Bốn', 'Đáp án: C')?.correctAnswer, 'C');
assert.equal(parseBankQuizQuestion('Câu hỏi? a. Một b. Hai c. Ba d. Bốn', 'b')?.correctAnswer, 'B');
assert.equal(parseBankQuizQuestion('Câu hỏi? [A] Một [B] Hai [C] Ba [D] Bốn', 'D')?.correctAnswer, 'D');
assert.equal(parseBankQuizQuestion('Tự luận: tính 2+2', '4'), null, 'do not manufacture MCQ options from an essay answer');
assert.equal(parseBankQuizQuestion('Tính?\nA. 1\nB. 2', 'B'), null);
assert.equal(parseBankQuizQuestion('Tính?\nA. 1\nC. 2\nB. 3\nD. 4', 'B'), null);
assert.equal(isReadyQuizQuestion({ ...parsed, id: 'empty-option', options: { ...parsed.options, D: '' } }), false);
assert.equal(isReadyQuizQuestion({ ...parsed, id: 'invalid-key', correctAnswer: 'E' as any }), false);
console.log(`PASS: ${cases + 11} response-bank cases: A/B/C/D formats, original options, missing/ambiguous keys, teacher confirmation, malformed questions and start validation.`);
