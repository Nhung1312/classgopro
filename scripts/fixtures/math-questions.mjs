// Synthetic text only. Shared by local and isolated Preview browser checks.
export const stems = [
  String.raw`Tìm x biết $x-\frac{1}{2}=\frac{3}{4}$`,
  String.raw`$x^2+2x+1=(x+1)^2$`,
  String.raw`$\sqrt{16}=4$`,
  String.raw`$\frac{a+b}{c}$`,
  String.raw`$x\in\mathbb{Q}$`,
  String.raw`Trong $\triangle ABC$, $\widehat{ABC}=60^\circ$, $AH\perp BC$ và $AB\parallel CD$.`,
  String.raw`Tính \(a_1^2+\sqrt[3]{8}\). Kết quả là bao nhiêu?`,
  'Đoạn văn tiếng Việt thứ nhất: $x=2$.\n\nĐoạn thứ hai giữ dấu tiếng Việt, so sánh $|x|\\leq 3$.\n' + String.raw`\[\begin{aligned}x+1&=3\\x&=2\end{aligned}\]`,
  String.raw`Dữ liệu lỗi phải còn nguyên: $\frac{1}{$ và $\commandUnknown{x}$.`,
  'Câu hỏi thuần văn bản, không có công thức. Giá $5 và $10.',
  String.raw`$$\frac{a_1+a_2+a_3+a_4+a_5+a_6+a_7+a_8+a_9+a_{10}+a_{11}+a_{12}}{b_1+b_2+b_3+b_4+b_5+b_6+b_7+b_8}=\sqrt{\frac{x^2+y^2+z^2}{1+x^2}}$$`,
];
const options = { A: String.raw`$\frac{1}{4}$`, B: String.raw`$\frac{5}{4}$`, C: String.raw`$\sqrt{4}$`, D: String.raw`$x^2$` };
export const cls = { id: 'qa-math-class', name: '7A9 QA', subject: 'Toán', createdAt: '2026-10-27T00:00:00Z',
  students: [{ id: 'qa-math-s1', name: 'QA Một', studentCode: 'QA-MATH-01', callCount: 3, scores: { tx1: 0 } },
    { id: 'qa-math-s2', name: 'QA Hai', studentCode: 'QA-MATH-02', callCount: 5 }] };
export const bank = { id: 'qa-math-bank', ownerId: 'local_teacher', subject: 'Toán', grade: '7', semester: '1',
  lessonId: 'KNTT-MATH-7-L01', lessonName: 'Tập hợp các số hữu tỉ', sectionName: 'SỐ HỮU TỈ',
  bookSeries: 'KNTT', createdAt: cls.createdAt, updatedAt: cls.createdAt };
export const quizQuestions = stems.map((question, i) => ({ id: 'qa-math-' + i, question,
  options: i === 9 ? { A: 'Một', B: 'Hai', C: 'Ba', D: 'Bốn' } : options,
  correctAnswer: 'B', explanation: i === 9 ? 'Đáp án là Hai.' : String.raw`Vì $x=\frac{5}{4}$, suy ra \(\sqrt{16}=4\).` }));
export const bankQuestions = quizQuestions.map(q => ({ id: q.id, bankId: bank.id, level: 'basic', source: 'manual',
  question: q.question + '\n' + Object.entries(q.options).map(([k, v]) => k + '. ' + v).join('\n'),
  answer: 'B. ' + q.explanation }));
export const session = { id: 'qa-math-session', classId: cls.id, className: cls.name, subject: 'Toán',
  title: 'QA công thức Toán', createdAt: cls.createdAt, updatedAt: cls.createdAt, currentQuestionIndex: 0,
  status: 'active', questions: quizQuestions, results: quizQuestions.map(question => ({
    questionId: question.id, question, status: 'revealed', startedAt: 1,
    answers: { [cls.students[0].id]: { studentId: cls.students[0].id, studentName: cls.students[0].name,
      cardId: 1, selectedOption: 'B', isCorrect: true, timestamp: 1 } },
  })) };
export const seed = { cls, bank, bankQuestions, session };
