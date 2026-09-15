import { Student, NameDisplayStyle, CallTargetFilter } from '../types';

/**
 * Calculates the ordinal number (STT 1..N) of a student within their full class roster.
 */
export function getStudentSTT(student: Student, allClassStudents: Student[]): number {
  if (!allClassStudents || allClassStudents.length === 0) return 1;
  const index = allClassStudents.findIndex((s) => s.id === student.id);
  return index >= 0 ? index + 1 : 1;
}

/**
 * Returns formatted display text for a student according to the chosen naming style.
 */
export function formatStudentDisplayName(
  student: Student,
  allClassStudents: Student[],
  style: NameDisplayStyle = 'FULL_NAME',
  compact: boolean = false
): string {
  if (!student) return '';
  const stt = getStudentSTT(student, allClassStudents);
  const sttStr = stt < 10 ? `0${stt}` : `${stt}`;

  switch (style) {
    case 'STT_NAME': {
      // e.g. "15. Đặng Nhật Minh" or compact "15. Nhật Minh"
      if (compact) {
        const parts = student.name.trim().split(/\s+/);
        const shortName = parts.length > 2 ? `${parts[0]} ${parts[parts.length - 1]}` : student.name;
        return `${sttStr}. ${shortName}`;
      }
      return `${sttStr}. ${student.name}`;
    }

    case 'ONLY_STT':
      return `Số ${sttStr}`;

    case 'FIRST_NAME_ONLY': {
      // Just the given name (e.g. "Minh", "Bình", "Hương")
      const parts = student.name.trim().split(/\s+/);
      return parts[parts.length - 1] || student.name;
    }

    case 'CODE_NAME':
      if (student.studentCode) {
        return compact ? student.studentCode : `${student.studentCode} - ${student.name}`;
      }
      return `${sttStr}. ${student.name}`;

    case 'FULL_NAME':
    default:
      if (compact && student.name.length > 18) {
        const parts = student.name.trim().split(/\s+/);
        return parts.length > 2 ? `${parts[0]} ${parts[parts.length - 1]}` : student.name.slice(0, 16) + '..';
      }
      return student.name;
  }
}

/**
 * Filter students based on teacher quick target filters:
 * - 'ALL': All present students
 * - 'FEMALE_ONLY': Only female students
 * - 'MALE_ONLY': Only male students
 * - 'NO_SCORE_TX1': Students who do not yet have a TX1 (oral/regular) score
 */
export function filterStudentsByTarget(
  students: Student[],
  filter: CallTargetFilter = 'ALL'
): Student[] {
  if (!students) return [];

  switch (filter) {
    case 'FEMALE_ONLY':
      return students.filter((s) => s.gender === 'nu');
    case 'MALE_ONLY':
      return students.filter((s) => s.gender === 'nam');
    case 'NO_SCORE_TX1':
      return students.filter(
        (s) => s.scores?.tx1 === null || s.scores?.tx1 === undefined
      );
    case 'ALL':
    default:
      return students;
  }
}

/**
 * Generates natural spoken speech for TTS matching the chosen naming style.
 */
export function getSpeechAnnouncementText(
  student: Student,
  allClassStudents: Student[],
  style: NameDisplayStyle = 'FULL_NAME',
  template: string = 'Xin mời bạn {name} lên bảng!'
): string {
  const stt = getStudentSTT(student, allClassStudents);
  const sttStr = `${stt}`;

  switch (style) {
    case 'STT_NAME':
      return `Xin mời bạn số ${sttStr}, ${student.name} lên bảng!`;
    case 'ONLY_STT':
      return `Xin mời học sinh số ${sttStr} lên bảng!`;
    case 'FIRST_NAME_ONLY': {
      const parts = student.name.trim().split(/\s+/);
      const firstName = parts[parts.length - 1] || student.name;
      return `Xin mời bạn ${firstName} lên bảng!`;
    }
    case 'CODE_NAME':
      if (student.studentCode) {
        return `Xin mời học sinh mã số ${student.studentCode}, bạn ${student.name} lên bảng!`;
      }
      return `Xin mời bạn số ${sttStr}, ${student.name} lên bảng!`;
    case 'FULL_NAME':
    default:
      return template.replace(/\{name\}/g, student.name);
  }
}
