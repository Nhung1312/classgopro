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
    const raw = localStorage.getItem(STORAGE_KEYS.CARD_CONFIGS);
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
    localStorage.setItem(STORAGE_KEYS.CARD_CONFIGS, JSON.stringify(configs));
  } catch (e) {
    console.error('Failed to save card configs:', e);
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
  const usedCardIds = new Set<number>(currentMappings.map((m) => m.cardId));

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
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load quiz sessions:', e);
  }
  return [];
}

export function saveAllQuizSessions(sessions: QuizSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save quiz sessions:', e);
  }
}

export function loadActiveQuizSession(): QuizSession | null {
  const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_ID);
  if (!activeId) return null;
  const sessions = loadAllQuizSessions();
  return sessions.find((s) => s.id === activeId) || null;
}

export function saveActiveQuizSession(session: QuizSession): void {
  const sessions = loadAllQuizSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.unshift(session);
  }
  saveAllQuizSessions(sessions);
  localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION_ID, session.id);

  // 1. Broadcast locally to other tabs / windows on same machine
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'SESSION_UPDATED', session });
    } catch {
      // ignore
    }
  }

  // 2. Relay to server for cross-device Phone <-> Laptop live sync
  if (session.sessionPin) {
    fetch('/api/response-cards/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session, pin: session.sessionPin }),
    }).catch(() => {
      // Offline fallback: handled by local storage & broadcastChannel
    });
  }
}

export function deleteQuizSession(sessionId: string): void {
  const sessions = loadAllQuizSessions().filter((s) => s.id !== sessionId);
  saveAllQuizSessions(sessions);
  if (localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_ID) === sessionId) {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION_ID);
  }
}

export function createNewQuizSession(
  classRoom: ClassRoom,
  title: string,
  questions: QuizQuestionItem[],
  subject?: string
): QuizSession {
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
  const assignedSubject = (subject || classRoom.subject || 'Toán').trim();
  const cardConfig = getOrInitClassCardConfig(classRoom);

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
    cardMappings: cardConfig.mappings,
  };

  saveActiveQuizSession(newSession);
  return newSession;
}

/**
 * Fetches an active session by its 6-digit PIN from the server
 */
export async function fetchSessionByPin(pin: string): Promise<QuizSession | null> {
  try {
    const res = await fetch(`/api/response-cards/session/${pin.trim()}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.session) {
      saveActiveQuizSession(data.session);
      return data.session as QuizSession;
    }
  } catch (err) {
    console.warn('Failed to fetch session by PIN:', err);
  }
  return null;
}

// =========================================================================
// Real-time Sync Listeners (BroadcastChannel + SSE for Cross-Device)
// =========================================================================

export function subscribeToSessionSync(
  callback: (session: QuizSession) => void,
  sessionPin?: string
): () => void {
  // 1. Same-device local BroadcastChannel
  const channelHandler = (event: MessageEvent) => {
    if (event.data?.type === 'SESSION_UPDATED' && event.data?.session) {
      callback(event.data.session);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', channelHandler);
  }

  // 2. Cross-device Server-Sent Events (SSE) stream if sessionPin is provided
  let eventSource: EventSource | null = null;
  if (sessionPin && typeof window !== 'undefined' && 'EventSource' in window) {
    try {
      eventSource = new EventSource(`/api/response-cards/session/${sessionPin}/stream`);
      eventSource.onmessage = (event) => {
        try {
          const syncedSession = JSON.parse(event.data);
          if (syncedSession && syncedSession.id) {
            callback(syncedSession);
          }
        } catch {
          // ignore parse error
        }
      };
      eventSource.onerror = () => {
        // EventSource will auto-retry reconnecting in background
      };
    } catch {
      // ignore
    }
  }

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', channelHandler);
    }
    if (eventSource) {
      eventSource.close();
      eventSource = null;
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

    for (const res of session.results) {
      const ans = res.answers[student.id];
      if (ans) {
        totalAnswered++;
        if (ans.isCorrect) {
          correctCount++;
        }
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
