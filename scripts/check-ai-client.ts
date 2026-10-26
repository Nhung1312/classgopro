import assert from 'node:assert/strict';
import { createAiQuestionRequester, AiQuestionRequestError } from '../src/services/aiQuestionClient';
const payload = { subject: 'Toán', grade: '7', lessonName: 'QA', count: 2, level: 'basic' };
const tokens: boolean[] = [], sent: Array<{ url: string; init: RequestInit }> = [];
const response = (status: number, data: unknown, headers = {}) => new Response(JSON.stringify(data), { status,
  headers: { 'Content-Type': 'application/json', ...headers } });
const requester = createAiQuestionRequester(async force => { tokens.push(!!force); return 'qa-firebase-id-token'; }, async (url, init) => {
  sent.push({ url: String(url), init: init! });
  return response(200, { questions: [{ question: 'QA?', answer: '2', level: JSON.parse(String(init?.body)).level }] });
});
const basic = await requester(payload);
const advanced = await requester({ ...payload, level: 'advanced' });
assert.equal(basic.questions[0].level, 'basic'); assert.equal(advanced.questions[0].level, 'advanced');
assert.deepEqual(tokens, [false, false]);
for (const request of sent) {
  assert.equal(request.url, '/api/generate-questions');
  assert.equal((request.init.headers as Record<string, string>).Authorization, 'Bearer qa-firebase-id-token');
  assert.equal(request.init.credentials, 'same-origin');
  assert.ok(!String(request.init.body).includes('token'));
}
let attempts = 0;
const refreshed: boolean[] = [];
await createAiQuestionRequester(async force => { refreshed.push(!!force); return force ? 'qa-refreshed' : 'qa-expired'; }, async (_url, init) => {
  attempts++;
  if (attempts === 1) return response(401, { error: 'expired', code: 'AI_TOKEN_EXPIRED' });
  assert.equal((init?.headers as any).Authorization, 'Bearer qa-refreshed');
  return response(200, { questions: [] });
})(payload);
assert.equal(attempts, 2); assert.deepEqual(refreshed, [false, true]);
for (const [status, code] of [[401, 'AI_AUTH_INVALID'], [403, 'AI_TEACHER_NOT_ALLOWED'], [429, 'AI_RATE_LIMIT'], [503, 'AI_QUOTA_CONFIG_MISSING']] as const) {
  let calls = 0;
  await assert.rejects(() => createAiQuestionRequester(async () => 'qa-token', async () => {
    calls++; return response(status, { error: 'Thông báo QA', code }, { 'Retry-After': '20' });
  })(payload), error => error instanceof AiQuestionRequestError && error.status === status && error.code === code && error.retryAfter === 20);
  assert.equal(calls, 1, 'never automatically replay a quota/config failure');
}
let noTokenCalls = 0;
await assert.rejects(() => createAiQuestionRequester(async () => '', async () => { noTokenCalls++; return response(200, {}); })(payload), /cần đăng nhập/);
assert.equal(noTokenCalls, 0);
await assert.rejects(() => createAiQuestionRequester(async () => 'qa-token', async () => new Response('<html>SPA</html>', { status: 200 }))(payload), /chưa đúng định dạng/);
console.log('PASS: single/batch payload contract, bearer Firebase ID token, one expired-token refresh, no quota/provider retries, and logged-out/configuration errors.');
