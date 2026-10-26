/**
 * Storage and Synchronization Service for Smart Response Cards
 */

import {
  ResponseCardClassConfig,
  ResponseCardMapping,
  QuizSession,
  QuizQuestionItem,
  CardOrientationAnswer,
  StudentAnswerRecord,
} from '../types/responseCardTypes';
import { ClassRoom, Student } from '../types';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  limit,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { sanitizeForFirestore } from '../utils/firestoreService';

export const RESPONSE_REMOTE_SYNC_AVAILABLE = true;
export const RESPONSE_REMOTE_SYNC_NOTICE = 'Đồng bộ hai thiết bị qua Firebase Firestore có xác thực an toàn. Điện thoại quét mã QR từ máy tính để kết nối và nhận diện thẻ theo thời gian thực.';
let ownerScope = 'local_teacher';
export function setResponseCardOwner(userId?: string) { ownerScope = userId?.trim() || 'local_teacher'; }
export function getResponseCardOwner(): string { return ownerScope; }
const scopedKey = (key: string) => ownerScope === 'local_teacher' ? key : `${key}_${ownerScope}`;

const STORAGE_KEYS = {
  CARD_CONFIGS: 'classgo_response_card_configs_v1',
  SESSIONS: 'classgo_response_card_sessions_v1',
  ACTIVE_SESSION_ID: 'classgo_response_active_session_id_v1',
};

// Cross-tab real-time channel
const SYNC_CHANNEL_NAME = 'classgo_response_session_sync';
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  }
} catch (e) {
  console.warn('BroadcastChannel not supported in this environment');
}

/**
 * Loads all card configurations for all classes
 */
export function loadAllCardConfigs(): Record<string, ResponseCardClassConfig> {
  try {
    const raw = localStorage.getItem(scopedKey(STORAGE_KEYS.CARD_CONFIGS));
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load card configs:', e);
  }
  return {};
}

/**
 * Saves all card configurations
 */
export function saveAllCardConfigs(configs: Record<string, ResponseCardClassConfig>): void {
  try {
    localStorage.setItem(scopedKey(STORAGE_KEYS.CARD_CONFIGS), JSON.stringify(configs));
  } catch (e) {
    console.error('Failed to save card configs:', e);
    throw new Error('Không lưu được bộ thẻ trên thiết bị. Hãy xuất bản sao và kiểm tra dung lượng trình duyệt.');
  }
}

/**
 * Gets or initializes stable card mappings for a given class.
 * - Each class has its own independent card set (numbered 001, 002, ...).
 * - Matches student by studentCode first, then studentId.
 * - Guarantees mappings remain stable regardless of student list sorting or subject changes!
 * - Supports customizable spare cards count (thẻ dự phòng).
 */
export function getOrInitClassCardConfig(
  targetClass: ClassRoom,
  requestedSpareCount?: number
): ResponseCardClassConfig {
  if (targetClass.students.length > 120) throw new Error('Mỗi bộ thẻ hỗ trợ tối đa 120 học sinh.');
  const codes = targetClass.students.map(s => s.studentCode?.trim()).filter(Boolean);
  if (new Set(codes).size !== codes.length) throw new Error('Mã học sinh bị trùng. Cần sửa mã trước khi gán thẻ.');
  const allConfigs = loadAllCardConfigs();
  const existingConfig = allConfigs[targetClass.id];

  const spareCardsCount =
    requestedSpareCount !== undefined
      ? requestedSpareCount
      : existingConfig?.spareCardsCount !== undefined
      ? existingConfig.spareCardsCount
      : 5;

  const currentMappings: ResponseCardMapping[] = existingConfig?.mappings
    ? existingConfig.mappings.filter((m) => !m.isSpare)
    : [];
  const usedCardIds = new Set<number>();

  let hasChanges = false;

  // 1. Check existing mappings: remove any deleted students
  const validStudentIds = new Set(targetClass.students.map((s) => s.id));
  const validStudentCodes = new Set(targetClass.students.map((s) => s.studentCode).filter(Boolean));

  const filteredMappings = currentMappings.filter(
    (m) => validStudentIds.has(m.studentId) || (m.studentCode && validStudentCodes.has(m.studentCode))
  );
  if (filteredMappings.length !== currentMappings.length) {
    hasChanges = true;
  }

  filteredMappings.forEach(m => usedCardIds.add(m.cardId));

  // 2. Assign or preserve cards for students
  for (const student of targetClass.students) {
    // Try to match existing by studentCode first, then by studentId
    const existing = filteredMappings.find(
      (m) => (student.studentCode && m.studentCode === student.studentCode) || m.studentId === student.id
    );

    if (existing) {
      // Keep existing cardId stable! Update id/name/code if student record was edited
      if (
        existing.studentId !== student.id ||
        existing.studentName !== student.name ||
        existing.studentCode !== student.studentCode
      ) {
        existing.studentId = student.id;
        existing.studentName = student.name;
        existing.studentCode = student.studentCode;
        hasChanges = true;
      }
    } else {
      // Assign new card: if studentCode has digits (e.g. "01", "HS05"), prioritize that number
      let assignedId: number | null = null;
      if (student.studentCode) {
        const digits = student.studentCode.replace(/\D/g, '');
        if (digits) {
          const num = parseInt(digits, 10);
          if (num >= 1 && num <= 120 && !usedCardIds.has(num)) {
            assignedId = num;
          }
        }
      }

      if (assignedId === null) {
        let nextAvailable = 1;
        while (usedCardIds.has(nextAvailable) && nextAvailable <= 120) {
          nextAvailable++;
        }
        assignedId = nextAvailable <= 120 ? nextAvailable : filteredMappings.length + 1;
      }

      usedCardIds.add(assignedId);
      filteredMappings.push({
        classId: targetClass.id,
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.name,
        cardId: assignedId,
        createdAt: new Date().toISOString(),
      });
      hasChanges = true;
    }
  }

  // Sort student mappings by cardId ascending for orderly presentation
  filteredMappings.sort((a, b) => a.cardId - b.cardId);

  // 3. Add spare cards if requested
  const allMappingsWithSpares = [...filteredMappings];
  if (spareCardsCount > 0) {
    const maxStudentCardId =
      filteredMappings.length > 0 ? Math.max(...filteredMappings.map((m) => m.cardId)) : 0;

    let spareCardNum = maxStudentCardId + 1;
    for (let i = 1; i <= spareCardsCount; i++) {
      while (usedCardIds.has(spareCardNum) && spareCardNum <= 120) {
        spareCardNum++;
      }
      if (spareCardNum <= 120) {
        usedCardIds.add(spareCardNum);
        allMappingsWithSpares.push({
          classId: targetClass.id,
          studentId: `spare-${targetClass.id}-${spareCardNum}`,
          studentName: `Thẻ Dự Phòng ${String(spareCardNum).padStart(3, '0')}`,
          cardId: spareCardNum,
          isSpare: true,
          createdAt: new Date().toISOString(),
        });
        spareCardNum++;
      }
    }
  }

  const updatedConfig: ResponseCardClassConfig = {
    classId: targetClass.id,
    mappings: allMappingsWithSpares,
    spareCardsCount,
    updatedAt: new Date().toISOString(),
  };

  if (hasChanges || !existingConfig || existingConfig.spareCardsCount !== spareCardsCount) {
    allConfigs[targetClass.id] = updatedConfig;
    saveAllCardConfigs(allConfigs);
  }

  return updatedConfig;
}

/**
 * Updates a specific student's card ID assignment in the class
 */
export function updateStudentCardId(
  classId: string,
  studentId: string,
  newCardId: number
): ResponseCardClassConfig | null {
  if (!Number.isInteger(newCardId) || newCardId < 1 || newCardId > 120) return null;
  const allConfigs = loadAllCardConfigs();
  const config = allConfigs[classId];
  if (!config) return null;

  // If another student already has this card ID, swap them
  const conflict = config.mappings.find((m) => m.cardId === newCardId && m.studentId !== studentId);
  const target = config.mappings.find((m) => m.studentId === studentId);

  if (target) {
    if (conflict) {
      conflict.cardId = target.cardId;
    }
    target.cardId = newCardId;
    config.updatedAt = new Date().toISOString();
    config.mappings.sort((a, b) => a.cardId - b.cardId);
    allConfigs[classId] = config;
    saveAllCardConfigs(allConfigs);
    return config;
  }
  return null;
}

// =========================================================================
// Quiz Sessions History & Storage
// =========================================================================

export function loadAllQuizSessions(): QuizSession[] {
  try {
    const raw = localStorage.getItem(scopedKey(STORAGE_KEYS.SESSIONS));
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load quiz sessions:', e);
  }
  return [];
}

export function saveAllQuizSessions(sessions: QuizSession[]): void {
  try {
    localStorage.setItem(scopedKey(STORAGE_KEYS.SESSIONS), JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save quiz sessions:', e);
    throw new Error('Không lưu được kết quả phiên kiểm tra trên thiết bị. Hãy kiểm tra dung lượng trình duyệt.');
  }
}

export function loadActiveQuizSession(): QuizSession | null {
  const activeId = localStorage.getItem(scopedKey(STORAGE_KEYS.ACTIVE_SESSION_ID));
  if (!activeId) return null;
  const sessions = loadAllQuizSessions();
  return sessions.find((s) => s.id === activeId) || null;
}

const isBrowser = typeof window !== 'undefined' && typeof (window as any).document !== 'undefined';

export function generateSecureSessionToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `sec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}

export function reconcileSessionFromCloud(data: any): QuizSession {
  if (!data) return data;
  const session = { ...data } as QuizSession & {
    answersByQuestion?: Record<string, Record<string, StudentAnswerRecord>>;
    questionStatuses?: Record<string, { status: 'collecting' | 'locked' | 'revealed'; endedAt?: number }>;
  };

  if (session.results && Array.isArray(session.results)) {
    session.results = session.results.map((res) => {
      const cloudAnswers = session.answersByQuestion?.[res.questionId] || {};
      const mergedAnswers = { ...(res.answers || {}), ...cloudAnswers };
      const qStatus = session.questionStatuses?.[res.questionId];
      return {
        ...res,
        answers: mergedAnswers,
        status: qStatus?.status || res.status,
        endedAt: qStatus?.endedAt !== undefined ? qStatus.endedAt : res.endedAt,
      };
    });
  }
  return session;
}

export function saveActiveQuizSessionLocally(session: QuizSession): void {
  const sessions = loadAllQuizSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.unshift(session);
  }
  saveAllQuizSessions(sessions);
  localStorage.setItem(scopedKey(STORAGE_KEYS.ACTIVE_SESSION_ID), session.id);
}

export function saveActiveQuizSession(
  session: QuizSession,
  options?: { skipCloudSync?: boolean }
): void {
  const sessions = loadAllQuizSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  // Received snapshots may pass through the parent callback again; stop broadcast echo loops.
  if (idx >= 0 && JSON.stringify(sessions[idx]) === JSON.stringify(session)) {
    localStorage.setItem(scopedKey(STORAGE_KEYS.ACTIVE_SESSION_ID), session.id);
    return;
  }
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.unshift(session);
  }
  saveAllQuizSessions(sessions);
  localStorage.setItem(scopedKey(STORAGE_KEYS.ACTIVE_SESSION_ID), session.id);

  // 1. Broadcast locally to other tabs / windows on same machine
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'SESSION_UPDATED', session, ownerScope });
    } catch {
      // ignore
    }
  }

  // 2. Cloud Firestore real-time sync when teacher is authenticated in browser
  if (!options?.skipCloudSync) {
    const targetTeacherId = session.teacherId || (ownerScope !== 'local_teacher' ? ownerScope : null);
    if (targetTeacherId && isBrowser && db) {
      saveSessionToFirestore(targetTeacherId, session).catch((err) => {
        console.warn('[ResponseCards] Cloud session sync pending/offline:', err?.message);
      });
    }
  }
}

/**
 * Saves full session structure to Firestore under the authenticated teacher's account
 */
export async function saveSessionToFirestore(teacherId: string, session: QuizSession): Promise<void> {
  if (!teacherId || teacherId === 'local_teacher' || !db || !isBrowser) return;
  const sessionRef = doc(db, 'users', teacherId, 'quiz_sessions', session.id);
  // Initial creation only. Full-document rewrites from local UI must NEVER overwrite
  // live per-question answers or the projector's control fields.
  const answersByQuestion: Record<string, Record<string, StudentAnswerRecord>> = {};
  const questionStatuses: Record<string, { status: string; endedAt?: number }> = {};
  session.results?.forEach((r) => {
    answersByQuestion[r.questionId] = r.answers || {};
    questionStatuses[r.questionId] = { status: r.status, endedAt: r.endedAt };
  });
  try {
    await runTransaction(db, async (transaction) => {
      const existing = await transaction.get(sessionRef);
      if (existing.exists()) return;
      transaction.set(sessionRef, sanitizeForFirestore({
        ...session, teacherId, answersByQuestion, questionStatuses,
        updatedAt: new Date().toISOString(),
      }));
    });
  } catch (error) {
    console.warn('[ResponseCards] Could not create session on Firestore:', error);
    throw error;
  }
}

export interface QueuedOfflineAnswer {
  sessionId: string;
  questionId: string;
  studentId: string;
  record: StudentAnswerRecord;
  queuedAt: number;
  status: 'pending' | 'rejected_locked' | 'error';
  errorMessage?: string;
}

export function loadOfflineAnswerQueue(sessionId: string): QueuedOfflineAnswer[] {
  if (typeof localStorage === 'undefined' || !sessionId) return [];
  try {
    const raw = localStorage.getItem(scopedKey(`classgo_response_offline_queue_${sessionId}`));
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('[ResponseCards] Failed to load offline queue:', e);
  }
  return [];
}

export function saveOfflineAnswerQueue(sessionId: string, queue: QueuedOfflineAnswer[]): void {
  if (typeof localStorage === 'undefined' || !sessionId) return;
  try {
    if (queue.length === 0) {
      localStorage.removeItem(scopedKey(`classgo_response_offline_queue_${sessionId}`));
    } else {
      localStorage.setItem(scopedKey(`classgo_response_offline_queue_${sessionId}`), JSON.stringify(queue));
    }
  } catch (e) {
    console.error('[ResponseCards] Failed to save offline queue:', e);
  }
}

export function enqueueOfflineAnswer(
  sessionId: string,
  item: { questionId: string; studentId: string; record: StudentAnswerRecord }
): QueuedOfflineAnswer[] {
  const current = loadOfflineAnswerQueue(sessionId);
  const existingIdx = current.findIndex(
    (q) => q.questionId === item.questionId && q.studentId === item.studentId
  );
  const queuedItem: QueuedOfflineAnswer = {
    sessionId,
    questionId: item.questionId,
    studentId: item.studentId,
    record: item.record,
    queuedAt: Date.now(),
    status: 'pending',
  };
  if (existingIdx >= 0) {
    current[existingIdx] = queuedItem;
  } else {
    current.push(queuedItem);
  }
  saveOfflineAnswerQueue(sessionId, current);
  return current;
}

export function removeConfirmedOfflineAnswers(
  sessionId: string,
  confirmed: Array<{ questionId: string; studentId: string }>
): QueuedOfflineAnswer[] {
  const current = loadOfflineAnswerQueue(sessionId);
  const confirmedSet = new Set(confirmed.map((c) => `${c.questionId}_${c.studentId}`));
  const remaining = current.filter((item) => !confirmedSet.has(`${item.questionId}_${item.studentId}`));
  saveOfflineAnswerQueue(sessionId, remaining);
  return remaining;
}

export interface CloudAnswerWriteResult {
  success: boolean;
  rejectedLocked?: boolean;
  errorMessage?: string;
}

/**
 * Mobile scanner updates only a single student's answer with server-side lock validation
 */
export async function recordStudentAnswerToCloud(
  teacherId: string,
  sessionId: string,
  questionId: string,
  studentId: string,
  answerRecord: StudentAnswerRecord
): Promise<CloudAnswerWriteResult> {
  return batchRecordStudentAnswersToCloud(teacherId, sessionId, questionId, {
    [studentId]: answerRecord,
  });
}

/**
 * Mobile scanner updates multiple answers in one camera frame safely with server-side lock checking
 */
export async function batchRecordStudentAnswersToCloud(
  teacherId: string,
  sessionId: string,
  questionId: string,
  answers: Record<string, StudentAnswerRecord>
): Promise<CloudAnswerWriteResult> {
  if (!teacherId || teacherId === 'local_teacher' || !db || !isBrowser) {
    return {
      success: false,
      errorMessage: 'Chưa đăng nhập tài khoản Giáo viên hoặc đang ngoại tuyến.',
    };
  }
  if (Object.keys(answers).length === 0) return { success: true };

  const sessionRef = doc(db, 'users', teacherId, 'quiz_sessions', sessionId);

  // Firestore transactions give a fresh server read and retry if projector changes
  // the question/lock state concurrently. A getDoc followed by setDoc is NOT atomic.
  try {
    return await runTransaction(db, async (transaction): Promise<CloudAnswerWriteResult> => {
      const snap = await transaction.get(sessionRef);
      if (!snap.exists()) {
        return { success: false, errorMessage: 'Phiên kiểm tra không tồn tại trên máy chủ.' };
      }
      const data = snap.data();
      if (data.status !== 'running') {
        return { success: false, rejectedLocked: true, errorMessage: 'Phiên kiểm tra không còn nhận đáp án.' };
      }
      const questionIndex = Array.isArray(data.questions)
        ? data.questions.findIndex((q: { id?: string }) => q.id === questionId)
        : -1;
      if (questionIndex < 0 || data.currentQuestionIndex !== questionIndex) {
        return { success: false, rejectedLocked: true, errorMessage: 'Giáo viên đã chuyển câu hoặc câu hỏi không hợp lệ.' };
      }
      const status = data.questionStatuses?.[questionId]?.status ||
        data.results?.find((r: { questionId?: string }) => r.questionId === questionId)?.status;
      if (status !== 'collecting') {
        return { success: false, rejectedLocked: true, errorMessage: 'Câu hỏi đã bị khóa hoặc không còn nhận bài.' };
      }
      // This map merge changes only the supplied students, not other answers.
      transaction.set(sessionRef, sanitizeForFirestore({
        answersByQuestion: { [questionId]: answers },
        updatedAt: new Date().toISOString(),
      }), { merge: true });
      return { success: true };
    }, { maxAttempts: 5 });
  } catch (error: any) {
    return { success: false, errorMessage: error?.message || 'Lỗi mạng hoặc ghi Firestore thất bại.' };
  }
}

/**
 * Computer projector updates question navigation, lock/reveal, or session completion without touching answers
 */
export async function updateSessionControlToCloud(
  teacherId: string,
  sessionId: string,
  control: {
    currentQuestionIndex?: number;
    status?: 'draft' | 'running' | 'completed';
    questionStatus?: { questionId: string; status: 'collecting' | 'locked' | 'revealed'; endedAt?: number };
  }
): Promise<void> {
  if (!teacherId || teacherId === 'local_teacher' || !db || !isBrowser) return;
  try {
    const sessionRef = doc(db, 'users', teacherId, 'quiz_sessions', sessionId);
    const updatePayload: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };
    if (control.currentQuestionIndex !== undefined) {
      updatePayload.currentQuestionIndex = control.currentQuestionIndex;
    }
    if (control.status !== undefined) {
      updatePayload.status = control.status;
    }
    if (control.questionStatus) {
      updatePayload.questionStatuses = {
        [control.questionStatus.questionId]: {
          status: control.questionStatus.status,
          endedAt: control.questionStatus.endedAt || Date.now(),
        },
      };
    }
    await setDoc(sessionRef, sanitizeForFirestore(updatePayload), { merge: true });
  } catch (e: any) {
    console.warn('[ResponseCards] updateSessionControlToCloud warning:', e?.message || e);
  }
}

/**
 * Fetches a session securely from Firestore by teacher ID and session ID, verifying token/PIN
 */
export async function fetchSessionFromCloud(
  teacherId: string,
  sessionId: string,
  token?: string,
  pin?: string
): Promise<QuizSession | null> {
  if (!teacherId || !sessionId || !db || !isBrowser) return null;
  try {
    const sessionRef = doc(db, 'users', teacherId, 'quiz_sessions', sessionId);
    const snap = await getDoc(sessionRef);
    if (!snap.exists()) return null;
    const rawData = snap.data();
    const session = reconcileSessionFromCloud(rawData);

    if (token && session.sessionToken && session.sessionToken !== token) {
      console.warn('[ResponseCards] Security mismatch: session token verification failed');
      return null;
    }
    if (pin && session.sessionPin && session.sessionPin !== pin) {
      console.warn('[ResponseCards] Security mismatch: session PIN verification failed');
      return null;
    }
    return session;
  } catch (e) {
    console.error('[ResponseCards] fetchSessionFromCloud error');
    return null;
  }
}

export function deleteQuizSession(sessionId: string): void {
  const sessions = loadAllQuizSessions().filter((s) => s.id !== sessionId);
  saveAllQuizSessions(sessions);
  if (localStorage.getItem(scopedKey(STORAGE_KEYS.ACTIVE_SESSION_ID)) === sessionId) {
    localStorage.removeItem(scopedKey(STORAGE_KEYS.ACTIVE_SESSION_ID));
  }
}

export function createNewQuizSession(
  classRoom: ClassRoom,
  title: string,
  questions: QuizQuestionItem[],
  subject?: string,
  teacherId?: string
): QuizSession {
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
  const secureToken = generateSecureSessionToken();
  const assignedSubject = (subject || classRoom.subject || 'Toán').trim();
  const cardConfig = getOrInitClassCardConfig(classRoom);
  const effectiveTeacherId = teacherId || (ownerScope !== 'local_teacher' ? ownerScope : undefined);

  const newSession: QuizSession = {
    id: sessionId,
    classId: classRoom.id,
    className: classRoom.name,
    subject: assignedSubject,
    title: title.trim() || `Kiểm tra ${assignedSubject} - Lớp ${classRoom.name}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions,
    currentQuestionIndex: 0,
    results: questions.map((q) => ({
      questionId: q.id,
      question: q,
      answers: {},
      status: 'collecting',
      startedAt: Date.now(),
    })),
    status: 'running',
    sessionPin: randomPin,
    sessionToken: secureToken,
    teacherId: effectiveTeacherId,
    cardMappings: cardConfig.mappings,
  };

  saveActiveQuizSession(newSession);
  return newSession;
}

/**
 * Fetches an active session by its 6-digit PIN:
 * - Checks local storage first
 * - Then queries Firestore under the authenticated teacher's account for status == 'running'
 * - Enforces teacher account ownership (PIN is not the sole factor)
 */
export async function fetchSessionByPin(pin: string, teacherId?: string): Promise<QuizSession | null> {
  const cleanPin = pin.trim();
  if (cleanPin.length < 6) return null;

  // 1. Check local sessions first
  const sessions = loadAllQuizSessions();
  const matchedLocal = sessions.find((s) => s.sessionPin === cleanPin && s.status !== 'completed');
  if (matchedLocal) return matchedLocal;

  // 2. If active session matches PIN, return it
  const active = loadActiveQuizSession();
  if (active && active.sessionPin === cleanPin && active.status !== 'completed') {
    return active;
  }

  // 3. Search on Firestore under the authenticated teacher's account:
  const targetTeacher = teacherId || (ownerScope !== 'local_teacher' ? ownerScope : null);
  if (targetTeacher && isBrowser && db) {
    try {
      const sessionsCol = collection(db, 'users', targetTeacher, 'quiz_sessions');
      const q = query(
        sessionsCol,
        where('sessionPin', '==', cleanPin),
        where('status', '==', 'running'),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const cloudSession = reconcileSessionFromCloud(docSnap.data());
        return cloudSession;
      }
    } catch (e: any) {
      console.warn('[ResponseCards] fetchSessionByPin query warning:', e?.message || e);
    }
  }

  return null;
}

// =========================================================================
// Real-time Sync Listeners (BroadcastChannel for same machine + Firestore for Cloud)
// =========================================================================

export interface SyncUpdateMeta {
  fromCloudSync?: boolean;
}

export function subscribeToSessionSync(
  callback: (session: QuizSession, meta?: SyncUpdateMeta) => void,
  sessionPin?: string,
  sessionId?: string,
  teacherId?: string,
  onConnectionChange?: (isOnline: boolean) => void
): () => void {
  // 1. Same-device local BroadcastChannel
  const channelHandler = (event: MessageEvent) => {
    if (event.data?.type === 'SESSION_UPDATED' && event.data?.session && event.data.ownerScope === ownerScope) {
      callback(event.data.session, { fromCloudSync: false });
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', channelHandler);
  }

  // 2. Real-time Firestore cross-device listener (Phone <-> Projector)
  let unsubFirestore: (() => void) | null = null;
  const targetTeacher = teacherId || (ownerScope !== 'local_teacher' ? ownerScope : null);
  const targetSessionId = sessionId;

  if (targetTeacher && targetSessionId && db && isBrowser) {
    try {
      const sessionRef = doc(db, 'users', targetTeacher, 'quiz_sessions', targetSessionId);
      unsubFirestore = onSnapshot(
        sessionRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const raw = snapshot.data();
            const cloudSession = reconcileSessionFromCloud(raw);
            // Save locally without triggering cloud write back!
            saveActiveQuizSessionLocally(cloudSession);
            onConnectionChange?.(!snapshot.metadata.fromCache);
            callback(cloudSession, { fromCloudSync: true });
          }
        },
        (error) => {
          console.warn('[ResponseCards] Firestore listener warning:', error?.message);
          onConnectionChange?.(false);
        }
      );
    } catch (err) {
      console.warn('[ResponseCards] Unable to setup Firestore session listener:', err);
    }
  }

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', channelHandler);
    }
    if (unsubFirestore) {
      unsubFirestore();
    }
  };
}

// =========================================================================
// Gradebook Score Calculation & Transfer Preview
// =========================================================================

export interface StudentScoreTransferPreview {
  studentId: string;
  studentName: string;
  studentCode?: string;
  cardId?: number;
  correctCount: number;
  totalAnswered: number;
  totalQuestions: number;
  calculatedScore: number; // Thang 10 (1 chữ số thập phân)
  existingScore?: number | null;
  hasConflict: boolean;
  selectedForTransfer: boolean;
}

export function calculateSessionScorePreview(
  session: QuizSession,
  classRoom: ClassRoom,
  targetTxSlot: 'tx1' | 'tx2' | 'tx3' | 'tx4'
): StudentScoreTransferPreview[] {
  const cardConfig = getOrInitClassCardConfig(classRoom);
  const totalQuestions = session.questions.length;
  if (totalQuestions === 0) return [];

  return classRoom.students.map((student) => {
    const mapping = cardConfig.mappings.find((m) => m.studentId === student.id);
    let correctCount = 0;
    let totalAnswered = 0;

    for (const question of session.questions) {
      const res = session.results.find(r => r.questionId === question.id);
      const ans = res?.answers?.[student.id];
      if (ans && ['A', 'B', 'C', 'D'].includes(ans.selectedOption)) {
        totalAnswered++;
        if (ans.selectedOption === question.correctAnswer) correctCount++;
      }
    }

    // Convert to 10-point scale: (correct / total) * 10
    const calculatedScore =
      totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 10 * 10) / 10
        : 0;

    const currentScore = student.scores ? student.scores[targetTxSlot] : undefined;
    const hasConflict = currentScore !== undefined && currentScore !== null;

    return {
      studentId: student.id,
      studentName: student.name,
      studentCode: student.studentCode,
      cardId: mapping?.cardId,
      correctCount,
      totalAnswered,
      totalQuestions,
      calculatedScore,
      existingScore: currentScore,
      hasConflict,
      selectedForTransfer: totalAnswered > 0, // default select students who took part
    };
  });
}
