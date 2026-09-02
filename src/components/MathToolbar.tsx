import React from 'react';

interface MathToolbarProps {
  onInsert: (symbol: string) => void;
}

const MATH_SHORTCUTS: { label: string; snippet: string; tooltip: string }[] = [
  { label: 'a/b', snippet: '\\frac{a}{b}', tooltip: 'Phân số \\frac{a}{b}' },
  { label: '√x', snippet: '\\sqrt{x}', tooltip: 'Căn bậc hai \\sqrt{x}' },
  { label: 'ⁿ√x', snippet: '\\sqrt[n]{x}', tooltip: 'Căn bậc n \\sqrt[n]{x}' },
  { label: 'x²', snippet: 'x^{2}', tooltip: 'Lũy thừa / Mũ' },
  { label: 'x₁', snippet: 'x_{1}', tooltip: 'Chỉ số dưới' },
  { label: 'Δ', snippet: '\\Delta', tooltip: 'Delta' },
  { label: 'π', snippet: '\\pi', tooltip: 'Số Pi' },
  { label: 'α', snippet: '\\alpha', tooltip: 'Alpha' },
  { label: 'β', snippet: '\\beta', tooltip: 'Beta' },
  { label: 'θ', snippet: '\\theta', tooltip: 'Theta' },
  { label: '∫', snippet: '\\int_{a}^{b} f(x) dx', tooltip: 'Tích phân xác định' },
  { label: '∑', snippet: '\\sum_{i=1}^{n}', tooltip: 'Tổng sigma' },
  { label: 'lim', snippet: '\\lim_{x \\to x_0}', tooltip: 'Giới hạn lim' },
  { label: '±', snippet: '\\pm', tooltip: 'Cộng trừ \\pm' },
  { label: '≠', snippet: '\\neq', tooltip: 'Khác \\neq' },
  { label: '≤', snippet: '\\le', tooltip: 'Nhỏ hơn hoặc bằng \\le' },
  { label: '≥', snippet: '\\ge', tooltip: 'Lớn hơn hoặc bằng \\ge' },
  { label: '∞', snippet: '\\infty', tooltip: 'Vô cực \\infty' },
  { label: 'vec{v}', snippet: '\\vec{v}', tooltip: 'Véc-tơ \\vec{v}' },
  { label: '∠ABC', snippet: '\\widehat{ABC}', tooltip: 'Góc \\widehat{ABC}' },
  { label: '∈', snippet: '\\in', tooltip: 'Thuộc \\in' },
  { label: '⊂', snippet: '\\subset', tooltip: 'Tập con \\subset' },
  { label: 'Hệ pt', snippet: '\\begin{cases} x + y = 1 \\\\ 2x - y = 3 \\end{cases}', tooltip: 'Hệ phương trình' },
];

export const MathToolbar: React.FC<MathToolbarProps> = ({ onInsert }) => {
  return (
    <div className="bg-slate-950/60 border border-indigo-500/30 rounded-xl p-2.5 my-2">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
          <span>📐 Ký hiệu & Công thức Toán nhanh:</span>
        </span>
        <span className="text-[10px] text-slate-400">
          Chèn vào $...$ để KaTeX hiển thị công thức đẹp
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {MATH_SHORTCUTS.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onInsert(item.snippet)}
            className="px-2 py-1 bg-slate-800 hover:bg-indigo-600/80 text-slate-200 hover:text-white rounded text-xs font-mono border border-slate-700 transition-colors"
            title={item.tooltip}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};
