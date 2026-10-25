import { parseQuestionChoices } from '../../utils/questionParser';
import type { CardOrientationAnswer, QuizQuestionItem } from '../../types/responseCardTypes';

/** Unconfirmed keys exist only in this modal's draft, never in a saved quiz. */
export type QuizQuestionDraft = Omit<QuizQuestionItem, 'correctAnswer'> & {
  correctAnswer: CardOrientationAnswer | null;
};
const LETTERS: readonly CardOrientationAnswer[] = ['A', 'B', 'C', 'D'];
const normalize = (text: string) => text.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');

export function resolveBankCorrectAnswer(answer: string, options: QuizQuestionItem['options']): CardOrientationAnswer | null {
  const text = answer.normalize('NFC').trim();
  if (!text) return null;
  const matches = LETTERS.filter(letter => normalize(options[letter]) === normalize(text));
  const standaloneKey = /^(?:[A-D][.):]?|\([A-D]\)|\[[A-D]\])$/iu.test(text);
  if (!standaloneKey && matches.length) return matches.length === 1 ? matches[0] : null;
  // A standalone key, or an explicitly labelled key, may be followed by an explanation.
  // Require a real delimiter: Vietnamese words such as "Bài" / "Có" are not B / C.
  const key = text.match(/^(?:(?:đáp\s*án(?:\s*đúng)?|phương\s*án(?:\s*đúng)?|chọn(?:\s*(?:phương\s*án|đáp\s*án))?)(?:\s*(?:là|:|=))?\s*)?(?:\(([A-D])\)|\[([A-D])\]|([A-D])(?=$|[\s.):,;\-–—]))/iu);
  if (key) {
    const letter = (key[1] || key[2] || key[3]).toUpperCase() as CardOrientationAnswer;
    const rawRest = text.slice(key[0].length);
    const labelled = /^(?:đáp\s*án|phương\s*án|chọn)/iu.test(text);
    if (!labelled && !key[1] && !key[2] && rawRest.trim() && !/^\s*[.):,;–—]/.test(rawRest)) return null;
    const rest = rawRest.replace(/^[\s.):,;\-–—]+/, '');
    // Multiple keys need a teacher's decision, never a first-letter guess.
    if (/^(?:(?:hoặc|và|hay)\s+|[/&+])\s*(?:(?:phương\s*án|đáp\s*án)\s*)?\(?[A-D](?=$|[\s).,:;])/iu.test(rest) ||
        /^[A-D](?=$|[\s).,:;])/iu.test(rest)) return null;
    const otherKeys = [...text.matchAll(/(?:đáp\s*án(?:\s*đúng)?|chọn(?:\s*(?:phương\s*án|đáp\s*án))?)(?:\s*(?:là|:|=))?\s*[([]?([A-D])(?=$|[\s)\].,:;\-–—])/giu)];
    if (otherKeys.some(match => match[1].toUpperCase() !== letter)) return null;
    return letter;
  }
  // A textual answer is usable only if it identifies exactly one option.
  return matches.length === 1 ? matches[0] : null;
}

export function parseBankQuizQuestion(question: string, answer: string):
  Pick<QuizQuestionDraft, 'question' | 'options' | 'correctAnswer'> | null {
  // Reuse option splitting without the shared parser's answer inference; other modules stay unchanged.
  const normalized = question.replace(/(^|\s)\[([A-D])\]\s*/gi, (_, space, key) => `${space}${key.toUpperCase()}. `)
    .replace(/(^|\s)([a-d])([.)])(?=\s)/g, (_, space, key, mark) => `${space}${key.toUpperCase()}${mark}`);
  const parsed = parseQuestionChoices(normalized, '');
  if (!parsed.isMultipleChoice) return null;
  const options = Object.fromEntries(parsed.options.map(option => [option.key, option.text])) as QuizQuestionItem['options'];
  return { question: parsed.stem, options, correctAnswer: resolveBankCorrectAnswer(answer, options) };
}

export function isReadyQuizQuestion(question: QuizQuestionDraft): question is QuizQuestionItem {
  return !!question.question.trim() && question.correctAnswer !== null && LETTERS.includes(question.correctAnswer) &&
    LETTERS.every(letter => !!question.options[letter]?.trim());
}
