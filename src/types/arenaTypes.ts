import { ReviewQuestionLevel } from '../types';

export type MascotMood = 'idle' | 'locked' | 'correct' | 'wrong' | 'winner';

export interface ArenaMascotDef {
  id: string;
  name: string;
  emoji: string;
  badge: string;
  accentColor: string; // e.g. '#f97316'
  bgGradient: string;
  description: string;
}

export interface ArenaTeamPreset {
  id: string;
  pairLabel: string;
  team1: {
    name: string;
    mascotId: string;
    mascotName: string;
    color: 'rose' | 'amber' | 'orange' | 'red';
  };
  team2: {
    name: string;
    mascotId: string;
    mascotName: string;
    color: 'cyan' | 'blue' | 'indigo' | 'sky';
  };
}

export interface ArenaQuestionOption {
  key: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface ArenaQuestion {
  id: string;
  stem: string;
  options: ArenaQuestionOption[];
  correctKey: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  level?: ReviewQuestionLevel;
  imageUrl?: string;
  bankId?: string;
  lessonName?: string;
}

export interface ArenaTeamState {
  id: 'team1' | 'team2';
  name: string;
  mascotId: string;
  color: string;
  score: number;
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
  lockedAt: number | null; // performance.now() timestamp
  isLocked: boolean;
  isCorrect: boolean | null;
  speedBonusEarned: boolean;
  history: Array<{
    questionId: string;
    selectedOption: 'A' | 'B' | 'C' | 'D' | null;
    isCorrect: boolean;
    pointsAwarded: number;
    responseTimeMs: number | null;
  }>;
}

export interface ArenaMatchSettings {
  questionCount: number; // 5, 10, 15, 20 or custom
  timePerQuestion: number; // in seconds (0 = unlimited)
  basePoints: number; // default 10
  speedBonus: boolean; // default false
  speedBonusPoints: number; // default 5
  doubleFinalQuestion: boolean; // default true
  soundEnabled: boolean; // default true
  reducedMotion: boolean; // default false
  autoReveal: boolean; // default true (reveal once both locked or timed out)
  showMascots: boolean; // default true
  classId?: string;
  className?: string;
}

export type ArenaGamePhase = 'SETUP' | 'INTRO' | 'QUESTION' | 'REVEAL' | 'VICTORY';
