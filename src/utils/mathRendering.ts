import katex from 'katex';

export type MathTextPart = { type: 'text'; raw: string } | {
  type: 'math'; raw: string; content: string; displayMode: boolean; html?: string; error?: boolean;
};

function escaped(text: string, index: number) {
  let slashes = 0;
  while (index > 0 && text[--index] === '\\') slashes++;
  return slashes % 2 === 1;
}

function findEnd(text: string, start: number, delimiter: string) {
  for (let i = start; i < text.length; i++) {
    if (escaped(text, i)) continue;
    // An unmatched brace still reaches the delimiter and falls back through KaTeX,
    // without swallowing the remainder of the Vietnamese question.
    if (text.startsWith(delimiter, i) && (delimiter !== '$' || text[i + 1] !== '$')) return i;
    if (delimiter === '$' && text[i] === '\n') return -1;
  }
  return -1;
}

/** Conservative dollar handling: prices/prose and escaped/unpaired dollars stay text. */
function dollarMath(content: string, after: string) {
  const value = content.trim();
  if (!value || /^\d/.test(after)) return false; // "$5 và $10" is two prices.
  if (/\\[a-zA-Z]+|[=^_+*/<>{}|−×÷]/.test(value)) return true;
  if (/^[\d.,\s-]+$/.test(value)) return true; // Explicitly paired "$16$".
  if (/\b[a-z]{2,}\s|\s[a-z]{2,}\b/.test(value)) return false;
  return /^[a-zA-Z\d.,()[\]\s-]+$/.test(value);
}

/** Split only; never normalize or rewrite LaTeX, Vietnamese text or escape characters. */
export function parseMathText(text: string): MathTextPart[] {
  const parts: MathTextPart[] = [];
  let plainStart = 0;
  for (let i = 0; i < text.length;) {
    if (escaped(text, i)) { i++; continue; }
    const open = text.startsWith('$$', i) ? '$$' : text.startsWith('\\[', i) ? '\\['
      : text.startsWith('\\(', i) ? '\\(' : text[i] === '$' ? '$' : '';
    if (!open) { i++; continue; }
    const close = open === '\\[' ? '\\]' : open === '\\(' ? '\\)' : open;
    const end = findEnd(text, i + open.length, close);
    const content = end < 0 ? '' : text.slice(i + open.length, end);
    if (end < 0 || open === '$' && !dollarMath(content, text[end + 1] || '')) { i += open.length; continue; }
    if (i > plainStart) parts.push({ type: 'text', raw: text.slice(plainStart, i) });
    const next = end + close.length;
    parts.push({ type: 'math', raw: text.slice(i, next), content, displayMode: open === '$$' || open === '\\[' });
    i = next;
    plainStart = next;
  }
  if (plainStart < text.length) parts.push({ type: 'text', raw: text.slice(plainStart) });
  return parts;
}

export function renderMathText(text: string): MathTextPart[] {
  return parseMathText(text).map(part => {
    if (part.type === 'text') return part;
    try {
      return { ...part, html: katex.renderToString(part.content, {
        displayMode: part.displayMode, output: 'htmlAndMathml', throwOnError: true,
        trust: false, strict: false, maxExpand: 200, maxSize: 10,
      }) };
    } catch {
      // React renders this raw content as text; never insert it as HTML.
      return { ...part, error: true };
    }
  });
}
