import { chromium } from 'playwright';
import { expect } from 'playwright/test';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';

// Fresh browser, synthetic class, every external request blocked before the app starts.
const port = 4173;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port)], { stdio: 'pipe' });
let browser;
try {
  for (let i = 0; i < 80; i++) {
    try { const response = await fetch(`http://127.0.0.1:${port}`); if (response.ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  browser = await chromium.launch({ headless: true, ...(process.env.CLASSGO_CHROME_PATH ? { executablePath: process.env.CLASSGO_CHROME_PATH } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const externalRequests = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' && url.port === String(port)) return route.continue();
    externalRequests.push({ host: url.hostname, method: route.request().method() });
    return route.abort();
  });
  const question = { id: 'qa-question', question: '2+2?', options: { A: '1', B: '2', C: '3', D: '4' }, correctAnswer: 'D' };
  const cls = { id: 'qa-class', name: '7A9', subject: 'Toán', createdAt: '2026-10-25T00:00:00Z',
    students: [{ id: 's1', name: 'QA Một', studentCode: 'QA01', callCount: 3, scores: { tx1: 0 } }, { id: 's2', name: 'QA Hai', studentCode: 'QA02', callCount: 5 }],
    questions: Array.from({ length: 4 }, (_, i) => ({ id: `qa-review-${i}`, content: '2+2?\nA. 1\nB. 2\nC. 3\nD. 4', suggestedAnswer: 'D', lesson: 'Bài QA', chapter: 'Chương QA', reviewLevel: 'basic' })) };
  const session = { id: 'qa-quiz', classId: cls.id, className: cls.name, subject: 'Toán', title: 'QA Quiz',
    createdAt: cls.createdAt, updatedAt: cls.createdAt, currentQuestionIndex: 0, status: 'completed', sessionPin: '123456',
    questions: [question], results: [{ questionId: question.id, question, status: 'locked', startedAt: 1,
      answers: { s1: { studentId: 's1', studentName: 'QA Một', cardId: 1, selectedOption: 'D', isCorrect: true, timestamp: 1 } } }] };
  await context.addInitScript(({ cls, session }) => {
    if (localStorage.getItem('qa-seeded')) return;
    localStorage.setItem('classgo_classes_v1', JSON.stringify([cls]));
    localStorage.setItem('classgo_active_class_id_v1', cls.id);
    localStorage.setItem('classgo_history_v1', '[]');
    localStorage.setItem('classgo_settings_v1', JSON.stringify({ spinDuration: 300, soundEnabled: false, ttsEnabled: false, confettiEnabled: false }));
    localStorage.setItem('classgo_response_card_sessions_v1', JSON.stringify([session]));
    localStorage.setItem('classgo_response_active_session_id_v1', session.id);
    localStorage.setItem('qa-seeded', 'true');
  }, { cls, session });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}`);
  console.log('Browser: app loaded');
  const notice = page.getByRole('button', { name: 'Đóng thông báo', exact: true });
  await notice.waitFor({ state: 'visible', timeout: 3000 }).then(() => notice.click()).catch(() => {});
  await expect(page.getByRole('button', { name: 'Thẻ Trả Lời', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Thẻ Trả Lời', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đồng bộ hai thiết bị' })).toBeVisible();
  console.log('Browser: cards opened');
  const pdfDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất File PDF' }).click();
  const pdf = await pdfDownload;
  console.log('Browser: PDF downloaded');
  assert.equal((await readFile(await pdf.path())).subarray(0, 5).toString(), '%PDF-');
  await page.getByRole('button', { name: /2\./ }).click();
  await page.getByRole('button', { name: 'Kết quả', exact: true }).click();
  const excelDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất Bảng Điểm Excel' }).click();
  const excel = await excelDownload;
  console.log('Browser: Excel downloaded');
  assert.ok(XLSX.read(await readFile(await excel.path()), { type: 'buffer' }).SheetNames.length >= 2);
  await page.getByRole('button', { name: 'Quay Tên', exact: true }).click();
  await page.locator('#spin-trigger-btn').click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('classgo_classes_v1'))[0].students[0].callCount)).toBe(4);
  console.log('Browser: spin counted');
  await page.getByRole('button', { name: /Ô cửa bí mật/ }).first().click();
  // The adapter puts class banks first, before optional built-in banks.
  await page.getByRole('button', { name: 'BẮT ĐẦU MỞ CỬA', exact: true }).first().click();
  await page.getByRole('button', { name: '2 ô', exact: true }).click();
  await page.getByRole('button', { name: /BẮT ĐẦU MỞ 2 Ô CỬA/ }).click();
  await page.getByRole('button').filter({ hasText: /Ô CỬA/ }).filter({ hasText: /Bấm để mở/ }).first().click();
  await page.getByPlaceholder('Điểm khác...').fill('8.5');
  await page.getByRole('button', { name: 'Chỉ lưu vào Lịch sử', exact: true }).click();
  const saved = await page.evaluate(() => ({ classes: JSON.parse(localStorage.getItem('classgo_classes_v1')), history: JSON.parse(localStorage.getItem('classgo_history_v1')) }));
  assert.equal(saved.classes[0].students[0].scores.tx1, 0);
  assert.equal(saved.classes[0].students[0].scores.tx2, undefined);
  assert.equal(saved.history.filter(h => h.recordType === 'MYSTERY_DOOR').length, 1);
  await page.getByRole('button', { name: 'Ghi điểm vào Sổ điểm TX', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận ghi điểm', exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('classgo_classes_v1'))[0].students[0].scores.tx2)).toBe(8.5);
  await page.getByRole('button', { name: /Thưởng 1 sao/ }).click();
  await page.getByRole('button', { name: /Thưởng 1 sao/ }).click();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('classgo_classes_v1'))[0].students[0].stars), 1);
  await page.getByTitle('Đóng Ô Cửa Bí Mật').click();
  await page.getByRole('button', { name: 'TKB & Báo Giảng', exact: true }).click();
  await page.getByRole('button', { name: /Sổ Báo Giảng & Tiến Độ/ }).click();
  const templateDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Mẫu PPCT (.xlsx)', exact: true }).click();
  const template = await templateDownload;
  assert.deepEqual(XLSX.read(await readFile(await template.path()), { type: 'buffer' }).SheetNames, ['PPCT', 'VI_DU_KHONG_NHAP', 'HUONG_DAN']);
  // Regression: preserve imported A/B/C/D keys; unresolved answers need an explicit teacher choice.
  await page.evaluate(() => {
    const bank = { id: 'qa-answer-bank', ownerId: 'local_teacher', subject: 'Toán', grade: '7',
      lessonId: 'qa-answer-lesson', lessonName: 'QA kiểm tra đáp án', sectionName: 'QA',
      createdAt: '2026-10-26', updatedAt: '2026-10-26' };
    const answers = ['A', 'Đáp án đúng: B', 'Chọn phương án C', 'D)', 'Chưa rõ', 'A hoặc B'];
    const questions = answers.map((answer, i) => ({ id: `qa-key-${i}`, bankId: bank.id, level: 'basic', source: 'manual',
      question: `Câu kiểm tra ${i + 1}?\nA. Một\nB. Hai\nC. Ba\nD. Bốn`, answer }));
    localStorage.setItem('classgo_review_banks_v1_local_teacher', JSON.stringify([bank]));
    localStorage.setItem('classgo_review_questions_v1_local_teacher', JSON.stringify(questions));
  });
  await page.getByRole('button', { name: 'Thẻ Trả Lời', exact: true }).click();
  await page.getByRole('button', { name: /2\./ }).click();
  await page.getByRole('button', { name: 'Tạo Bài Kiểm Tra Mới', exact: true }).click();
  await page.getByRole('button', { name: 'Chế độ B: Lấy từ Kho KT bài cũ', exact: true }).click();
  for (let i = 1; i <= 6; i++) await page.getByRole('checkbox', { name: `Chọn câu hỏi ${i} từ kho`, exact: true }).check();
  await page.getByRole('button', { name: 'Lấy vào phiên (6)', exact: true }).click();
  for (const [idx, key] of ['A', 'B', 'C', 'D'].entries()) {
    const group = page.getByRole('group', { name: `Đáp án đúng câu ${idx + 1}`, exact: true });
    await expect(group.getByRole('button', { name: `Câu ${idx + 1}: chọn đáp án ${key}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  }
  for (const idx of [5, 6]) {
    const group = page.getByRole('group', { name: `Đáp án đúng câu ${idx}`, exact: true });
    assert.equal(await group.locator('[aria-pressed="true"]').count(), 0, 'unresolved answer must not default to A');
  }
  const startQuiz = page.getByRole('button', { name: 'BẮT ĐẦU BUỔI KIỂM TRA', exact: true });
  await expect(startQuiz).toBeDisabled();
  await page.getByRole('button', { name: 'Câu 5: chọn đáp án D', exact: true }).click();
  await expect(startQuiz).toBeDisabled();
  await page.getByRole('button', { name: 'Câu 6: chọn đáp án B', exact: true }).click();
  await expect(startQuiz).toBeEnabled();
  await startQuiz.click();
  const importedQuiz = await page.evaluate(() => JSON.parse(localStorage.getItem('classgo_response_card_sessions_v1')).find(s => s.questions.length === 6));
  assert.ok(importedQuiz);
  assert.deepEqual(importedQuiz.questions.map(q => q.correctAnswer), ['A', 'B', 'C', 'D', 'D', 'B']);
  assert.equal(importedQuiz.questions[1].options.B, 'Hai');
  console.log('PASS: browser bank import preserves A/B/C/D; unknown/ambiguous keys stay unselected and block the quiz until each teacher choice is saved.');
  // Arena regressions: invalid repairs must be complete; real score banners
  // must reflect base, final-question multiplier and speed bonus per team.
  const arenaPage = await context.newPage();
  arenaPage.on('pageerror', (error) => errors.push(error.message));
  await arenaPage.goto(`http://127.0.0.1:${port}`);
  const arenaNotice = arenaPage.getByRole('button', { name: 'Đóng thông báo', exact: true });
  await arenaNotice.waitFor({ state: 'visible', timeout: 1500 }).then(() => arenaNotice.click()).catch(() => {});
  await arenaPage.getByRole('button', { name: 'Đấu Trường 2 Đội', exact: true }).click();

  const arenaBankPicker = arenaPage.locator('select:has(option[value="qa-answer-bank"])');
  await arenaBankPicker.selectOption('qa-answer-bank');
  await expect(arenaPage.getByRole('button', { name: 'Bổ sung đáp án' }).first()).toBeVisible();
  const initiallyInvalid = await arenaPage.getByRole('button', { name: 'Bổ sung đáp án' }).count();
  await arenaPage.getByRole('button', { name: 'Bổ sung đáp án' }).first().click();
  const fixDialog = arenaPage.locator('div.fixed.inset-0.z-60').last();
  const saveRepair = fixDialog.getByRole('button', { name: 'Xác nhận & Sử dụng' });
  await expect(saveRepair).toBeDisabled(); // Missing teacher-confirmed answer key, never assume A.
  await fixDialog.getByRole('button', { name: 'B', exact: true }).click();
  await expect(saveRepair).toBeEnabled();
  const stemInput = fixDialog.locator('textarea');
  const originalStem = await stemInput.inputValue();
  await stemInput.fill('  ');
  await expect(saveRepair).toBeDisabled();
  await stemInput.fill(originalStem);
  const optionA = fixDialog.locator('input[type="text"]').first();
  const originalA = await optionA.inputValue();
  await optionA.fill('  ');
  await expect(saveRepair).toBeDisabled();
  await optionA.fill(originalA);
  await expect(saveRepair).toBeEnabled();
  await saveRepair.click();
  await expect(arenaPage.getByRole('button', { name: 'Bổ sung đáp án' })).toHaveCount(initiallyInvalid - 1);

  await arenaBankPicker.selectOption('SAMPLE');
  await arenaPage.locator('select:has(option[value="3"])').selectOption('3');
  await arenaPage.locator('select:has(option[value="0"])').selectOption('0');
  await arenaPage.getByText('Thưởng tốc độ (+5đ):', { exact: true }).locator('..').getByRole('button').click();
  await arenaPage.getByRole('button', { name: /BẮT ĐẦU ĐẤU TRƯỜNG/ }).click();
  await expect(arenaPage.getByText('CÂU 1 / 3')).toBeVisible();

  let arenaChoices = arenaPage.locator('button[style*="manipulation"]');
  await expect(arenaChoices).toHaveCount(8);
  await arenaChoices.nth(0).click(); // Team 1 locks A
  await expect(arenaChoices.nth(4)).toBeEnabled(); // Team 2 still answers independently
  await arenaPage.waitForTimeout(180);
  await arenaChoices.nth(4).click(); // Team 2 locks A; team 1 earns speed bonus
  await expect(arenaPage.getByText(/CHÍNH XÁC \(\+15đ\)/)).toBeVisible();
  await expect(arenaPage.getByText(/CHÍNH XÁC \(\+10đ\)/)).toBeVisible();
  await arenaPage.getByRole('button', { name: /CÂU TIẾP THEO/ }).click();
  await arenaPage.getByTitle('Công bố đáp án ngay lập tức').click(); // Skip question 2
  await arenaPage.getByRole('button', { name: /CÂU TIẾP THEO/ }).click();
  await expect(arenaPage.getByText('CÂU 3 / 3')).toBeVisible();
  await expect(arenaPage.getByText('x2 ĐIỂM')).toBeVisible();
  arenaChoices = arenaPage.locator('button[style*="manipulation"]');
  await arenaChoices.nth(2).click(); // C is correct for sample question 3
  await expect(arenaChoices.nth(6)).toBeEnabled();
  await arenaPage.waitForTimeout(180);
  await arenaChoices.nth(6).click();
  await expect(arenaPage.getByText(/CHÍNH XÁC \(\+25đ\)/)).toBeVisible();
  await expect(arenaPage.getByText(/CHÍNH XÁC \(\+20đ\)/)).toBeVisible();
  await arenaPage.close();
  console.log('PASS: Arena repaired question blocks blank fields/implicit A; two independent pods score +10/+15 and double-final +20/+25.');

  assert.deepEqual(errors, []);
  console.log('PASS: browser navigation, actual PDF/Excel/template downloads, spin counter, legacy-bank mystery assessment, history-only/TX confirmation, zero protection and star deduplication.');
  console.log(`External requests blocked: ${externalRequests.length}. No Firebase/Gemini request allowed.`);
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
