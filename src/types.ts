export interface Student {
  id: string;
  name: string;
  callCount: number;
  gender?: 'nam' | 'nu' | 'khac';
  studentCode?: string;
  parentPhone?: string; // SĐT phụ huynh (luồng thông tin học sinh)
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
  grade?: string;
  semester?: string;
  chapter?: string;
  lesson?: string;
  reviewLevel?: ReviewQuestionLevel;
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
  date?: string; // e.g. "15/09/2025"
  dayOfWeek?: 2 | 3 | 4 | 5 | 6 | 7; // Thứ 2 - Thứ 7
  period?: number; // Tiết 1 - 10
  session?: 'Sáng' | 'Chiều';
  subject?: string;
  room?: string;
  isCompleted?: boolean;
  notes?: string;
  isOffDay?: boolean; // Đánh dấu nếu là tiết nghỉ được ghi nhận
  offReason?: string; // Lý do nghỉ (nếu có)
  isMakeup?: boolean; // Đánh dấu nếu là tiết dạy bù
  makeupReason?: string; // Lý do dạy bù (bù cho tiết nào, ngày nào)
  makeupOriginalDate?: string; // Ngày của tiết bị nghỉ cần bù (nếu có)
}

export interface PpctItem {
  id: string;
  periodNumber: number; // 1, 2, 3...
  lessonTitle: string; // Tên bài dạy
  grade?: string; // '6', '7', '8', '9', '10', '11', '12'
  classId?: string; // Nếu gán riêng cho lớp cụ thể
  subject?: string; // 'Toán học'
  semester?: '1' | '2' | 'ALL';
  notes?: string;
}

export interface DayOffItem {
  id: string;
  date: string; // YYYY-MM-DD
  reason: string; // Tên ngày nghỉ: "Nghỉ lễ 2/9", "Nghỉ Tết", "Nghỉ bão"...
  allDay: boolean; // true = nghỉ cả ngày
  periods?: number[]; // [1, 2...] nếu chỉ nghỉ một số tiết cụ thể
  classId?: string; // 'ALL' hoặc classId cụ thể
}

export interface ScheduleGenerationConfig {
  startDate: string; // YYYY-MM-DD (Thứ Hai tuần 1)
  totalWeeks: number; // 18 hoặc 35
  semester: '1' | '2';
  preserveCompleted: boolean; // Bảo toàn các tiết đã đánh dấu hoàn thành
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
  recordType?: 'SPIN' | 'MYSTERY_DOOR' | 'RESPONSE_CARDS';
  starsAwarded?: number;
  assignedTxSlot?: 'tx1' | 'tx2' | 'tx3' | 'tx4' | null;
}

export type AppTab = 'SPIN' | 'TIMETABLE' | 'GRADEBOOK' | 'DISCIPLINE' | 'CLASSES' | 'IMPORT' | 'STATS' | 'HISTORY' | 'SETTINGS' | 'REVIEW_BANK' | 'RESPONSE_CARDS';

export type ReviewQuestionLevel = 'basic' | 'advanced';

export type ReviewQuestionSource = 'builtin' | 'manual' | 'import' | 'ai' | 'community';

export interface ReviewQuestion {
  id: string;
  bankId: string;

  question: string;
  answer: string;

  level: ReviewQuestionLevel;
  source: ReviewQuestionSource;

  createdAt?: string;
  updatedAt?: string;
}

export interface ReviewQuestionBank {
  inlineQuestions?: ReviewQuestion[];
  id: string;

  ownerId?: string;

  subject: string;
  grade: string;
  semester?: string;

  sectionId?: string;
  sectionName?: string;

  lessonId: string;
  lessonName: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface ReviewSessionState {
  lessonId: string;
  bankId: string;
  usedQuestionIds: string[];
}

export interface ClassGoJsonQuestionBankImport {
  version: number;
  type: 'classgo_review_question_bank';
  subject: string;
  grade: string;
  semester?: string;
  sectionName?: string;
  lessonId: string;
  lessonName: string;
  questions: Array<{
    id: string;
    level: ReviewQuestionLevel;
    question: string;
    answer: string;
  }>;
}

export type SelectionMode = 'FAIR' | 'PURE';

export type NameDisplayStyle = 'FULL_NAME' | 'STT_NAME' | 'ONLY_STT' | 'FIRST_NAME_ONLY' | 'CODE_NAME';

export type CallTargetFilter = 'ALL' | 'FEMALE_ONLY' | 'MALE_ONLY' | 'NO_SCORE_TX1' | 'STT_RANGE';

export type WheelSizeOption = 'STANDARD' | 'LARGE' | 'XLARGE';

export type SpinVisualType = 'SLOT' | 'WHEEL' | 'CARDS' | 'CHEST' | 'BALLOON' | 'HORSE_RACE' | 'BOAT_RACE' | 'DUCK_RACE' | 'ROCKET' | 'MAGIC_CARD' | 'PYRAMID';

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
  nameDisplayStyle?: NameDisplayStyle;
  wheelSizeOption?: WheelSizeOption;
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

export interface ParsedClassData {
  id: string;
  sheetName?: string;
  className: string;
  subject?: string;
  rows: ExcelPreviewRow[];
  warnings: string[];
  selected?: boolean;
}

export interface ExcelParseResult {
  rows: ExcelPreviewRow[];
  totalParsed: number;
  warnings: string[];
  suggestedClassName?: string;
  suggestedSubject?: string;
  classes?: ParsedClassData[];
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

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED';

export interface UserSubscription {
  status: SubscriptionStatus;
  trialStartAt: string; // ISO date string
  trialEndAt: string;   // ISO date string (trialStartAt + 15 days)
  proStartAt?: string;  // ISO date string
  proEndAt?: string;    // ISO date string (proStartAt + 365 days or extended)
  updatedAt?: string;   // ISO date string
  lastOrderId?: string;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';

export interface PaymentOrder {
  orderId: string;
  userId: string;
  userEmail: string;
  amount: number; // 169000
  currency: 'VND';
  status: OrderStatus;
  createdAt: string; // ISO date string
  paidAt?: string;   // ISO date string
  transactionId?: string;
  paymentMethod: 'VIETQR_BANK_TRANSFER';
  subscriptionDays: number; // 365
  note?: string;
}

export interface BankAccountInfo {
  bankName: string;
  bankCode: string; // for VietQR (e.g. 'MB' or '970422')
  accountNumber: string;
  accountHolder: string;
  proPrice: number; // 169000
  proDurationDays: number; // 365
  trialDays: number; // 15
}

export interface DisciplineViolationType {
  id: string;
  name: string;
  icon: string;
  isDefault?: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface DisciplineRecord {
  id: string;
  studentId: string;
  classId: string;
  violationTypeId: string;
  violationName?: string;
  violationIcon?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  source: 'manual' | 'random_picker';
  lesson?: string;
  note?: string;
  createdAt: string; // ISO string
}
