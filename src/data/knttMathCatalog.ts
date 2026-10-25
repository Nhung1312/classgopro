import rawCatalog from './knttMathCatalog.json';
import { ReviewQuestionBank } from '../types';

export interface KnttLesson {
  id: string; // e.g. "KNTT-MATH-6-L01"
  number: number; // 1
  title: string; // "Tập hợp"
}

export interface KnttAdditionalActivity {
  type: string;
  title: string;
}

export interface KnttChapter {
  id: string; // e.g. "KNTT-MATH-6-C01"
  number: number; // 1
  roman: string; // "I"
  title: string; // "TẬP HỢP CÁC SỐ TỰ NHIÊN"
  volume: number; // 1 | 2
  lessons: KnttLesson[];
  additional_activities?: KnttAdditionalActivity[];
}

export interface KnttGradeData {
  grade: number; // 6 | 7 | 8 | 9
  chapters: KnttChapter[];
  chapter_count?: number;
  numbered_lesson_count?: number;
}

export interface KnttCatalog {
  schemaVersion: number;
  datasetId: string;
  bookSeries: string;
  subject: string;
  source: string;
  notes: string[];
  summary: {
    grades: number;
    chapters: number;
    numberedLessons: number;
  };
  grades: KnttGradeData[];
}

export const KNTT_MATH_CATALOG: KnttCatalog = rawCatalog as KnttCatalog;

export const BOOK_SERIES_KNTT_NAME = 'Kết nối tri thức với cuộc sống';

/**
 * Returns available grades in KNTT Math catalog: [6, 7, 8, 9]
 */
export function getKnttGrades(): number[] {
  return KNTT_MATH_CATALOG.grades.map((g) => g.grade);
}

/**
 * Get grade data for a specific grade
 */
export function getKnttGradeData(grade: number | string): KnttGradeData | undefined {
  const gNum = Number(grade);
  return KNTT_MATH_CATALOG.grades.find((g) => g.grade === gNum);
}

/**
 * Get chapters for a grade, optionally filtered by volume (1 or 2)
 */
export function getKnttChapters(
  grade: number | string,
  volume?: number | string | 'ALL'
): KnttChapter[] {
  const gradeData = getKnttGradeData(grade);
  if (!gradeData) return [];

  if (!volume || volume === 'ALL') {
    return gradeData.chapters;
  }

  const volNum = Number(volume);
  return gradeData.chapters.filter((c) => c.volume === volNum);
}

/**
 * Get chapter by its ID (e.g. "KNTT-MATH-6-C01")
 */
export function getKnttChapterById(chapterId: string): { chapter: KnttChapter; grade: number } | null {
  for (const g of KNTT_MATH_CATALOG.grades) {
    const found = g.chapters.find((c) => c.id === chapterId);
    if (found) {
      return { chapter: found, grade: g.grade };
    }
  }
  return null;
}

/**
 * Format chapter title with Roman numeral and Volume, e.g.:
 * "Chương I: TẬP HỢP CÁC SỐ TỰ NHIÊN (Tập 1)"
 */
export function formatKnttChapterTitle(chapter: KnttChapter): string {
  return `Chương ${chapter.roman}: ${chapter.title} (Tập ${chapter.volume})`;
}

/**
 * Format lesson title with lesson number, e.g.:
 * "Bài 1: Tập hợp"
 */
export function formatKnttLessonTitle(lesson: KnttLesson): string {
  return `Bài ${lesson.number}: ${lesson.title}`;
}

/**
 * Get all lessons for a specific chapter
 */
export function getKnttLessonsByChapter(chapterId: string): KnttLesson[] {
  for (const g of KNTT_MATH_CATALOG.grades) {
    const ch = g.chapters.find((c) => c.id === chapterId);
    if (ch) {
      return ch.lessons;
    }
  }
  return [];
}

/**
 * Get all lessons for a grade, optionally filtered by volume
 */
export function getKnttAllLessonsForGrade(
  grade: number | string,
  volume?: number | string | 'ALL'
): Array<{
  chapter: KnttChapter;
  lesson: KnttLesson;
  fullChapterTitle: string;
  fullLessonTitle: string;
}> {
  const chapters = getKnttChapters(grade, volume);
  const result: Array<{
    chapter: KnttChapter;
    lesson: KnttLesson;
    fullChapterTitle: string;
    fullLessonTitle: string;
  }> = [];

  for (const ch of chapters) {
    const fullChapterTitle = formatKnttChapterTitle(ch);
    for (const ls of ch.lessons) {
      result.push({
        chapter: ch,
        lesson: ls,
        fullChapterTitle,
        fullLessonTitle: formatKnttLessonTitle(ls),
      });
    }
  }

  return result;
}

/**
 * Find a lesson by ID across the entire KNTT catalog
 */
export function findKnttLessonById(lessonId: string): {
  grade: number;
  chapter: KnttChapter;
  lesson: KnttLesson;
} | null {
  for (const g of KNTT_MATH_CATALOG.grades) {
    for (const ch of g.chapters) {
      const ls = ch.lessons.find((l) => l.id === lessonId);
      if (ls) {
        return {
          grade: g.grade,
          chapter: ch,
          lesson: ls,
        };
      }
    }
  }
  return null;
}

/**
 * Normalize title for comparison (strips accents & prefix "Bài X:")
 */
export function normalizeMathTitle(str: string): string {
  return str
    .toLowerCase()
    .replace(/^bài\s*\d+\s*:\s*/i, '')
    .trim();
}

/**
 * Find an existing user question bank that matches a KNTT catalog lesson
 */
export function findMatchingBankForKnttLesson(
  banks: ReviewQuestionBank[],
  knttLesson: KnttLesson,
  grade: number | string,
  _chapter?: KnttChapter
): ReviewQuestionBank | undefined {
  const gStr = String(grade);
  const normalizedTitle = normalizeMathTitle(knttLesson.title);
  const fullLessonTitle = formatKnttLessonTitle(knttLesson).toLowerCase().trim();

  return banks.find((b) => {
    if (b.subject.toLowerCase() !== 'toán') return false;
    if (String(b.grade) !== gStr) return false;

    // 1. Direct ID match
    if (b.lessonId === knttLesson.id) return true;
    if (b.lessonId && b.lessonId.toLowerCase().includes(knttLesson.id.toLowerCase())) return true;

    // 2. Full title match
    const bName = b.lessonName.toLowerCase().trim();
    if (bName === fullLessonTitle) return true;

    // 3. Normalized title match
    const bNameClean = normalizeMathTitle(bName);
    if (bNameClean === normalizedTitle) return true;

    return false;
  });
}

export interface CatalogLessonItem {
  id: string; // lesson ID from KNTT e.g. "KNTT-MATH-6-L01"
  number: number;
  title: string;
  fullTitle: string; // "Bài 1: Tập hợp"
  chapterId: string;
  chapterNumber: number;
  chapterRoman: string;
  chapterTitle: string;
  fullChapterTitle: string; // "Chương I: TẬP HỢP CÁC SỐ TỰ NHIÊN (Tập 1)"
  volume: number;
  grade: number;
  hasBank: boolean;
  bankId?: string;
  existingCounts?: {
    basic: number;
    advanced: number;
    total: number;
  };
  questionCount: {
    basic: number;
    advanced: number;
    total: number;
  };
}

/**
 * Returns complete list of catalog lessons for a grade, optionally filtered by volume and chapter,
 * with status annotated against existing user question banks.
 */
export function getKnttCatalogLessonsWithBankStatus(
  grade: number | string,
  volume?: number | string | 'ALL',
  chapterId?: string | 'ALL',
  banks: ReviewQuestionBank[] = [],
  questionsLoader?: (bankId: string) => { basic: number; advanced: number; total: number }
): CatalogLessonItem[] {
  const chapters = getKnttChapters(grade, volume);
  const filteredChapters =
    !chapterId || chapterId === 'ALL'
      ? chapters
      : chapters.filter((c) => c.id === chapterId);

  const results: CatalogLessonItem[] = [];

  for (const ch of filteredChapters) {
    const fullChapterTitle = formatKnttChapterTitle(ch);
    for (const ls of ch.lessons) {
      const fullLessonTitle = formatKnttLessonTitle(ls);
      const matchedBank = findMatchingBankForKnttLesson(banks, ls, grade, ch);

      let existingCounts = undefined;
      if (matchedBank && questionsLoader) {
        existingCounts = questionsLoader(matchedBank.id);
      }
      const counts = existingCounts || { basic: 0, advanced: 0, total: 0 };

      results.push({
        id: ls.id,
        number: ls.number,
        title: ls.title,
        fullTitle: fullLessonTitle,
        chapterId: ch.id,
        chapterNumber: ch.number,
        chapterRoman: ch.roman,
        chapterTitle: ch.title,
        fullChapterTitle,
        volume: ch.volume,
        grade: Number(grade),
        hasBank: !!matchedBank,
        bankId: matchedBank?.id,
        existingCounts,
        questionCount: counts,
      });
    }
  }

  return results;
}
