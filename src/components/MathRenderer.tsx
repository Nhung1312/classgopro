import React, { memo, useMemo } from 'react';
import { renderMathText } from '../utils/mathRendering';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  text: string;
  className?: string;
}

/** Presentation only: source strings in forms, storage and exports stay untouched. */
export const MathRenderer = memo(function MathRenderer({ text, className = '' }: MathRendererProps) {
  // Memoize KaTeX compilation too: camera/statistic updates do not recompile a question.
  const parts = useMemo(() => renderMathText(text || ''), [text]);
  if (!text) return null;
  return (
    <span className={'math-rendered-container ' + className}>
      {parts.map((part, index) => {
        if (part.type === 'text') return <span key={index} className="math-text">{part.raw}</span>;
        if (part.error) return (
          <span key={index} className="math-source-error" data-math-error="true">
            <span className="math-text">{part.raw}</span>
            <span role="note" className="math-error-notice" title="Công thức chưa hợp lệ; đang hiển thị mã gốc."
              aria-label="Công thức chưa hợp lệ; đang hiển thị mã gốc.">⚠</span>
          </span>
        );
        return <span key={index} className={'math-fragment ' + (part.displayMode ? 'math-display' : 'math-inline')}
          dangerouslySetInnerHTML={{ __html: part.html! }} />;
      })}
    </span>
  );
});
