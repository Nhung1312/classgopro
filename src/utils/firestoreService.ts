import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  ClassRoom,
  HistoryRecord,
  SelectionMode,
  SpinSettings,
  TimetableSlot,
  TeachingPlanItem,
} from '../types';

export interface UserCloudData {
  classes?: ClassRoom[];
  history?: HistoryRecord[];
  activeClassId?: string;
  selectionMode?: SelectionMode;
  settings?: SpinSettings;
  timetableSlots?: TimetableSlot[];
  teachingPlan?: TeachingPlanItem[];
  updatedAt?: string;
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
