import { strict as assert } from 'node:assert';
import { parseCorrectLetter, parseMultipleChoice } from '../src/utils/reviewQuestionChoices';
const math = String.raw`Tính $\dfrac7{10}+\left(-\dfrac35\right)$.
A. $\dfrac1{10}$
B. $\dfrac45$
C. $-\dfrac1{10}$
D. $\dfrac12$`;
const quiz = parseMultipleChoice(math, String.raw`A. $\dfrac7{10}-\dfrac35=\dfrac1{10}$`);
assert.ok(quiz);
assert.equal(quiz.stem, String.raw`Tính $\dfrac7{10}+\left(-\dfrac35\right)$.`);
assert.equal(quiz.options[2].content, String.raw`$-\dfrac1{10}$`);
assert.equal(quiz.correctLetter, 'A');
assert.equal(parseCorrectLetter('Đáp án: D. x=1'), 'D');
assert.equal(parseMultipleChoice('Giải x + 2 = 3', 'x=1'), null);
assert.equal(parseMultipleChoice('Tính 2+2\nA. 1\nB. 2\nC. 4', 'C'), null);
assert.equal(parseMultipleChoice('Tính 2+2\nA. 1\nB. 2\nB. 3\nD. 4', 'D'), null);
const splitLine = parseMultipleChoice('Tính 2+2<br/>A. 1<br>B. 2<br/>C. 4<br>D. 6','C. 4');
assert.ok(splitLine);
assert.equal(splitLine.options.length, 4);
assert.equal(parseMultipleChoice('Tính 2+2\nA. 1\nB. 2\nC. 4\nD. 6')?.correctLetter, null);
console.log('Review question A-D parser verified, including LaTeX and non-MCQ fallback.');
