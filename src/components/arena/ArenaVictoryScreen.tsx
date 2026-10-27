import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  RotateCcw,
  X,
  CheckCircle2,
  XCircle,
  Zap,
  Clock,
  Sparkles,
  ChevronDown,
  Award,
} from 'lucide-react';
import { ArenaQuestion, ArenaTeamState } from '../../types/arenaTypes';
import { ArenaMascot } from './ArenaMascot';
import { MathRenderer } from '../MathRenderer';

interface ArenaVictoryScreenProps {
  team1: ArenaTeamState;
  team2: ArenaTeamState;
  questions: ArenaQuestion[];
  onPlayAgain: () => void;
  onExit: () => void;
}

export const ArenaVictoryScreen: React.FC<ArenaVictoryScreenProps> = ({
  team1,
  team2,
  questions,
  onPlayAgain,
  onExit,
}) => {
  const isDraw = team1.score === team2.score;
  const winner = team1.score > team2.score ? team1 : team2;
  const runnerUp = team1.score > team2.score ? team2 : team1;

  // Trigger celebration confetti on mount
  useEffect(() => {
    try {
      const end = Date.now() + 3000;
      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#f59e0b', '#06b6d4', '#ec4899', '#10b981'],
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#f59e0b', '#06b6d4', '#ec4899', '#10b981'],
        });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    } catch {
      // ignore
    }
  }, []);

  // Compute stats
  const computeStats = (team: ArenaTeamState) => {
    const total = questions.length;
    const correctCount = team.history.filter((h) => h.isCorrect).length;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const responseTimes = team.history
      .map((h) => h.responseTimeMs)
      .filter((t): t is number => typeof t === 'number' && t > 0);
    const avgTimeMs =
      responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : null;

    return { total, correctCount, accuracy, avgTimeMs };
  };

  const t1Stats = computeStats(team1);
  const t2Stats = computeStats(team2);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col overflow-y-auto font-sans p-4 sm:p-8 animate-fade-in">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto w-full my-auto space-y-6 relative z-10">
        {/* Top Celebration Trophy */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-4 rounded-3xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-orange-500 text-slate-950 shadow-2xl shadow-yellow-500/30 animate-bounce-subtle">
            <Trophy className="w-12 h-12 sm:w-16 sm:h-16 fill-current drop-shadow-md" />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30 inline-block">
              CLASSGO ARENA CHAMPIONSHIP
            </span>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              {isDraw ? 'HÒA NHAU – NGANG TÀI NGANG SỨC!' : `ĐỘI CHIẾN THẮNG: ${winner.name}!`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              {isDraw
                ? 'Hai đội đã cống hiến một trận đấu kịch tính và tuyệt vời!'
                : `Chúc mừng ${winner.name} đã xuất sắc giành ngôi vị quán quân Đấu Trường Kiến Thức!`}
            </p>
          </div>
        </div>

        {/* Podium Presentation Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Team 1 Stat Box */}
          <div
            className={`rounded-3xl p-5 border-2 relative overflow-hidden backdrop-blur-md flex flex-col justify-between transition-all ${
              !isDraw && winner.id === 'team1'
                ? 'bg-gradient-to-br from-orange-950/60 via-slate-900 to-slate-950 border-amber-400 shadow-2xl shadow-amber-500/20 ring-2 ring-amber-400/50'
                : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ArenaMascot
                  mascotId={team1.mascotId}
                  mood={!isDraw && winner.id === 'team1' ? 'winner' : 'idle'}
                  size="md"
                  showBadge={false}
                />
                <div>
                  <div className="text-[10px] font-bold uppercase text-orange-400">ĐỘI 1</div>
                  <h3 className="text-lg font-black text-white truncate">{team1.name}</h3>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl sm:text-4xl font-black text-amber-300 tracking-tight">
                  {team1.score}
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Tổng điểm</div>
              </div>
            </div>

            {/* Stat Row */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-800 text-center text-xs">
              <div className="bg-slate-950/60 p-2 rounded-xl">
                <div className="font-black text-white text-base">
                  {t1Stats.correctCount} / {t1Stats.total}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">Số câu đúng</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-xl">
                <div className="font-black text-emerald-400 text-base">{t1Stats.accuracy}%</div>
                <div className="text-[10px] text-slate-400 font-medium">Tỷ lệ đúng</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-xl">
                <div className="font-black text-sky-400 text-base">
                  {t1Stats.avgTimeMs ? `${(t1Stats.avgTimeMs / 1000).toFixed(1)}s` : '--'}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">Tốc độ TB</div>
              </div>
            </div>
          </div>

          {/* Team 2 Stat Box */}
          <div
            className={`rounded-3xl p-5 border-2 relative overflow-hidden backdrop-blur-md flex flex-col justify-between transition-all ${
              !isDraw && winner.id === 'team2'
                ? 'bg-gradient-to-br from-cyan-950/60 via-slate-900 to-slate-950 border-amber-400 shadow-2xl shadow-amber-500/20 ring-2 ring-amber-400/50'
                : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ArenaMascot
                  mascotId={team2.mascotId}
                  mood={!isDraw && winner.id === 'team2' ? 'winner' : 'idle'}
                  size="md"
                  showBadge={false}
                />
                <div>
                  <div className="text-[10px] font-bold uppercase text-cyan-400">ĐỘI 2</div>
                  <h3 className="text-lg font-black text-white truncate">{team2.name}</h3>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl sm:text-4xl font-black text-cyan-300 tracking-tight">
                  {team2.score}
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Tổng điểm</div>
              </div>
            </div>

            {/* Stat Row */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-800 text-center text-xs">
              <div className="bg-slate-950/60 p-2 rounded-xl">
                <div className="font-black text-white text-base">
                  {t2Stats.correctCount} / {t2Stats.total}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">Số câu đúng</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-xl">
                <div className="font-black text-emerald-400 text-base">{t2Stats.accuracy}%</div>
                <div className="text-[10px] text-slate-400 font-medium">Tỷ lệ đúng</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-xl">
                <div className="font-black text-sky-400 text-base">
                  {t2Stats.avgTimeMs ? `${(t2Stats.avgTimeMs / 1000).toFixed(1)}s` : '--'}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">Tốc độ TB</div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Question Review List */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 space-y-3">
          <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-tight flex items-center gap-2">
            <span>📋 BẢNG TỔNG KẾT CHI TIẾT TỪNG CÂU HỎI</span>
          </h3>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {questions.map((q, idx) => {
              const t1Hist = team1.history[idx];
              const t2Hist = team2.history[idx];

              return (
                <div
                  key={q.id}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] flex items-center justify-center border border-slate-700">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-200">
                        <MathRenderer text={q.stem} />
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-400 font-semibold pl-7">
                      Đáp án đúng: <strong>{q.correctKey}</strong>
                    </div>
                  </div>

                  {/* Team Answers Badges */}
                  <div className="flex items-center gap-2 shrink-0 pl-7 sm:pl-0">
                    <div
                      className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 font-bold ${
                        t1Hist?.isCorrect
                          ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                          : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                      }`}
                    >
                      <span className="text-orange-400">{team1.name}:</span>
                      <span>{t1Hist?.selectedOption || 'Không chọn'}</span>
                      {t1Hist?.isCorrect ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      )}
                    </div>

                    <div
                      className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 font-bold ${
                        t2Hist?.isCorrect
                          ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                          : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                      }`}
                    >
                      <span className="text-cyan-400">{team2.name}:</span>
                      <span>{t2Hist?.selectedOption || 'Không chọn'}</span>
                      {t2Hist?.isCorrect ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onPlayAgain}
            className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>ĐẤU LẠI TRẬN MỚI</span>
          </button>

          <button
            type="button"
            onClick={onExit}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors cursor-pointer"
          >
            <span>Thoát về ClassGo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
