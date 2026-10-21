/** Parses the A/B/C/D questions already stored as one KaTeX-enabled text field.
 *  Open-ended questions are left untouched.
 */
export type ChoiceLetter = 'A' | 'B' | 'C' | 'D';
export type QuizOption = { letter: ChoiceLetter; content: string };
export type ParsedQuiz = { stem: string; options: QuizOption[]; correctLetter: ChoiceLetter | null };
const LETTERS: ChoiceLetter[] = ['A', 'B', 'C', 'D'];
const optionLine = /^\s*([ABCD])\s*[.):]\s*(.*)\s*$/i;

/** Only matches an explicit answer letter at the beginning, never a digit or LaTeX token. */
export function parseCorrectLetter(answer: string | undefined): ChoiceLetter | null {
  if (!answer) return null;
  const matched = answer.trim().match(/^(?:đáp\s*án(?:\s*đúng)?\s*[:：]\s*)?([ABCD])(?=\s*[.):：-]|\s*$)/i);
  return matched ? matched[1].toUpperCase() as ChoiceLetter : null;
}

export function parseMultipleChoice(content: string, answer?: string): ParsedQuiz | null {
  const lines = content.replace(/\r\n?/g, '\n').replace(/<br\s*\/?>/gi, '\n').split('\n');
  const firstOption = lines.findIndex(line => /^\s*A\s*[.):]\s*/i.test(line));
  if (firstOption < 1) return null;
  const stem = lines.slice(0, firstOption).join('\n').trim();
  if (!stem) return null;
  const options: QuizOption[] = [];
  for (const line of lines.slice(firstOption)) {
    const option = line.match(optionLine);
    if (option) {
      const letter = option[1].toUpperCase() as ChoiceLetter;
      if (letter !== LETTERS[options.length] || options.length >= 4) return null;
      options.push({ letter, content: option[2].trim() });
    } else if (options.length) {
      // Preserve multiline mathematical options.
      options[options.length - 1].content += '\n' + line.trim();
    } else return null;
  }
  if (options.length !== 4 || options.some(option => !option.content.trim())) return null;
  return { stem, options, correctLetter: parseCorrectLetter(answer) };
}
