import { ReviewQuestionLevel } from '../types';

export type CardOrientationAnswer = 'A' | 'B' | 'C' | 'D';

export interface ResponseCardMapping {
  classId: string;
  studentId: string;
  studentCode?: string;
  studentName: string;
  cardId: number; // 1 to 120
  isSpare?: boolean; // Thẻ dự phòng của lớp
  createdAt: string;
}

export interface ResponseCardClassConfig {
  classId: string;
  mappings: ResponseCardMapping[];
  spareCardsCount?: number; // Số thẻ dự phòng in thêm cho lớp
  updatedAt: string;
}

export interface QuizQuestionItem {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: CardOrientationAnswer;
  subject?: string;
  grade?: string;
  chapter?: string;
  lesson?: string;
  level?: ReviewQuestionLevel;
  explanation?: string;
}

export interface StudentAnswerRecord {
  studentId: string;
  studentName: string;
  studentCode?: string;
  cardId: number;
  selectedOption: CardOrientationAnswer;
  isCorrect: boolean;
  timestamp: number;
  manual?: boolean;
}

export interface QuestionSessionResult {
  questionId: string;
  question: QuizQuestionItem;
  answers: Record<string, StudentAnswerRecord>; // key is studentId
  status: 'collecting' | 'locked' | 'revealed';
  startedAt: number;
  endedAt?: number;
}

export interface QuizSession {
  id: string;
  classId: string;
  className: string;
  subject?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  questions: QuizQuestionItem[];
  currentQuestionIndex: number;
  results: QuestionSessionResult[];
  status: 'draft' | 'running' | 'completed';
  sessionPin?: string; // 6-digit sync pin for phone-to-computer live sync
  sessionToken?: string; // Secure token for authorized scanner connection
  teacherId?: string; // Owner UID of the teacher creating this session
  cardMappings?: ResponseCardMapping[]; // Bảng gán thẻ của lớp đính kèm để quét mượt mà trên mọi thiết bị
}

export interface DetectedMarker {
  cardId: number;
  option: CardOrientationAnswer;
  confidence: number;
  corners: Array<{ x: number; y: number }>;
}

export type CardPrintLayout = '2' | '4' | '6'; // 2 cards/page, 4 cards/page, 6 cards/page
