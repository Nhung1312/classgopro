import assert from 'node:assert/strict';
import { parseMathText, renderMathText } from '../src/utils/mathRendering';
import { parseBankQuizQuestion } from '../src/components/response-cards/questionBankImport';

const samples = [
  String.raw`Tìm x biết $x-\frac{1}{2}=\frac{3}{4}$`,
  String.raw`$x^2+2x+1=(x+1)^2$`,
  String.raw`$\sqrt{16}=4$`,
  String.raw`$\frac{a+b}{c}$`,
  String.raw`$x\in\mathbb{Q}$`,
  String.raw`Tam giác $\triangle ABC$, góc $\widehat{ABC}=60^\circ$, $AB\parallel CD$, $AH\perp BC$.`,
  String.raw`Cho \(a_1=2\), tính \[\sqrt[3]{8}+\dfrac{1}{2}\] rồi so sánh $|x|\leq 3$.`,
  'Đoạn thứ nhất: $2x$.\n\nĐoạn thứ hai: $x_1=2$ và $x_2=3$.',
  String.raw`$$\begin{aligned}x+1&=2\\x&=1\end{aligned}$$`,
  String.raw`$\left|\frac{-3}{4}\right|=\frac{3}{4}$`,
];
let formulas = 0;
for (const source of samples) {
  const parts = renderMathText(source);
  assert.equal(parts.map(p => p.raw).join(''), source, 'original source/backslashes preserved exactly');
  const math = parts.filter(p => p.type === 'math');
  assert.ok(math.length > 0);
  for (const part of math) {
    assert.equal(part.error, undefined, source);
    assert.match(part.html!, /class="katex"/);
    assert.match(part.html!, /class="katex-html"/);
    assert.match(part.html!, /<math /, 'accessible MathML and visible math, not only a source annotation');
    formulas++;
  }
}
assert.match(renderMathText(samples[0]).filter(p => p.type === 'math')[0].html!, /class="mfrac"/);
assert.match(renderMathText(samples[1]).filter(p => p.type === 'math')[0].html!, /msupsub/);
assert.match(renderMathText(samples[2]).filter(p => p.type === 'math')[0].html!, /sqrt/);
const bad = String.raw`Giữ nguyên $\frac{1}{$ và $\commandUnknown{x}$, tiếp tục $x=2$.`;
const invalid = renderMathText(bad);
assert.equal(invalid.map(p => p.raw).join(''), bad);
assert.equal(invalid.filter(p => p.type === 'math' && p.error).length, 2);
assert.ok(invalid.some(p => p.type === 'math' && !p.error), 'a bad formula does not suppress later valid formulas');
for (const plain of ['Câu hỏi tiếng Việt hoàn toàn không có công thức.', 'Giá $5 và $10, tổng 15 USD.',
  'Giá $5.50, giảm còn $4.00.', String.raw`Giá \$5 và \$10.`, 'Ký hiệu $ đơn lẻ', 'Giá $ 5 và $ 10']) {
  assert.ok(parseMathText(plain).every(p => p.type === 'text'), plain);
  assert.equal(renderMathText(plain).map(p => p.raw).join(''), plain);
}
const hostile = renderMathText(String.raw`$\text{<img src=x onerror=alert(1)>}$`);
assert.ok(hostile.every(p => p.type !== 'math' || !p.html?.includes('<img')), 'KaTeX text is escaped');
const link = renderMathText(String.raw`$\href{javascript:alert(1)}{bad}$`);
assert.ok(link.every(p => p.type !== 'math' || !p.html?.includes('href=')), 'untrusted links disabled');

const bankSource = String.raw`Tìm $x$ biết $x-\frac{1}{2}=\frac{3}{4}$.
A. $\frac{1}{4}$
B. $\frac{5}{4}$
C. $\sqrt{4}$
D. $x^2$`;
const parsed = parseBankQuizQuestion(bankSource, String.raw`B. Vì $x=\frac{5}{4}$.`)!;
assert.equal(parsed.correctAnswer, 'B');
assert.equal(parsed.options.B, String.raw`$\frac{5}{4}$`);
const frozen = JSON.stringify(parsed);
renderMathText(parsed.question);
Object.values(parsed.options).forEach(renderMathText);
assert.equal(JSON.stringify(parsed), frozen, 'presentation cannot mutate imported question/options/correct key');
assert.deepEqual(JSON.parse(JSON.stringify(parsed)), parsed);
console.log('PASS: 10 required math categories, ' + formulas + ' valid formulas; visible KaTeX/MathML structures, currency/escapes, invalid syntax, untrusted input and source/import/key preservation.');
