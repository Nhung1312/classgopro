import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  ClassRoom,
  HistoryRecord,
  SelectionMode,
  SpinSettings,
  TimetableSlot,
  TeachingPlanItem,
  UserSubscription,
  DisciplineRecord,
  DisciplineViolationType,
} from '../types';
import { ENABLE_TRIAL_LIMIT, TRIAL_DURATION_DAYS } from '../config/subscriptionConfig';

export interface UserCloudData {
  classes?: ClassRoom[];
  history?: HistoryRecord[];
  activeClassId?: string;
  selectionMode?: SelectionMode;
  settings?: SpinSettings;
  timetableSlots?: TimetableSlot[];
  teachingPlan?: TeachingPlanItem[];
  disciplineRecords?: DisciplineRecord[];
  disciplineViolationTypes?: DisciplineViolationType[];
  subscription?: UserSubscription;
  dataUpdatedAt?: string;
  updatedAt?: string;
}

/**
 * Compute the effective subscription status based on current real-time clock:
 * - If ENABLE_TRIAL_LIMIT = false: All users have free unlimited access, expired status is bypassed.
 * - If ENABLE_TRIAL_LIMIT = true:
 *     If Trial has passed trialEndAt -> EXPIRED
 *     If Pro has passed proEndAt -> EXPIRED
 *     If Active and before proEndAt -> ACTIVE
 *     If Trial and before trialEndAt -> TRIAL
 */
export function getEffectiveSubscription(sub?: UserSubscription): UserSubscription {
  const nowMs = Date.now();

  if (!sub) {
    // Default fallback if no subscription object exists yet
    const now = new Date();
    const trialEnd = new Date(nowMs + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
    return {
      status: 'TRIAL',
      trialStartAt: now.toISOString(),
      trialEndAt: trialEnd.toISOString(),
    };
  }

  // =========================================================================
  // 🛡️ KHI TẠM TẮT GIỚI HẠN TRIAL (ENABLE_TRIAL_LIMIT = false):
  // Người dùng đăng nhập được dùng ClassGo MIỄN PHÍ HOÀN TOÀN, không giới hạn thời gian.
  // Nếu tài khoản cũ trong Firestore từng bị lưu là EXPIRED hoặc trialEndAt đã qua,
  // hệ thống KHÔNG khóa mà mở toàn quyền truy cập bình thường.
  // =========================================================================
  if (!ENABLE_TRIAL_LIMIT) {
    if (sub.status === 'EXPIRED') {
      return {
        ...sub,
        status: 'TRIAL',
      };
    }
    return sub;
  }

  // =========================================================================
  // ⏳ KHI BẬT LẠI GIỚI HẠN TRIAL (ENABLE_TRIAL_LIMIT = true):
  // Giữ nguyên vẹn 100% cơ chế kiểm tra ngày bắt đầu, ngày hết hạn và expired:
  // =========================================================================
  // Check Pro status
  if (sub.status === 'ACTIVE') {
    if (sub.proEndAt) {
      const proEndMs = new Date(sub.proEndAt).getTime();
      if (!isNaN(proEndMs) && proEndMs < nowMs) {
        return {
          ...sub,
          status: 'EXPIRED',
        };
      }
    }
    return sub;
  }

  // Check Trial status
  if (sub.status === 'TRIAL') {
    if (sub.trialEndAt) {
      const trialEndMs = new Date(sub.trialEndAt).getTime();
      if (!isNaN(trialEndMs) && trialEndMs < nowMs) {
        return {
          ...sub,
          status: 'EXPIRED',
        };
      }
    }
    return sub;
  }

  return sub;
}

/**
 * Fetch all ClassGo data for a specific user from Firestore.
 */
export async function fetchUserDataFromFirestore(userId: string): Promise<UserCloudData | null> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as UserCloudData;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user data from Firestore:', error);
    throw error;
  }
}

/**
 * Listen to user document in real-time (especially for subscription status updates)
 */
export function subscribeToUserData(
  userId: string,
  onData: (data: UserCloudData | null) => void,
  onError?: (err: any) => void
): () => void {
  const userDocRef = doc(db, 'users', userId);
  return onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as UserCloudData);
      } else {
        onData(null);
      }
    },
    (err) => {
      console.error(`Error listening to user data ${userId}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Recursively sanitizes any payload for Firestore by stripping all undefined keys
 * to strictly avoid: "Unsupported field value: undefined".
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return null as any;
  return JSON.parse(JSON.stringify(data));
}

/**
 * Initialize or ensure trial subscription exists on Firestore for user
 */
export async function ensureUserSubscription(
  userId: string,
  currentCloudData?: UserCloudData | null
): Promise<UserSubscription> {
  const nowMs = Date.now();
  if (currentCloudData?.subscription) {
    return getEffectiveSubscription(currentCloudData.subscription);
  }

  // Create initial trial on Firestore (TRIAL_DURATION_DAYS)
  const now = new Date();
  const trialEnd = new Date(nowMs + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
  const initialSubscription: UserSubscription = {
    status: 'TRIAL',
    trialStartAt: now.toISOString(),
    trialEndAt: trialEnd.toISOString(),
    updatedAt: now.toISOString(),
  };

  const userDocRef = doc(db, 'users', userId);
  // Note: Only write subscription, do NOT touch root dataUpdatedAt so we never masquerade as class edits!
  await setDoc(
    userDocRef,
    sanitizeForFirestore({
      subscription: initialSubscription,
    }),
    { merge: true }
  );

  return initialSubscription;
}

/**
 * Save user data to Firestore (merging changes).
 * Automatically sanitizes payloads to strip undefined values and records dataUpdatedAt.
 */
export async function saveUserDataToFirestore(
  userId: string,
  data: Partial<UserCloudData>
): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const nowIso = new Date().toISOString();
    const payload = sanitizeForFirestore({
      ...data,
      dataUpdatedAt: nowIso,
      updatedAt: nowIso,
    });
    await setDoc(userDocRef, payload, { merge: true });
    console.log('[Firestore] Successfully saved cloud data for user:', userId);
  } catch (error) {
    console.error('Error saving user data to Firestore:', error);
    throw error;
  }
}

