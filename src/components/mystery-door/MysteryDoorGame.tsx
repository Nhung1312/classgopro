import React, { useEffect, useMemo, useState, useRef } from 'react';
import type { ClassRoom, QuestionItem, Student } from '../../types';
import { MathRenderer } from '../MathRenderer';
import { DOOR_COUNTS, markDoorOpened, prepareDoors, type Door } from '../../utils/mysteryDoorSession';
import { parseMultipleChoice, type ChoiceLetter } from '../../utils/reviewQuestionChoices';
import type { MysteryAssessmentUpdate } from '../../utils/mysteryDoorAssessment';

interface Props {
  activeClass: ClassRoom;
  student?: Student | null;
  onClose: () => void;
  onEditQuestions: () => void;
  onAwardStars: (studentId: string, count: number) => void;
  onRecordOutcome: (student: Student, question: QuestionItem, attemptId: string, change: MysteryAssessmentUpdate) =>
    { saved: boolean; message: string };
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
  const [chosenAnswer, setChosenAnswer] = useState<ChoiceLetter | null>(null);
  const [answerChecked, setAnswerChecked] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [rewarded, setRewarded] = useState(false);
  const [attemptId, setAttemptId] = useState('');
  const [scoreInput, setScoreInput] = useState('');
  const [saveToGradebook, setSaveToGradebook] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [scoreFeedback, setScoreFeedback] = useState('');
  const scoreSavedRef = useRef(false);
  const recordedRef = useRef(false);
  const rewardedRef = useRef(false);

  // The lesson and classroom are part of the identity of a game session.
  useEffect(() => {
    setDoors([]); setActiveDoor(null); setUsedIds([]); setShowAnswer(false);
    setChosenAnswer(null); setAnswerChecked(false);
    setOutcome(null); setRewarded(false);
    recordedRef.current = false; rewardedRef.current = false; scoreSavedRef.current = false;
    setAttemptId(''); setScoreInput(''); setSaveToGradebook(false);
    setScoreSaved(false); setScoreFeedback('');
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
  const quiz = useMemo(() => current
    ? parseMultipleChoice(current.question.content, current.question.suggestedAnswer)
    : null, [current?.question.content, current?.question.suggestedAnswer]);

  const startRound = () => {
    const newDoors = prepareDoors(questions, doorCount, usedIds);
    if (!newDoors.length) return;
    setDoors(newDoors); setActiveDoor(null); setShowAnswer(false);
    setChosenAnswer(null); setAnswerChecked(false);
    setOutcome(null); setRewarded(false);
    recordedRef.current = false; rewardedRef.current = false; scoreSavedRef.current = false;
    setAttemptId(''); setScoreInput(''); setSaveToGradebook(false);
    setScoreSaved(false); setScoreFeedback('');
  };
  const openDoor = (door: Door) => {
    if (door.opened || activeDoor !== null) return;
    setDoors(before => markDoorOpened(before, door.number));
    setUsedIds(before => before.includes(door.question.id) ? before : [...before, door.question.id]);
    setActiveDoor(door.number); setShowAnswer(false);
    setChosenAnswer(null); setAnswerChecked(false);
    setOutcome(null); setRewarded(false);
    recordedRef.current = false; rewardedRef.current = false; scoreSavedRef.current = false;
    setAttemptId(`review-${Date.now()}-${door.question.id}-${Math.random().toString(36).slice(2, 8)}`);
    setScoreInput(''); setSaveToGradebook(false);
    setScoreSaved(false); setScoreFeedback('');
  };
  const next = () => {
    setActiveDoor(null); setShowAnswer(false); setOutcome(null); setRewarded(false);
    setChosenAnswer(null); setAnswerChecked(false);
    recordedRef.current = false; rewardedRef.current = false; scoreSavedRef.current = false;
    setAttemptId(''); setScoreInput(''); setSaveToGradebook(false);
    setScoreSaved(false); setScoreFeedback('');
    if (!remainingDoors) setDoors([]);
  };
  const evaluate = (decision: 'Đạt' | 'Chưa đạt') => {
    if (!student || !current || !attemptId || outcome || recordedRef.current) return;
    recordedRef.current = true;
    const result = onRecordOutcome(student, current.question, attemptId, { outcome: decision });
    if (!result.saved) {
      recordedRef.current = false;
      setScoreFeedback(result.message);
      return;
    }
    setOutcome(decision);
    setScoreFeedback(result.message);
  };

  const saveManualScore = () => {
    if (!student || !current || !attemptId || scoreSavedRef.current) return;
    const input = scoreInput.trim().replace(',', '.');
    if (!/^(?:10(?:\.0)?|[0-9](?:\.[0-9])?)$/.test(input)) {
      setScoreFeedback('Hãy nhập điểm hợp lệ từ 0 đến 10, tối đa một chữ số thập phân.');
      return;
    }
    const numericScore = Number(input);
    if (saveToGradebook && !window.confirm(
      `Xác nhận ghi ${numericScore} điểm vào ô TX còn trống của ${student.name}? Không ghi đè điểm đã có.`
    )) return;
    scoreSavedRef.current = true;
    const result = onRecordOutcome(student, current.question, attemptId, {
      score: numericScore, saveToGradebook,
    });
    if (!result.saved) {
      scoreSavedRef.current = false;
      setScoreFeedback(result.message);
      return;
    }
    setScoreSaved(true);
    setScoreFeedback(result.message);
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
              {usedIds.length > 0 && <button onClick={() => { if (window.confirm('Tạo phiên mới? Câu hỏi đã dùng có thể xuất hiện lại.')) setUsedIds([]); }}
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
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 sm:p-8 shadow-2xl space-y-6 text-slate-900">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm sm:text-base tracking-wider text-indigo-700 font-black uppercase">🚪 Ô cửa số {current.number}</h3>
              {quiz && <span className="text-xs sm:text-sm text-slate-500">Chọn đáp án đúng</span>}
            </div>
            {/* Keep the mathematical stem separate from answer choices, so fractions
                have proper spacing and A-D are actual touch targets. */}
            <div className="px-0 sm:px-1 py-1 text-[clamp(1.5rem,2.5vw,2rem)] leading-relaxed font-semibold text-slate-950 [&_.katex]:leading-normal">
              <MathRenderer text={quiz ? quiz.stem : current.question.content} />
            </div>
            {quiz && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5" role="group" aria-label="Chọn đáp án trắc nghiệm">
                  {quiz.options.map(option => {
                    const selected = chosenAnswer === option.letter;
                    const correct = answerChecked && quiz.correctLetter === option.letter;
                    const incorrect = answerChecked && selected && quiz.correctLetter !== option.letter;
                    const classes = correct
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200'
                      : incorrect ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-200'
                      : selected ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40';
                    const badge = {
                      A: 'bg-indigo-100 text-indigo-700 border-indigo-200',
                      B: 'bg-blue-100 text-blue-700 border-blue-200',
                      C: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                      D: 'bg-amber-100 text-amber-800 border-amber-200',
                    }[option.letter];
                    return (
                      <button key={option.letter} type="button" aria-pressed={selected}
                        aria-label={`Chọn đáp án ${option.letter}`}
                        disabled={answerChecked}
                        onClick={() => setChosenAnswer(option.letter)}
                        className={`group min-h-[110px] flex items-center gap-4 sm:gap-5 rounded-[19px] border-[3px] px-4 sm:px-6 py-4 text-left shadow-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 disabled:cursor-default ${classes}`}>
                        <span aria-hidden="true" className={`flex shrink-0 h-[54px] w-[54px] items-center justify-center rounded-xl border text-[22px] font-black ${badge}`}>
                          {option.letter}
                        </span>
                        <span className="min-w-0 flex-1 py-3 break-words text-[22px] sm:text-2xl leading-relaxed font-semibold text-slate-950 [&_.katex]:leading-normal">
                          <MathRenderer text={option.content} />
                        </span>
                        {correct && <span className="shrink-0 text-2xl font-black text-emerald-700" aria-hidden="true">✓</span>}
                        {incorrect && <span className="shrink-0 text-2xl font-black text-rose-700" aria-hidden="true">✕</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button"
                    disabled={!chosenAnswer || answerChecked || !quiz.correctLetter}
                    onClick={() => setAnswerChecked(true)}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-3 font-bold text-white shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed">
                    Kiểm tra đáp án
                  </button>
                  {!quiz.correctLetter && (
                    <span className="text-sm text-amber-800">
                      Chưa có đáp án A–D chuẩn để chấm tự động. Giáo viên có thể hiện đáp án tham khảo bên dưới.
                    </span>
                  )}
                </div>
                {answerChecked && quiz.correctLetter && chosenAnswer && (
                  <p role="status" aria-live="polite"
                    className={`rounded-xl p-4 font-bold text-lg border ${chosenAnswer === quiz.correctLetter
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-rose-50 border-rose-300 text-rose-800'}`}>
                    {chosenAnswer === quiz.correctLetter
                      ? '✓ Chính xác! Em đã chọn đáp án đúng.'
                      : `✕ Chưa đúng. Đáp án đúng là ${quiz.correctLetter}.`}
                  </p>
                )}
              </div>
            )}
            {current.question.imageUrl && <img src={current.question.imageUrl} alt="Hình minh họa câu hỏi"
              className="max-h-80 mx-auto rounded-lg object-contain" />}
            <button onClick={() => setShowAnswer(!showAnswer)}
              className="rounded-xl px-4 py-2 border border-sky-300 text-sky-800 hover:bg-sky-50 font-semibold">
              {showAnswer ? 'Ẩn đáp án' : 'Hiện đáp án'}
            </button>
            {showAnswer && <div className="rounded-xl p-4 border border-emerald-200 bg-emerald-50 text-lg text-slate-900">
              <MathRenderer text={current.question.suggestedAnswer || 'Chưa có đáp án tham khảo.'} />
            </div>}
            {student && <div className="space-y-3 border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600">Giáo viên quyết định kết quả; không tự động ghi điểm vào sổ điểm.</p>
              <div className="flex flex-wrap gap-2">
                <button disabled={Boolean(outcome)} onClick={() => evaluate('Đạt')}
                  className="bg-emerald-700 px-4 py-2 rounded-lg font-bold disabled:opacity-50">✓ Đạt</button>
                <button disabled={Boolean(outcome)} onClick={() => evaluate('Chưa đạt')}
                  className="bg-rose-800 px-4 py-2 rounded-lg font-bold disabled:opacity-50">Chưa đạt</button>
                <button disabled={rewarded} onClick={() => { if (rewardedRef.current) return; rewardedRef.current = true; onAwardStars(student.id, 1); setRewarded(true); }}
                  className="bg-amber-600 px-4 py-2 rounded-lg font-bold disabled:opacity-50">⭐ +1 sao</button>
              </div>
              {outcome && <p className="text-emerald-800 font-semibold">Đã ghi nhận: {outcome}</p>}
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
                <div>
                  <h4 className="font-bold text-indigo-900">📝 Giáo viên cho điểm (0–10)</h4>
                  <p className="text-xs text-slate-600 mt-1">Chỉ lưu khi giáo viên nhấn nút. Trả lời trắc nghiệm đúng không tự ghi điểm.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[10, 9, 8, 7, 6, 5].map(value => (
                    <button type="button" key={value} disabled={scoreSaved}
                      onClick={() => setScoreInput(String(value))}
                      aria-pressed={scoreInput === String(value)}
                      className={`px-4 py-2 font-bold rounded-xl border text-sm disabled:opacity-50 ${
                        scoreInput === String(value)
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white border-slate-300 text-slate-900 hover:border-indigo-400'
                      }`}>
                      {value}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-sm font-semibold text-slate-700" htmlFor="mystery-score-input">
                    Điểm khác:
                  </label>
                  <input id="mystery-score-input" type="number" min="0" max="10" step="0.1"
                    inputMode="decimal" value={scoreInput} disabled={scoreSaved}
                    onChange={e => { setScoreInput(e.target.value); setScoreFeedback(''); }}
                    placeholder="0–10" className="w-28 rounded-lg border border-slate-300 p-2 text-slate-950 bg-white font-semibold disabled:opacity-50" />
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700 font-medium">
                    <input type="checkbox" checked={saveToGradebook} disabled={scoreSaved}
                      onChange={e => setSaveToGradebook(e.target.checked)}
                      className="h-4 w-4 accent-indigo-600" />
                    Ghi điểm vào Sổ điểm TX (ô còn trống)
                  </label>
                </div>
                <button type="button" onClick={saveManualScore}
                  disabled={scoreSaved || !scoreInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold disabled:opacity-40">
                  {scoreSaved ? '✓ Đã lưu điểm' : 'Lưu điểm'}
                </button>
                {scoreFeedback && <p className="text-sm font-semibold text-indigo-900" role="status">{scoreFeedback}</p>}
              </div>
            </div>}
            <button onClick={next} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300">
              {remainingDoors ? `Về bảng cửa (còn ${remainingDoors} ô)` : 'Kết thúc ván • Tạo ván tiếp'}
            </button>
          </section>
        )}
      </div>
    </div>
  );
};
