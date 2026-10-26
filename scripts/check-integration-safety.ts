import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import type { ClassRoom, HistoryRecord, PpctItem, TeachingPlanItem } from '../src/types';
import { applyMysteryDoorAssessment } from '../src/utils/mysteryDoorAssessment';
import { transferHistoryScoreToTx } from '../src/utils/safeReviewTx';
import { classReviewBanks } from '../src/utils/classReviewBanks';
import { parseQuestionChoices } from '../src/utils/questionParser';
import { buildPpctTemplateWorkbook, parsePpctFromExcel, findNextUntaughtPpctLesson, checkMakeupCollision } from '../src/utils/timetableExcelService';
import { buildResponseCardPdf } from '../src/services/responseCardPdf';
import { getCardMatrix6x6 } from '../src/services/arucoService';
import { getOrInitClassCardConfig, updateStudentCardId, createNewQuizSession, setResponseCardOwner,
  loadAllQuizSessions, saveActiveQuizSession, fetchSessionByPin } from '../src/services/responseCardStorage';
import { transferResponseCardScores } from '../src/utils/responseCardTransfer';
import { saveDayOffs, loadDayOffs, savePpctItems, loadPpctItems, saveClasses,
  exportBackupJSON, importBackupJSON } from '../src/utils/storage';
import { loadQuestionBanks } from '../src/services/reviewQuestionService';

const memory = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value),
  removeItem: (key: string) => memory.delete(key),
}, configurable: true });
let fetches = 0;
globalThis.fetch = (async () => { fetches++; throw new Error('Network disabled in tests'); }) as typeof fetch;
const cls: ClassRoom = { id: 'qa-class', name: '7A9', subject: 'Toán', createdAt: '2026-10-25',
  students: [{ id: 's1', name: 'QA Một', studentCode: 'QA01', callCount: 3, scores: { tx1: 0 } },
    { id: 's2', name: 'QA Hai', studentCode: 'QA02', callCount: 5 }],
  questions: [{ id: 'q-old', content: '2+2?', suggestedAnswer: '4', lesson: 'Bài 1', chapter: 'Chương I' }] };
const base = { classes: [cls], history: [] as HistoryRecord[], classId: cls.id, studentId: 's1',
  question: cls.questions![0], attemptId: 'review-qa-1', mode: 'FAIR' as const };
const historyOnly = applyMysteryDoorAssessment({ ...base, change: { score: 8.5 } });
assert.equal(historyOnly.saved, true);
assert.equal(historyOnly.classes, base.classes);
assert.equal(historyOnly.history[0].recordType, 'MYSTERY_DOOR');
assert.equal(historyOnly.history[0].callCountAfter, 3);
assert.equal(applyMysteryDoorAssessment({ ...base, history: historyOnly.history, change: { score: 9 } }).saved, false);
const star = applyMysteryDoorAssessment({ ...base, history: historyOnly.history, change: { stars: 1 } });
assert.equal(star.classes[0].students[0].stars, 1);
assert.equal(applyMysteryDoorAssessment({ ...base, classes: star.classes, history: star.history, change: { stars: 1 } }).saved, false);
const txArgs = { classes: historyOnly.classes, history: historyOnly.history, classId: cls.id,
  studentId: 's1', score: 8.5, slot: 'tx2' as const, recordId: 'review-qa-1' };
assert.equal(transferHistoryScoreToTx({ ...txArgs, slot: 'tx1' }).saved, false, 'existing zero kept');
assert.equal(transferHistoryScoreToTx({ ...txArgs, recordId: 'unrelated' }).saved, false);
const transferred = transferHistoryScoreToTx(txArgs);
assert.equal(transferred.saved, true);
assert.equal(transferHistoryScoreToTx({ ...txArgs, classes: transferred.classes, history: transferred.history, slot: 'tx3' }).saved, false);
assert.equal(classReviewBanks(cls)[0].inlineQuestions![0].id, 'q-old');
assert.equal(classReviewBanks(cls)[0].inlineQuestions![0].answer, '4');
assert.equal(parseQuestionChoices('Tính?\nA. 1\nB. 2', 'A').isMultipleChoice, false);
assert.equal(parseQuestionChoices('Tính? A. 1 B. 2 C. 3 D. 4', 'D').correctKey, 'D');

setResponseCardOwner('qa-owner');
const config = getOrInitClassCardConfig(cls);
assert.equal(new Set(config.mappings.map(m => m.cardId)).size, config.mappings.length);
const changedIds: ClassRoom = { ...cls, subject: 'Ngữ văn', students: [...cls.students].reverse().map(s => ({ ...s, id: 'new-' + s.id })) };
const stable = getOrInitClassCardConfig(changedIds);
for (const m of config.mappings.filter(m => !m.isSpare)) assert.equal(stable.mappings.find(n => n.studentCode === m.studentCode)?.cardId, m.cardId);
assert.equal(updateStudentCardId(cls.id, 'new-s1', 121), null);
assert.throws(() => getCardMatrix6x6(121), RangeError);
assert.throws(() => getOrInitClassCardConfig({ ...cls, students: [cls.students[0], { ...cls.students[1], studentCode: 'QA01' }] }), /trùng/);
const q = { id: 'quiz-q', question: '2+2?', options: { A: '1', B: '2', C: '3', D: '4' }, correctAnswer: 'D' as const };
const session = createNewQuizSession(cls, 'QA Quiz', [q]);
session.status = 'completed';
session.results[0].answers.s1 = { studentId: 's1', studentName: 'QA Một', cardId: 1,
  selectedOption: 'D', isCorrect: false, timestamp: Date.now() };
saveActiveQuizSession(session);
assert.equal(loadAllQuizSessions().length, 1);
setResponseCardOwner('different-owner');
assert.equal(loadAllQuizSessions().length, 0, 'no cross-account sessions');
setResponseCardOwner('qa-owner');
const quizArgs = { session, classes: [cls], history: [] as HistoryRecord[], classId: cls.id, slot: 'tx2' as const, studentIds: ['s1'] };
assert.equal(transferResponseCardScores({ ...quizArgs, slot: 'tx1' }).transferred, 0);
assert.equal(transferResponseCardScores({ ...quizArgs, session: { ...session, subject: 'Ngữ văn' } }).transferred, 0);
const quizTransfer = transferResponseCardScores(quizArgs);
assert.equal(quizTransfer.transferred, 1);
assert.equal(quizTransfer.classes[0].students[0].scores?.tx2, 10, 'recompute from option, ignore cached isCorrect');
assert.equal(quizTransfer.history[0].callCountAfter, 3);
assert.equal(quizTransfer.history[0].recordType, 'RESPONSE_CARDS');
assert.equal(transferResponseCardScores({ ...quizArgs, classes: quizTransfer.classes, history: quizTransfer.history, slot: 'tx3' }).transferred, 0);
assert.equal(await fetchSessionByPin('123456'), null);
assert.equal(fetches, 0, 'no PIN relay and no external writes');

const pdf = buildResponseCardPdf(config.mappings, cls.name, '4');
assert.equal(pdf.getNumberOfPages(), Math.ceil(config.mappings.length / 4));
assert.ok(Buffer.from(pdf.output('arraybuffer')).subarray(0, 5).equals(Buffer.from('%PDF-')));
const workbook = buildPpctTemplateWorkbook();
assert.deepEqual(workbook.SheetNames, ['PPCT', 'VI_DU_KHONG_NHAP', 'HUONG_DAN']);
const fileBytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
await assert.rejects(() => parsePpctFromExcel({ name: 'template.xlsx', arrayBuffer: async () => fileBytes.buffer.slice(fileBytes.byteOffset, fileBytes.byteOffset + fileBytes.byteLength) } as File), /không có đủ dữ liệu/, 'blank template must not import examples');
XLSX.utils.sheet_add_aoa(workbook.Sheets.PPCT, [[1, 7, 'Toán', 'Bài QA', 1, '']], { origin: 'A2' });
const filledBytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
const imported = await parsePpctFromExcel({ name: 'filled.xlsx', arrayBuffer: async () => filledBytes.buffer.slice(filledBytes.byteOffset, filledBytes.byteOffset + filledBytes.byteLength) } as File);
assert.equal(imported.items.length, 1, 'import only teacher-entered PPCT, not reference examples');
const readback = XLSX.read(fileBytes, { type: 'buffer' });
assert.equal(readback.SheetNames.length, 3);

const ppct: PpctItem[] = [1, 2, 3].map(n => ({ id: 'p' + n, grade: '7', subject: 'Toán', periodNumber: n, lessonTitle: 'Bài ' + n }));
const plan: TeachingPlanItem[] = [{ id: 'done', week: 1, classId: cls.id, className: cls.name, subject: 'Toán', periodNumber: 1, lessonTitle: 'Bài 1', isCompleted: true }];
assert.equal(findNextUntaughtPpctLesson({ classId: cls.id, subject: 'Toán', classes: [cls], ppctItems: ppct, teachingPlan: plan })?.periodNumber, 2);
const collision = checkMakeupCollision({ date: '2026-10-27', period: 1, classId: cls.id, subject: 'Toán', teachingPlan: [], dayOffs: [], timetable: [{ id: 'slot', dayOfWeek: 3, period: 1, classId: 'another', className: '7A8', subject: 'Toán' }] });
assert.equal(collision.hasConflict, true);
const explicitOff = [{ id: 'off', date: '2026-11-20', reason: 'Nghỉ theo quyết định của trường 20/11', allDay: true }];
saveClasses([cls]); saveDayOffs(explicitOff); savePpctItems(ppct);
assert.deepEqual(loadDayOffs(), explicitOff, 'never silently remove teacher-entered day off');
const backup = exportBackupJSON();
savePpctItems([]); saveDayOffs([]);
assert.equal(importBackupJSON(backup), true);
assert.equal(loadPpctItems().length, 3); assert.deepEqual(loadDayOffs(), explicitOff);
memory.set('classgo_review_banks_v1_local_teacher', JSON.stringify([{ id: 'anonymous-private' }]));
assert.equal(loadQuestionBanks('new-signed-user').some(b => b.id === 'anonymous-private'), false);
assert.equal(fetches, 0);
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
assert.equal(vercel.rewrites[0].destination, '/index.html');
assert.equal(new RegExp('^' + vercel.rewrites[0].source + '$').test('/api/generate-questions'), false, 'SPA rewrite must not swallow the AI API');
console.log('PASS: review history/TX/star deduplication, class bank adapter, stable card mappings, account isolation, quiz transfers, real PDF/Excel generation, makeup collision and backup safety. No external requests.');
