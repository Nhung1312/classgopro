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
  updatedAt?: string;
}

/**
 * Compute the effective subscription status based on current real-time clock:
 * If Trial has passed trialEndAt -> EXPIRED
 * If Pro has passed proEndAt -> EXPIRED
 * If Active and before proEndAt -> ACTIVE
 * If Trial and before trialEndAt -> TRIAL
 */
export function getEffectiveSubscription(sub?: UserSubscription): UserSubscription {
  const nowMs = Date.now();

  if (!sub) {
    // Default fallback if no subscription object exists yet
    const now = new Date();
    const trialEnd = new Date(nowMs + 15 * 24 * 60 * 60 * 1000);
    return {
      status: 'TRIAL',
      trialStartAt: now.toISOString(),
      trialEndAt: trialEnd.toISOString(),
    };
  }

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

  // Create initial 15-day trial on Firestore
  const now = new Date();
  const trialEnd = new Date(nowMs + 15 * 24 * 60 * 60 * 1000);
  const initialSubscription: UserSubscription = {
    status: 'TRIAL',
    trialStartAt: now.toISOString(),
    trialEndAt: trialEnd.toISOString(),
    updatedAt: now.toISOString(),
  };

  const userDocRef = doc(db, 'users', userId);
  await setDoc(
    userDocRef,
    {
      subscription: initialSubscription,
      updatedAt: now.toISOString(),
    },
    { merge: true }
  );

  return initialSubscription;
}

/**
 * Save user data to Firestore (merging changes).
 */
export async function saveUserDataToFirestore(
  userId: string,
  data: Partial<UserCloudData>
): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      {
        ...data,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error saving user data to Firestore:', error);
    throw error;
  }
}

