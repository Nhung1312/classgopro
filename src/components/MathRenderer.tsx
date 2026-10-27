import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  text: string;
  className?: string;
}

/**
 * Component to parse text and render math LaTeX expressions ($...$ or $$...$$) safely with KaTeX
 */
export const MathRenderer: React.FC<MathRendererProps> = ({ text, className = '' }) => {
  const renderedParts = useMemo(() => {
    if (!text) return [];

    // Regex to detect $$...$$ (display math) and $...$ (inline math)
    // Also handles standard mathematical brackets \( ... \) and \[ ... \]
    const regex = /(\$\$[\s\S]*?\$\$|\$[^$]+?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
    const parts: { type: 'text' | 'math'; content: string; displayMode?: boolean }[] = [];

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const matchStart = match.index;
      if (matchStart > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, matchStart),
        });
      }

      const rawMatch = match[0];
      if (rawMatch.startsWith('$$') && rawMatch.endsWith('$$')) {
        parts.push({
          type: 'math',
          content: rawMatch.slice(2, -2).trim(),
          displayMode: true,
        });
      } else if (rawMatch.startsWith('\\[') && rawMatch.endsWith('\\]')) {
        parts.push({
          type: 'math',
          content: rawMatch.slice(2, -2).trim(),
          displayMode: true,
        });
      } else if (rawMatch.startsWith('$') && rawMatch.endsWith('$')) {
        parts.push({
          type: 'math',
          content: rawMatch.slice(1, -1).trim(),
          displayMode: false,
        });
      } else if (rawMatch.startsWith('\\(') && rawMatch.endsWith('\\)')) {
        parts.push({
          type: 'math',
          content: rawMatch.slice(2, -2).trim(),
          displayMode: false,
        });
      }

      lastIndex = matchStart + rawMatch.length;
    }

    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex),
      });
    }

    return parts;
  }, [text]);

  if (!text) return null;

  return (
    <span className={`inline-block math-rendered-container ${className}`}>
      {renderedParts.map((part, index) => {
        if (part.type === 'text') {
          // Render line breaks correctly
          return (
            <span key={index} className="whitespace-pre-wrap">
              {part.content}
            </span>
          );
        }

        try {
          const html = katex.renderToString(part.content, {
            displayMode: part.displayMode,
            throwOnError: false,
            output: 'html',
          });

          return (
            <span
              key={index}
              className={part.displayMode ? 'block my-2 text-center overflow-x-auto py-1' : 'inline-block px-1'}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          // Fallback if rendering fails
          return (
            <span key={index} className="text-amber-400 font-mono">
              ${part.content}$
            </span>
          );
        }
      })}
    </span>
  );
};
