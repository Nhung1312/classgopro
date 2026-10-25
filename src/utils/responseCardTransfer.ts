import type { ClassRoom, HistoryRecord } from '../types';
import type { QuizSession } from '../types/responseCardTypes';
import { calculateSessionScorePreview } from '../services/responseCardStorage';
import { normalizeSubjectName } from './timetableExcelService';

/** Teacher-confirmed transfer, idempotent per session/student, never overwrites existing TX. */
export function transferResponseCardScores(args: { session: QuizSession; classes: ClassRoom[];
  history: HistoryRecord[]; classId: string; slot: 'tx1' | 'tx2' | 'tx3' | 'tx4'; studentIds: string[] }) {
  const { session, classes, history, classId, slot, studentIds } = args;
  const cls = classes.find(c => c.id === classId);
  const fail = (message: string) => ({ classes, history, transferred: 0, skipped: studentIds.length, message });
  if (!cls || cls.id !== session.classId || session.status !== 'completed')
    return fail('Cần kết thúc phiên đúng lớp trước khi chuyển điểm.');
  if (!['tx1', 'tx2', 'tx3', 'tx4'].includes(slot)) return fail('Cột TX không hợp lệ.');
  if (normalizeSubjectName(session.subject || 'Toán') !== normalizeSubjectName(cls.subject || 'Toán'))
    return fail('Môn của phiên kiểm tra khác môn trong Sổ điểm lớp. Chưa chuyển điểm để tránh ghi sai môn.');
  const selected = new Set(studentIds);
  const previews = calculateSessionScorePreview(session, cls, slot);
  const records: HistoryRecord[] = [];
  const now = new Date();
  const students = cls.students.map(student => {
    const preview = previews.find(p => p.studentId === student.id);
    const recordId = `response-${session.id}-${student.id}`;
    if (!selected.has(student.id) || !preview || !preview.totalAnswered || preview.hasConflict ||
        history.some(h => h.id === recordId)) return student;
    records.push({ id: recordId, timestamp: now.toISOString(), formattedDate: now.toLocaleDateString('vi-VN'),
      formattedTime: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      classId, className: cls.name, studentId: student.id, studentName: student.name,
      callCountAfter: student.callCount || 0, mode: 'FAIR', recordType: 'RESPONSE_CARDS',
      score: preview.calculatedScore, assignedTxSlot: slot,
      note: `[Thẻ trả lời - ${session.subject || 'Toán'}] ${session.title} (${preview.correctCount}/${preview.totalQuestions} câu)` });
    return { ...student, scores: { ...student.scores, [slot]: preview.calculatedScore } };
  });
  return { classes: records.length ? classes.map(c => c.id !== classId ? c : { ...c, students }) : classes,
    history: [...records, ...history], transferred: records.length, skipped: selected.size - records.length,
    message: `Đã chuyển ${records.length} điểm vào ${slot.toUpperCase()}. Bỏ qua ${selected.size - records.length} lượt đã có điểm hoặc đã chuyển.` };
}
