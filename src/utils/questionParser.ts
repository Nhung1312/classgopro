/**
 * Utility to parse review questions into Multiple Choice options (A, B, C, D) or Essay questions.
 * Supports KaTeX math formulas in both stems and option choices.
 */

export interface ParsedOption {
  key: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface ParsedQuestionResult {
  isMultipleChoice: boolean;
  stem: string;
  options: ParsedOption[];
  correctKey: 'A' | 'B' | 'C' | 'D' | null;
  explanation?: string;
}

/**
 * Checks if a string contains multiple choice options A, B, C, D
 * and extracts the question stem, the individual choices, and the correct answer key.
 */
export function parseQuestionChoices(questionText: string, answerText: string): ParsedQuestionResult {
  if (!questionText || typeof questionText !== 'string') {
    return {
      isMultipleChoice: false,
      stem: questionText || '',
      options: [],
      correctKey: null,
      explanation: answerText,
    };
  }

  // Regex pattern to locate choices A, B, C, D.
  // Handles:
  // - "A. ... B. ... C. ... D. ..."
  // - "A) ... B) ... C) ... D) ..."
  // - "[A] ... [B] ... [C] ... [D] ..."
  // - Newline or space preceding the letter marker
  const optionRegex = /(?:^|\r?\n|\s{2,}|\t)(?:([A-D])[.)\]:]\s*)/g;

  const matches: Array<{ key: 'A' | 'B' | 'C' | 'D'; index: number; fullLength: number }> = [];
  let match: RegExpExecArray | null;

  while ((match = optionRegex.exec(questionText)) !== null) {
    const key = match[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
    matches.push({
      key,
      index: match.index,
      fullLength: match[0].length,
    });
  }

  // Check if we found at least 2 distinct keys (ideally A, B, C, D in order)
  const foundKeys = matches.map((m) => m.key);
  const hasA = foundKeys.includes('A');
  const hasB = foundKeys.includes('B');

  if (!hasA || !hasB || matches.length < 2) {
    // If not detected with standard spacing, try single-space inline detection:
    // e.g. "Câu hỏi? A. text B. text C. text D. text"
    const inlineRegex = /\s([A-D])[.)]\s+/g;
    const inlineMatches: Array<{ key: 'A' | 'B' | 'C' | 'D'; index: number; fullLength: number }> = [];
    while ((match = inlineRegex.exec(questionText)) !== null) {
      inlineMatches.push({
        key: match[1].toUpperCase() as 'A' | 'B' | 'C' | 'D',
        index: match.index,
        fullLength: match[0].length,
      });
    }

    const inlineKeys = inlineMatches.map((m) => m.key);
    if (inlineKeys.includes('A') && inlineKeys.includes('B') && inlineMatches.length >= 2) {
      return buildParsedResult(questionText, inlineMatches, answerText);
    }

    // Treat as Essay question
    return {
      isMultipleChoice: false,
      stem: questionText.trim(),
      options: [],
      correctKey: null,
      explanation: answerText,
    };
  }

  return buildParsedResult(questionText, matches, answerText);
}

function buildParsedResult(
  rawText: string,
  matches: Array<{ key: 'A' | 'B' | 'C' | 'D'; index: number; fullLength: number }>,
  rawAnswer: string
): ParsedQuestionResult {
  // Sort matches by position in text
  matches.sort((a, b) => a.index - b.index);

  // First option starts at matches[0].index
  const stem = rawText.slice(0, matches[0].index).trim();

  const options: ParsedOption[] = [];

  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const textStart = cur.index + cur.fullLength;
    const textEnd = i + 1 < matches.length ? matches[i + 1].index : rawText.length;
    const optText = rawText.slice(textStart, textEnd).trim();

    options.push({
      key: cur.key,
      text: optText,
    });
  }

  // Determine correctKey from rawAnswer
  const correctKey = extractCorrectKey(rawAnswer, options);

  return {
    isMultipleChoice: options.length >= 2,
    stem: stem || rawText.trim(),
    options,
    correctKey,
    explanation: rawAnswer.trim(),
  };
}

/**
 * Extracts which option (A, B, C, D) is the correct answer.
 */
function extractCorrectKey(answerText: string, options: ParsedOption[]): 'A' | 'B' | 'C' | 'D' | null {
  if (!answerText) return null;
  const trimmed = answerText.trim();

  // 1. Direct letter match: "A", "b", "C.", "D)"
  const directMatch = trimmed.match(/^(?:đáp\s*án\s*[:\s]*)?([A-D])(?:\b|[.:\s\)\-]|$)/i);
  if (directMatch) {
    const key = directMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
    if (options.some((o) => o.key === key)) {
      return key;
    }
  }

  // 2. Look anywhere for "Đáp án: X" or "Chọn X"
  const anywhereMatch = trimmed.match(/(?:đáp\s*án|chọn)\s*[:\s]*([A-D])\b/i);
  if (anywhereMatch) {
    const key = anywhereMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
    if (options.some((o) => o.key === key)) {
      return key;
    }
  }

  // 3. Match full option text if answer equals the option body
  for (const opt of options) {
    if (opt.text && trimmed.toLowerCase() === opt.text.toLowerCase()) {
      return opt.key;
    }
  }

  return null;
}
