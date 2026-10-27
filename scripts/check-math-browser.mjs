import { chromium } from 'playwright';
import { expect } from 'playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { seed, quizQuestions, stems } from './fixtures/math-questions.mjs';

const port = 4174;
const base = process.env.CLASSGO_MATH_PREVIEW_URL || 'http://127.0.0.1:' + port;
const server = process.env.CLASSGO_MATH_PREVIEW_URL ? null : spawn(process.execPath,
  ['node_modules/vite/bin/vite.js', 'preview', ...(process.env.CLASSGO_MATH_DIST ? ['--outDir', process.env.CLASSGO_MATH_DIST] : []), '--host', '127.0.0.1', '--port', String(port)], { stdio: 'pipe' });
const output = process.env.CLASSGO_MATH_SCREENSHOTS;
if (output) await mkdir(output, { recursive: true });
let browser, activePage;
const failures = [], external = [];
try {
  if (server) for (let i = 0; i < 80; i++) {
    try { if ((await fetch(base)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  browser = await chromium.launch({ headless: true,
    ...(process.env.CLASSGO_CHROME_PATH ? { executablePath: process.env.CLASSGO_CHROME_PATH } : {}),
    args: [
      ...(process.env.CLASSGO_CHROME_PATH ? ['--disable-gpu'] : [])] });
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    // Never touch actual accounts or data, including when pointed at a Preview.
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === new URL(base).origin && !url.pathname.startsWith('/api/')) return route.continue();
      external.push(url.hostname + url.pathname);
      return route.abort();
    });
    await context.addInitScript(({ cls, bank, bankQuestions, session }) => {
      // Rendering checks do not need camera access. Detector image regressions run separately.
      if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException('Camera isolated during rendering test', 'NotAllowedError');
      };
      if (localStorage.getItem('qa-math-seeded')) return;
      localStorage.clear();
      localStorage.setItem('classgo_seen_classgo-2026-10-spin-visuals-v1', '1');
      localStorage.setItem('classgo_classes_v1', JSON.stringify([cls]));
      localStorage.setItem('classgo_active_class_id_v1', cls.id);
      localStorage.setItem('classgo_history_v1', '[]');
      localStorage.setItem('classgo_settings_v1', JSON.stringify({ spinDuration: 300, soundEnabled: false, ttsEnabled: false, confettiEnabled: false }));
      localStorage.setItem('classgo_response_card_sessions_v1', JSON.stringify([session]));
      localStorage.setItem('classgo_response_active_session_id_v1', session.id);
      localStorage.setItem('classgo_review_banks_v1_local_teacher', JSON.stringify([bank]));
      localStorage.setItem('classgo_review_questions_v1_local_teacher', JSON.stringify(bankQuestions));
      localStorage.setItem('qa-math-seeded', 'true');
    }, seed);
    const page = await context.newPage(); activePage = page;
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => failures.push(error.message));
    const shot = async name => {
      console.log('Math browser: ' + viewport.width + 'px ' + name);
      if (output && ['bank', 'projector', 'long-formula', 'before-projector'].includes(name))
        await page.screenshot({ path: output + '/' + viewport.width + '-' + name + '.png', animations: 'disabled', timeout: 5000 })
          .catch(error => console.log('Optional screenshot unavailable: ' + error.message.split('\n')[0]));
    };
    const assertMath = async (locator, count = 1) => {
      await expect.poll(() => locator.locator('.katex-html').count()).toBeGreaterThanOrEqual(count);
      await locator.locator('.katex-html').first().scrollIntoViewIfNeeded();
      await expect(locator.locator('.katex-html').first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const boxes = await locator.locator('.katex-html').evaluateAll(nodes => nodes.map(node => {
        const r = node.getBoundingClientRect();
        return { width: r.width, height: r.height, font: getComputedStyle(node).fontFamily };
      }));
      assert.ok(boxes.every(box => box.width > 0 && box.height > 0 && /KaTeX/.test(box.font)), 'real visible glyph layout, not source text in HTML');
    };
    await page.goto(base);
    const notice = page.getByRole('button', { name: 'Đóng thông báo', exact: true });
    await notice.waitFor({ state: 'visible', timeout: 2000 }).then(() => notice.click()).catch(() => {});
    if (process.env.CLASSGO_MATH_BASELINE) {
      await page.getByRole('button', { name: 'Thẻ Trả Lời', exact: true }).click();
      await page.getByRole('button', { name: /Quét Camera/ }).click();
      await page.getByTitle('Mở màn hình trình chiếu câu hỏi cho cả lớp', { exact: true }).click();
      await shot('before-projector');
      await context.close();
      continue;
    }
    await page.getByRole('button', { name: /Kho KT Bài Cũ/i }).first().click();
    await assertMath(page, 30);
    assert.ok(await page.locator('.katex-html .mfrac').count() > 5);
    assert.ok(await page.locator('.katex-html .sqrt').count() > 3);
    assert.ok(await page.locator('.katex-html .msupsub').count() > 3);
    await expect(page.locator('[data-math-error]')).toHaveCount(2);
    await expect(page.getByText(stems[9], { exact: false }).first()).toBeVisible();
    await shot('bank');
    // Review-bank editing still exposes exact original source, not generated HTML.
    await page.getByTitle('Sửa câu hỏi', { exact: true }).first().click();
    assert.equal(await page.locator('textarea').first().inputValue(), seed.bankQuestions[0].question);
    await page.getByRole('button', { name: 'Hủy', exact: true }).last().click();

    await page.getByRole('button', { name: 'Thẻ Trả Lời', exact: true }).click();
    await page.getByRole('button', { name: /2\./ }).click();
    await page.getByRole('button', { name: 'Tạo Bài Kiểm Tra Mới', exact: true }).click();
    const manual = page.getByPlaceholder('Nhập nội dung câu hỏi trắc nghiệm...');
    await manual.fill(stems[0]);
    for (const option of ['A', 'B', 'C', 'D']) await page.getByPlaceholder('Phương án ' + option + '...').fill(quizQuestions[0].options[option]);
    await assertMath(page.getByTestId('manual-math-preview'), 5);
    assert.equal(await manual.inputValue(), stems[0], 'preview never alters the typed LaTeX');
    await shot('manual');
    await page.getByRole('button', { name: 'Chế độ B: Lấy từ Kho KT bài cũ', exact: true }).click();
    await assertMath(page.locator('div.fixed').last(), 30);
    for (let i = 1; i <= quizQuestions.length; i++) await page.getByRole('checkbox', { name: 'Chọn câu hỏi ' + i + ' từ kho', exact: true }).check();
    await page.getByRole('button', { name: 'Lấy vào phiên (' + quizQuestions.length + ')', exact: true }).click();
    await assertMath(page.locator('div.fixed').last(), 30);
    await expect(page.locator('[data-math-error]')).toHaveCount(2);
    await shot('selected');
    await page.getByRole('button', { name: 'BẮT ĐẦU BUỔI KIỂM TRA', exact: true }).click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('classgo_response_card_sessions_v1')).find(s => s.id !== 'qa-math-session'));
    assert.equal(saved.questions[0].question, stems[0]);
    assert.equal(saved.questions[0].options.B, quizQuestions[0].options.B);
    assert.ok(saved.questions.every(q => q.correctAnswer === 'B'), 'answer keys preserved');
    await assertMath(page.locator('h3').filter({ hasText: 'Tìm x biết' }), 1);
    await assertMath(page, 5);
    await shot('scanner');
    await page.getByTitle('Mở màn hình trình chiếu câu hỏi cho cả lớp', { exact: true }).click();
    const projector = page.locator('div.fixed').filter({ has: page.locator('main h2') }).last();
    await assertMath(projector, 5);
    await expect(projector.locator('footer')).toBeInViewport();
    await expect(projector.locator('main h2 .mfrac').first()).toBeVisible();
    await shot('projector');
    await projector.getByRole('button', { name: 'KẾT THÚC THU BÀI & CÔNG BỐ ĐÁP ÁN', exact: true }).click();
    await assertMath(projector.locator('main').getByText('Giải thích:', { exact: true }).locator('..'), 2);
    await expect(projector.locator('footer')).toBeInViewport();
    await shot('explanation');
    // Long display formula stays inside its own scroll region; controls stay fixed.
    for (let i = 1; i < quizQuestions.length; i++) await projector.getByRole('button', { name: 'Câu tiếp theo', exact: true }).click();
    await assertMath(projector.locator('main h2'), 1);
    await expect(projector.locator('footer')).toBeInViewport();
    const overflow = await projector.locator('.math-display').evaluate(node => ({
      width: node.clientWidth, scroll: node.scrollWidth, viewport: innerWidth, right: node.getBoundingClientRect().right,
    }));
    assert.ok(overflow.width > 0 && overflow.right <= viewport.width + 2);
    if (viewport.width < 600) assert.ok(overflow.scroll > overflow.width, 'long formula has local horizontal scroll');
    await shot('long-formula');
    await page.getByTitle('Đóng trình chiếu', { exact: true }).click();
    await page.getByRole('button', { name: /4\./ }).click();
    await assertMath(page, 30);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Xuất Bảng Điểm Excel', exact: true }).click();
    assert.match((await download).suggestedFilename(), /\.xlsx$/);
    await shot('results');
    const invariant = await page.evaluate(() => ({
      questions: JSON.parse(localStorage.getItem('classgo_review_questions_v1_local_teacher')),
      cls: JSON.parse(localStorage.getItem('classgo_classes_v1'))[0],
    }));
    assert.deepEqual(invariant.questions.filter(q => q.bankId === seed.bank.id), seed.bankQuestions, 'bank contents remain exact');
    assert.deepEqual(invariant.cls.students.map(({ id, studentCode, callCount, scores }) => ({ id, studentCode, callCount, scores })), seed.cls.students.map(({ id, studentCode, callCount, scores }) => ({ id, studentCode, callCount, scores })), 'no score/call-count/student changes');
    await context.close();
    console.log('PASS: ' + viewport.width + 'px bank/create/manual/scanner/projector/explanation/results; real fractions/radicals/powers; source and score invariants; long formula scroll + controls.');
  }
  assert.deepEqual(failures, []);
  console.log('PASS: math browser checks; all Firebase/Gemini and other external requests blocked (' + external.length + ').');
} catch (error) {
  if (output && activePage && !activePage.isClosed()) await activePage.screenshot({ path: output + '/failed.png' }).catch(() => {});
  throw error;
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}
