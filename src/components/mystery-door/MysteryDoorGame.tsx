import React, { useEffect, useMemo, useState } from 'react';
import type { ClassRoom, QuestionItem, Student } from '../../types';
import { MathRenderer } from '../MathRenderer';
import { DOOR_COUNTS, markDoorOpened, prepareDoors, type Door } from '../../utils/mysteryDoorSession';

interface Props {
  activeClass: ClassRoom;
  student?: Student | null;
  onClose: () => void;
  onEditQuestions: () => void;
  onAwardStars: (studentId: string, count: number) => void;
  onRecordOutcome: (student: Student, question: QuestionItem, outcome: 'Đạt' | 'Chưa đạt') => void;
}

export const MysteryDoorGame: React.FC<Props> = ({
  activeClass, student, onClose, onEditQuestions, onAwardStars, onRecordOutcome,
}) => {
  const [doorCount, setDoorCount] = useState<number>(4);
  const [difficulty, setDifficulty] = useState<'all' | 'basic' | 'advanced'>('all');
  const [chapter, setChapter] = useState('');
  const [lesson, setLesson] = useState('');
  const [doors, setDoors] = useState<Door[]>([]);
  const [activeDoor, setActiveDoor] = useState<number | null>(null);
  const [usedIds, setUsedIds] = useState<string[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [rewarded, setRewarded] = useState(false);

  // The lesson and classroom are part of the identity of a game session.
  useEffect(() => {
    setDoors([]); setActiveDoor(null); setUsedIds([]); setShowAnswer(false);
    setOutcome(null); setRewarded(false);
  }, [activeClass.id, chapter, lesson, difficulty]);

  const questions = useMemo(() => (activeClass.questions || []).filter(q => {
    if (!q.content?.trim()) return false;
    if (chapter && q.chapter !== chapter) return false;
    if (lesson && q.lesson !== lesson) return false;
    const group = q.reviewLevel || (q.level === 'Khó' ? 'advanced' : 'basic');
    return difficulty === 'all' || difficulty === group;
  }), [activeClass.questions, chapter, lesson, difficulty]);
  const chapterChoices = useMemo(
    () => [...new Set((activeClass.questions || []).map(q => q.chapter).filter((v): v is string => Boolean(v)))],
    [activeClass.questions]
  );
  const lessonChoices = useMemo(
    () => [...new Set((activeClass.questions || []).filter(q => !chapter || q.chapter === chapter)
      .map(q => q.lesson).filter((v): v is string => Boolean(v)))],
    [activeClass.questions, chapter]
  );
  const unused = new Set(questions.filter(q => !usedIds.includes(q.id)).map(q => q.id)).size;
  const current = doors.find(d => d.number === activeDoor);
  const remainingDoors = doors.filter(d => !d.opened).length;

  const startRound = () => {
    const newDoors = prepareDoors(questions, doorCount, usedIds);
    if (!newDoors.length) return;
    setDoors(newDoors); setActiveDoor(null); setShowAnswer(false);
    setOutcome(null); setRewarded(false);
  };
  const openDoor = (door: Door) => {
    if (door.opened || activeDoor !== null) return;
    setDoors(before => markDoorOpened(before, door.number));
    setUsedIds(before => before.includes(door.question.id) ? before : [...before, door.question.id]);
    setActiveDoor(door.number); setShowAnswer(false);
    setOutcome(null); setRewarded(false);
  };
  const next = () => {
    setActiveDoor(null); setShowAnswer(false); setOutcome(null); setRewarded(false);
    if (!remainingDoors) setDoors([]);
  };
  const evaluate = (decision: 'Đạt' | 'Chưa đạt') => {
    if (!student || !current || outcome) return;
    onRecordOutcome(student, current.question, decision);
    setOutcome(decision);
  };
  return (
    <div role="dialog" aria-modal="true" aria-label="Ô cửa bí mật kiểm tra bài cũ"
      className="fixed inset-0 z-[90] bg-slate-950/95 text-white overflow-y-auto p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 pb-4">
          <div>
            <h2 className="text-2xl font-black text-amber-300">🚪 Ô CỬA BÍ MẬT</h2>
            <p className="text-sm text-slate-300">Kiểm tra bài cũ • {activeClass.name} • {activeClass.subject || 'Môn học'}</p>
            <p className="text-sm text-emerald-300 mt-1">
              {student ? `Học sinh: ${student.name}` : 'Chế độ độc lập — không gắn kết quả cho học sinh'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-600 px-4 py-2 hover:bg-slate-800">✕ Đóng</button>
        </header>

        {!doors.length ? (
          <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4">
            <h3 className="text-lg font-bold">Chọn câu hỏi cho lượt chơi</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <label className="text-sm">Chương
                <select value={chapter} onChange={e => { setChapter(e.target.value); setLesson(''); }}
                  className="block w-full mt-1 bg-slate-800 rounded-lg p-2 border border-slate-600">
                  <option value="">Tất cả chương</option>
                  {chapterChoices.map(ch => <option key={ch} value={ch}>{ch}</option>)}
                </select>
              </label>
              <label className="text-sm">Bài học
                <select value={lesson} onChange={e => setLesson(e.target.value)}
                  className="block w-full mt-1 bg-slate-800 rounded-lg p-2 border border-slate-600">
                  <option value="">Tất cả bài</option>
                  {lessonChoices.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="text-sm">Mức độ
                <select value={difficulty} onChange={e => setDifficulty(e.target.value as typeof difficulty)}
                  className="block w-full mt-1 bg-slate-800 rounded-lg p-2 border border-slate-600">
                  <option value="all">Tất cả</option><option value="basic">Cơ bản</option>
                  <option value="advanced">Nâng cao</option>
                </select>
              </label>
            </div>
            <p className="text-sm text-slate-300">Còn {unused} câu chưa sử dụng trong phiên • Tổng {questions.length} câu phù hợp</p>
            <div className="flex gap-2 flex-wrap" role="group" aria-label="Số ô cửa">
              {DOOR_COUNTS.map(n => <button key={n} type="button" onClick={() => setDoorCount(n)}
                aria-pressed={doorCount === n} className={`rounded-lg px-4 py-2 font-bold border ${doorCount === n ? 'bg-amber-500 text-slate-950 border-amber-400' : 'border-slate-600'}`}>{n} ô</button>)}
            </div>
            {unused < doorCount && <p className="text-amber-300 text-sm">Cần ít nhất {doorCount} câu chưa dùng. Hãy chọn ít ô hơn hoặc thêm câu hỏi.</p>}
            <div className="flex flex-wrap gap-3">
              <button disabled={unused < doorCount} onClick={startRound}
                className="px-5 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold disabled:opacity-40">Bắt đầu</button>
              <button onClick={onEditQuestions} className="px-4 py-3 rounded-xl bg-indigo-700 font-bold">Quản lý câu hỏi</button>
              {usedIds.length > 0 && <button onClick={() => setUsedIds([])}
                className="px-4 py-3 rounded-xl border border-rose-500/60 text-rose-200">Làm mới phiên</button>}
            </div>
          </section>
        ) : !current ? (
          <section className="space-y-4">
            <p className="text-sm text-slate-300">Chọn một ô. Câu hỏi được cố định ngẫu nhiên khi bắt đầu ván và không hiện trước khi mở.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 max-w-4xl mx-auto">
              {doors.map(door => <button key={door.number} type="button"
                onClick={() => openDoor(door)} disabled={door.opened}
                className={`aspect-[3/4] rounded-2xl border-2 flex flex-col justify-center items-center gap-3 transition-transform ${door.opened ? 'opacity-30 bg-slate-800 border-slate-700 cursor-not-allowed' : 'border-amber-500/50 bg-gradient-to-b from-indigo-900 to-slate-900 hover:scale-105'}`}>
                <span className="text-sm text-amber-300">{door.opened ? 'ĐÃ MỞ' : 'Ô CỬA'}</span>
                <span className="text-6xl font-black text-amber-300">{door.number}</span>
                <span className="text-xs">{door.opened ? '✓' : '🔒 Chọn cửa'}</span>
              </button>)}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border-2 border-amber-500/60 bg-slate-900 p-5 sm:p-8 space-y-5">
            <h3 className="text-lg text-amber-300 font-black">Ô CỬA SỐ {current.number}</h3>
            <div className="text-xl sm:text-3xl font-bold leading-relaxed bg-slate-950 p-5 rounded-xl">
              <MathRenderer text={current.question.content} />
            </div>
            {current.question.imageUrl && <img src={current.question.imageUrl} alt="Hình minh họa câu hỏi"
              className="max-h-80 mx-auto rounded-lg object-contain" />}
            <button onClick={() => setShowAnswer(!showAnswer)}
              className="rounded-xl px-4 py-2 border border-sky-500 text-sky-200">
              {showAnswer ? 'Ẩn đáp án' : 'Hiện đáp án'}
            </button>
            {showAnswer && <div className="rounded-xl p-4 border border-emerald-500/40 bg-emerald-950/30 text-lg">
              <MathRenderer text={current.question.suggestedAnswer || 'Chưa có đáp án tham khảo.'} />
            </div>}
            {student && <div className="space-y-3 border-t border-slate-700 pt-4">
              <p className="text-sm text-slate-300">Giáo viên quyết định kết quả; không tự động ghi điểm vào sổ điểm.</p>
              <div className="flex flex-wrap gap-2">
                <button disabled={Boolean(outcome)} onClick={() => evaluate('Đạt')}
                  className="bg-emerald-700 px-4 py-2 rounded-lg font-bold disabled:opacity-50">✓ Đạt</button>
                <button disabled={Boolean(outcome)} onClick={() => evaluate('Chưa đạt')}
                  className="bg-rose-800 px-4 py-2 rounded-lg font-bold disabled:opacity-50">Chưa đạt</button>
                <button disabled={rewarded} onClick={() => { onAwardStars(student.id, 1); setRewarded(true); }}
                  className="bg-amber-600 px-4 py-2 rounded-lg font-bold disabled:opacity-50">⭐ +1 sao</button>
              </div>
              {outcome && <p className="text-emerald-300" role="status">Đã ghi nhận: {outcome}</p>}
            </div>}
            <button onClick={next} className="bg-indigo-600 hover:bg-indigo-500 px-5 py-3 rounded-xl font-bold">
              {remainingDoors ? `Về bảng cửa (còn ${remainingDoors} ô)` : 'Kết thúc ván • Tạo ván tiếp'}
            </button>
          </section>
        )}
      </div>
    </div>
  );
};
