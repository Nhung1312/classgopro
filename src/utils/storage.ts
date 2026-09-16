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
  RECOVERY_CLASSES: 'classgo_recovery_real_classes_v1',
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

/**
 * Retrieves previously saved real teacher classes from safety backup or recovery storage,
 * if current classes were ever inadvertently reset to sample data.
 */
export function getAvailableRecoveryClasses(): ClassRoom[] | null {
  try {
    // 1. Check dedicated recovery vault
    const recRaw = localStorage.getItem(STORAGE_KEYS.RECOVERY_CLASSES);
    if (recRaw) {
      const parsed = JSON.parse(recRaw);
      const classes = Array.isArray(parsed) ? parsed : parsed?.classes;
      if (classes && Array.isArray(classes) && classes.length > 0 && !isSampleClasses(classes)) {
        return classes;
      }
    }

    // 2. Check safety backup
    const safeRaw = localStorage.getItem(STORAGE_KEYS.SAFETY_BACKUP);
    if (safeRaw) {
      const parsed = JSON.parse(safeRaw);
      const classes = parsed?.classes;
      if (classes && Array.isArray(classes) && classes.length > 0 && !isSampleClasses(classes)) {
        return classes;
      }
    }
  } catch (err) {
    console.error('Failed to read recovery classes:', err);
  }
  return null;
}

export function loadClasses(): ClassRoom[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLASSES) || localStorage.getItem(STORAGE_KEYS.LEGACY_CLASSES);
    if (!raw) {
      // Check if user previously had real classes in recovery storage
      const recovery = getAvailableRecoveryClasses();
      if (recovery && recovery.length > 0) {
        console.log('[Storage] Automatically restored real teacher classes from recovery vault');
        saveClasses(recovery);
        return recovery;
      }
      saveClasses(INITIAL_CLASSES);
      return INITIAL_CLASSES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      if (parsed.length > 0) {
        // If current is sample data, but recovery has real user data, auto-recover!
        if (isSampleClasses(parsed)) {
          const recovery = getAvailableRecoveryClasses();
          if (recovery && recovery.length > 0) {
            console.log('[Storage] Auto-recovering real user classes over default sample data');
            saveClasses(recovery);
            return recovery;
          }
        }
        return parsed;
      }
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

    // Permanently preserve non-sample teacher data in recovery storage
    if (classes && classes.length > 0 && !isSampleClasses(classes)) {
      localStorage.setItem(
        STORAGE_KEYS.RECOVERY_CLASSES,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          classes,
        })
      );
    }
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
  if (!classes || !Array.isArray(classes) || classes.length === 0) return true;

  // Default sample data strictly has exactly 2 classes
  if (classes.length !== 2) return false;

  const classNames = classes.map((c) => c.name.trim().toUpperCase());
  if (!classNames.includes('7A1') || !classNames.includes('7A2')) {
    return false;
  }

  // Check subjects: sample subjects are only Toán học & Ngữ văn
  for (const c of classes) {
    if (c.subject && c.subject !== 'Toán học' && c.subject !== 'Ngữ văn') {
      return false;
    }
    // Sample classes have exactly 30 students each
    if (!c.students || c.students.length !== 30) {
      return false;
    }
    // Check if any student has scores, custom notes, stars, or attendance markings
    for (const s of c.students) {
      if (s.scores && Object.keys(s.scores).length > 0) return false;
      if (s.notes && s.notes.trim().length > 0) return false;
      if (s.stars && s.stars > 0) return false;
      if (s.isAbsent) return false;
      if ((s as any).attendanceStatus && (s as any).attendanceStatus !== 'PRESENT') return false;
      if (s.studentCode && !s.studentCode.startsWith('HS7A')) return false;
    }
  }

  // Check known sample student names
  const sampleNames = new Set([
    'Nguyễn Văn An', 'Trần Thị Bình', 'Lê Văn Chi', 'Phạm Tiến Dũng', 'Hoàng Minh Đức',
    'Vũ Thị Hà Giang', 'Đỗ Thị Thu Hương', 'Bùi Gia Huy', 'Dương Khánh Huyền', 'Ngô Quốc Hưng',
    'Phan Thảo Linh', 'Lâm Tuấn Kiệt', 'Trịnh Bảo Long', 'Mai Phương Mai', 'Đặng Nhật Minh',
    'Lê Ngọc Mỹ Anh', 'Nguyễn Thành Nam', 'Hoàng Bảo Ngọc', 'Vũ Yến Nhi', 'Phạm Hồng Phúc',
    'Trần Phú Quý', 'Nguyễn Như Quỳnh', 'Đoàn Minh Sơn', 'Lý Quốc Thắng', 'Vương Thanh Thảo',
    'Tạ Minh Triết', 'Hồ Cẩm Tú', 'Đinh Quốc Tuấn', 'Lưu Tường Vy', 'Cao Hải Yến',
    'Võ Minh Ánh', 'Đặng Tuấn Anh', 'Bùi Kim Chi', 'Lương Quốc Đạt', 'Thái Mỹ Dung',
    'Phan Minh Hải', 'Tạ Thúy Hằng', 'Trịnh Hoàng Long', 'Trần Trúc Mai', 'Nguyễn Trọng Nghĩa',
    'Đỗ Quỳnh Nga',
  ]);

  let matchSampleCount = 0;
  for (const c of classes) {
    for (const s of c.students) {
      if (sampleNames.has(s.name.trim())) {
        matchSampleCount++;
      }
    }
  }

  // If less than 45 out of 60 students match the sample names, it is real teacher data!
  if (matchSampleCount < 45) {
    return false;
  }

  return true;
}

/**
 * Saves a silent local snapshot of all current teacher data before any cloud operation.
 * Guarantees zero data loss if anything unexpected occurs.
 * NEVER overwrites an existing real backup with default sample data.
 */
export function createSafetyBackup(): void {
  try {
    const currentClasses = loadClasses();

    // Guard: Do NOT overwrite an existing backup that contains REAL teacher data
    // if currentClasses is only default sample data
    const existingRaw = localStorage.getItem(STORAGE_KEYS.SAFETY_BACKUP);
    if (existingRaw) {
      try {
        const existing = JSON.parse(existingRaw);
        if (existing?.classes && !isSampleClasses(existing.classes) && isSampleClasses(currentClasses)) {
          console.log('[Storage] Preserved existing safety backup with real teacher data');
          return;
        }
      } catch {
        // ignore
      }
    }

    const backup = {
      timestamp: new Date().toISOString(),
      classes: currentClasses,
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

