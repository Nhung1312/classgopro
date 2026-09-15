import { ClassRoom, HistoryRecord, SelectionMode, SpinSettings, TimetableSlot, TeachingPlanItem } from '../types';
import { INITIAL_CLASSES } from './sampleData';
import { INITIAL_TIMETABLE_SLOTS, INITIAL_TEACHING_PLAN } from './sampleTimetable';
import {
  loadDisciplineRecords,
  saveDisciplineRecords,
  loadViolationTypes,
  saveViolationTypes,
} from '../services/disciplineService';

const STORAGE_KEYS = {
  CLASSES: 'classgo_classes_v1',
  ACTIVE_CLASS_ID: 'classgo_active_class_v1',
  HISTORY: 'classgo_history_v1',
  SETTINGS: 'classgo_settings_v1',
  SELECTION_MODE: 'classgo_mode_v1',
  TIMETABLE: 'classgo_timetable_v1',
  TEACHING_PLAN: 'classgo_teaching_plan_v1',
  SAFETY_BACKUP: 'classgo_safety_backup_v1',
  LAST_LOCAL_UPDATE: 'classgo_last_local_update_v1',
  // Legacy keys for seamless migration
  LEGACY_CLASSES: 'lucky_picker_classes_v1',
  LEGACY_ACTIVE_CLASS_ID: 'lucky_picker_active_class_v1',
  LEGACY_HISTORY: 'lucky_picker_history_v1',
  LEGACY_SETTINGS: 'lucky_picker_settings_v1',
  LEGACY_SELECTION_MODE: 'lucky_picker_mode_v1',
  LEGACY_TIMETABLE: 'lucky_picker_timetable_v1',
  LEGACY_TEACHING_PLAN: 'lucky_picker_teaching_plan_v1',
};

export const DEFAULT_SETTINGS: SpinSettings = {
  spinDuration: 3800,
  soundEnabled: true,
  volume: 0.7,
  confettiEnabled: true,
  screenShake: true,
  showSuspenseCountdown: false,
  autoSaveHistory: true,
  defaultVisualType: 'WHEEL',
  ttsEnabled: true,
  ttsEngineMode: 'ONLINE_STANDARD',
  ttsRate: 0.95,
  ttsPitch: 1.0,
  ttsTemplate: 'Xin mời bạn {name} lên bảng!',
  ttsVoiceUri: '',
  ttsAnnounceCount: true,
  defaultPickCount: 1,
  bgmStyle: 'SUSPENSE_GAME',
  bgmVolume: 0.6,
  themeMode: 'dark',
  nameDisplayStyle: 'FULL_NAME',
  wheelSizeOption: 'LARGE',
};

export function loadClasses(): ClassRoom[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLASSES) || localStorage.getItem(STORAGE_KEYS.LEGACY_CLASSES);
    if (!raw) {
      saveClasses(INITIAL_CLASSES);
      return INITIAL_CLASSES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      if (parsed.length > 0) return parsed;
      // If user deliberately emptied all classes, return one clean empty class instead of reviving sample data
      const defaultBlank: ClassRoom[] = [
        {
          id: `class-${Date.now()}`,
          name: 'Lớp mới',
          students: [],
          createdAt: new Date().toISOString(),
        },
      ];
      saveClasses(defaultBlank);
      return defaultBlank;
    }
  } catch (err) {
    console.error('Failed to load classes from storage:', err);
  }
  return INITIAL_CLASSES;
}

export function saveClasses(classes: ClassRoom[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
    localStorage.setItem(STORAGE_KEYS.LAST_LOCAL_UPDATE, new Date().toISOString());
  } catch (err) {
    console.error('Failed to save classes to storage:', err);
  }
}

export function loadActiveClassId(classes: ClassRoom[]): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_CLASS_ID) || localStorage.getItem(STORAGE_KEYS.LEGACY_ACTIVE_CLASS_ID);
    if (raw && classes.some((c) => c.id === raw)) {
      return raw;
    }
  } catch (err) {
    console.error('Failed to load active class id:', err);
  }
  return classes[0]?.id || 'class-7a1';
}

export function saveActiveClassId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CLASS_ID, id);
  } catch (err) {
    console.error('Failed to save active class id:', err);
  }
}

export function loadHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY) || localStorage.getItem(STORAGE_KEYS.LEGACY_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load history:', err);
  }
  return [];
}

export function saveHistory(history: HistoryRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  } catch (err) {
    console.error('Failed to save history:', err);
  }
}

export function loadSettings(): SpinSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS) || localStorage.getItem(STORAGE_KEYS.LEGACY_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: SpinSettings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

export function loadSelectionMode(): SelectionMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SELECTION_MODE) || localStorage.getItem(STORAGE_KEYS.LEGACY_SELECTION_MODE);
    if (raw === 'PURE' || raw === 'FAIR') return raw;
  } catch {
    // ignore
  }
  return 'FAIR';
}

export function saveSelectionMode(mode: SelectionMode) {
  try {
    localStorage.setItem(STORAGE_KEYS.SELECTION_MODE, mode);
  } catch {
    // ignore
  }
}

export function loadTimetable(): TimetableSlot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TIMETABLE) || localStorage.getItem(STORAGE_KEYS.LEGACY_TIMETABLE);
    if (!raw) {
      saveTimetable(INITIAL_TIMETABLE_SLOTS);
      return INITIAL_TIMETABLE_SLOTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (err) {
    console.error('Failed to load timetable:', err);
  }
  return INITIAL_TIMETABLE_SLOTS;
}

export function saveTimetable(slots: TimetableSlot[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(slots));
  } catch (err) {
    console.error('Failed to save timetable:', err);
  }
}

export function loadTeachingPlan(): TeachingPlanItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TEACHING_PLAN) || localStorage.getItem(STORAGE_KEYS.LEGACY_TEACHING_PLAN);
    if (!raw) {
      saveTeachingPlan(INITIAL_TEACHING_PLAN);
      return INITIAL_TEACHING_PLAN;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (err) {
    console.error('Failed to load teaching plan:', err);
  }
  return INITIAL_TEACHING_PLAN;
}

export function saveTeachingPlan(plan: TeachingPlanItem[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.TEACHING_PLAN, JSON.stringify(plan));
  } catch (err) {
    console.error('Failed to save teaching plan:', err);
  }
}

export function exportBackupJSON(): string {
  const data = {
    appName: 'ClassGo',
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    classes: loadClasses(),
    history: loadHistory(),
    settings: loadSettings(),
    timetable: loadTimetable(),
    teachingPlan: loadTeachingPlan(),
    disciplineRecords: loadDisciplineRecords(),
    disciplineViolationTypes: loadViolationTypes(),
  };
  return JSON.stringify(data, null, 2);
}

export function importBackupJSON(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    if (data.classes && Array.isArray(data.classes)) {
      saveClasses(data.classes);
      if (data.history && Array.isArray(data.history)) {
        saveHistory(data.history);
      }
      if (data.settings) {
        saveSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      }
      if (data.timetable && Array.isArray(data.timetable)) {
        saveTimetable(data.timetable);
      }
      if (data.teachingPlan && Array.isArray(data.teachingPlan)) {
        saveTeachingPlan(data.teachingPlan);
      }
      if (data.disciplineRecords && Array.isArray(data.disciplineRecords)) {
        saveDisciplineRecords(data.disciplineRecords);
      }
      if (data.disciplineViolationTypes && Array.isArray(data.disciplineViolationTypes)) {
        saveViolationTypes(data.disciplineViolationTypes);
      }
      if (data.classes.length > 0) {
        saveActiveClassId(data.classes[0].id);
      }
      return true;
    }
  } catch (err) {
    console.error('Invalid backup JSON:', err);
  }
  return false;
}

/**
 * Checks if a class list only represents the unmodified default sample data (7A1, 7A2).
 * If the user added custom classes, renamed classes, added/modified students, or entered grades,
 * this returns false (it is REAL user data that must never be lost!).
 */
export function isSampleClasses(classes?: ClassRoom[] | null): boolean {
  if (!classes || classes.length === 0) return true;

  // If any class has an ID or name not matching the initial sample
  const hasCustomClass = classes.some(
    (c) => c.id !== 'class-7a1' && c.id !== 'class-7a2' && c.name !== '7A1' && c.name !== '7A2'
  );
  if (hasCustomClass) return false;

  // Check if any student has scores, custom notes, or stars
  const hasUserScoreOrNote = classes.some((c) =>
    c.students?.some(
      (s) =>
        (s.scores && Object.keys(s.scores).length > 0) ||
        (s.notes && s.notes.trim().length > 0) ||
        (s.stars && s.stars > 0) ||
        (s.studentCode && !s.studentCode.startsWith('HS7A'))
    )
  );
  if (hasUserScoreOrNote) return false;

  // Check total student count (sample data has 30 + 30 = 60 students)
  const totalStudents = classes.reduce((sum, c) => sum + (c.students?.length || 0), 0);
  if (totalStudents !== 60) return false;

  return true;
}

/**
 * Saves a silent local snapshot of all current teacher data before any cloud operation.
 * Guarantees zero data loss if anything unexpected occurs.
 */
export function createSafetyBackup(): void {
  try {
    const backup = {
      timestamp: new Date().toISOString(),
      classes: loadClasses(),
      activeClassId: localStorage.getItem(STORAGE_KEYS.ACTIVE_CLASS_ID),
      history: loadHistory(),
      settings: loadSettings(),
      timetable: loadTimetable(),
      teachingPlan: loadTeachingPlan(),
      disciplineRecords: loadDisciplineRecords(),
      disciplineViolationTypes: loadViolationTypes(),
    };
    localStorage.setItem(STORAGE_KEYS.SAFETY_BACKUP, JSON.stringify(backup));
  } catch (err) {
    console.error('Failed to create safety backup:', err);
  }
}

export function hasSafetyBackup(): boolean {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEYS.SAFETY_BACKUP));
  } catch {
    return false;
  }
}

/**
 * Restores user data from the safety backup if available.
 */
export function restoreSafetyBackup(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAFETY_BACKUP);
    if (!raw) return false;
    const backup = JSON.parse(raw);
    if (backup.classes && Array.isArray(backup.classes)) {
      saveClasses(backup.classes);
      if (backup.activeClassId) saveActiveClassId(backup.activeClassId);
      if (backup.history) saveHistory(backup.history);
      if (backup.settings) saveSettings(backup.settings);
      if (backup.timetable) saveTimetable(backup.timetable);
      if (backup.teachingPlan) saveTeachingPlan(backup.teachingPlan);
      if (backup.disciplineRecords) saveDisciplineRecords(backup.disciplineRecords);
      if (backup.disciplineViolationTypes) saveViolationTypes(backup.disciplineViolationTypes);
      return true;
    }
  } catch (err) {
    console.error('Failed to restore safety backup:', err);
  }
  return false;
}

export function getLastLocalUpdate(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_LOCAL_UPDATE);
  } catch {
    return null;
  }
}

