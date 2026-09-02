export interface Student {
  id: string;
  name: string;
  callCount: number;
  gender?: 'nam' | 'nu' | 'khac';
  studentCode?: string;
  notes?: string;
  lastCalledAt?: string;
  isAbsent?: boolean; // Temporary absent for today's session
  stars?: number; // Total reward stars
  scores?: {
    tx1?: number | null; // Điểm kiểm tra thường xuyên / miệng 1
    tx2?: number | null; // Điểm kiểm tra thường xuyên 2 (15p)
    tx3?: number | null; // Điểm kiểm tra thường xuyên 3
    tx4?: number | null; // Điểm kiểm tra thường xuyên 4
    gk?: number | null;  // Điểm đánh giá giữa kỳ (Hệ số 2)
    ck?: number | null;  // Điểm đánh giá cuối kỳ (Hệ số 3)
  };
}

export interface QuestionItem {
  id: string;
  content: string;
  subject?: string;
  level?: 'Dễ' | 'Trung bình' | 'Khó';
  suggestedAnswer?: string;
  imageUrl?: string; // Optional image URL or base64 screenshot
  hint?: string; // Optional hint for students
}

export interface TimetableSlot {
  id: string;
  dayOfWeek: 2 | 3 | 4 | 5 | 6 | 7; // Thứ 2 - Thứ 7
  period: number; // Tiết 1 - 10 (1-5 sáng, 6-10 chiều)
  classId: string;
  className: string;
  subject: string; // VD: Đại số, Hình học, Toán 10
  room?: string; // Phòng học
  note?: string; // Tên bài dạy / Tiến độ bài học
}

export interface TeachingPlanItem {
  id: string;
  week: number;
  classId: string;
  className: string;
  periodNumber: number; // Tiết theo phân phối chương trình (VD: Tiết 14)
  lessonTitle: string; // Tên bài học
  date?: string;
  isCompleted?: boolean;
  notes?: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  subject?: string;
  academicYear?: string;
  students: Student[];
  questions?: QuestionItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface HistoryRecord {
  id: string;
  timestamp: string;
  formattedDate: string;
  formattedTime: string;
  classId: string;
  className: string;
  studentId: string;
  studentName: string;
  callCountAfter: number;
  mode: 'FAIR' | 'PURE';
  score?: string | number;
  note?: string;
  questionContent?: string;
  starsAwarded?: number;
}

export type AppTab = 'SPIN' | 'TIMETABLE' | 'GRADEBOOK' | 'CLASSES' | 'IMPORT' | 'STATS' | 'HISTORY' | 'SETTINGS';

export type SelectionMode = 'FAIR' | 'PURE';

export type SpinVisualType = 'SLOT' | 'WHEEL' | 'CARDS' | 'CHEST';

export type BgmStyle = 'SUSPENSE_GAME' | 'DRUMROLL' | 'CYBER' | 'OFF';

export type ThemeMode = 'dark' | 'light' | 'projector';

export type TtsEngineMode = 'ONLINE_STANDARD' | 'DEVICE_SYNTHESIS';

export interface SpinSettings {
  spinDuration: number; // in milliseconds, e.g. 4000
  soundEnabled: boolean;
  volume: number; // 0 to 1
  confettiEnabled: boolean;
  screenShake: boolean;
  showSuspenseCountdown: boolean;
  autoSaveHistory: boolean;
  defaultVisualType: SpinVisualType;
  ttsEnabled: boolean;
  ttsEngineMode?: TtsEngineMode;
  ttsRate: number;
  ttsPitch: number;
  ttsTemplate: string;
  ttsVoiceUri?: string;
  ttsAnnounceCount: boolean;
  defaultPickCount: number; // 1 to 5
  bgmStyle: BgmStyle;
  bgmVolume: number;
  themeMode?: ThemeMode;
}

export interface GeneratedGroup {
  id: string;
  name: string;
  leader?: Student;
  members: Student[];
  color?: string;
}

export interface ExcelPreviewRow {
  stt: number;
  name: string;
  studentCode?: string;
  gender?: 'nam' | 'nu' | 'khac';
  callCount?: number;
  notes?: string;
  scores?: {
    tx1?: number | null;
    tx2?: number | null;
    tx3?: number | null;
    tx4?: number | null;
    gk?: number | null;
    ck?: number | null;
  };
  isValid: boolean;
  warning?: string;
}

export interface ExcelParseResult {
  rows: ExcelPreviewRow[];
  totalParsed: number;
  warnings: string[];
  suggestedClassName?: string;
}

export interface ScoreCommentRule {
  id: string;
  minScore: number;
  maxScore: number;
  label: string;
  evaluation: string;
  comment: string;
  alternatives: string[];
  color: string;
}


