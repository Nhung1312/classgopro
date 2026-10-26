import assert from 'node:assert/strict';
import { generateKeyPair, SignJWT } from 'jose';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { verifyTeacherIdentity, verifyFirebaseAccount, requireAllowedTeacher, createAiQuota, AiRequestError } from '../server/aiAccess';
import { generateReviewQuestions } from '../server/aiGeneration';
import { createGenerateQuestionsHandler, validateGenerationInput } from '../server/generateQuestionsHandler';
import { createQuotaTestRedis } from './support/aiQuotaTestRedis';

const projectId = JSON.parse(readFileSync('firebase-applet-config.json', 'utf8')).projectId;
const { privateKey, publicKey } = await generateKeyPair('RS256');
const seconds = Math.floor(Date.now() / 1000);
const claims = { sub: 'qa-teacher', auth_time: seconds - 60, iat: seconds - 10, exp: seconds + 600,
  aud: projectId, iss: `https://securetoken.google.com/${projectId}`, email: 'qa@example.test', email_verified: true,
  firebase: { sign_in_provider: 'google.com' } };
const sign = (change: Record<string, unknown> = {}) => new SignJWT({ ...claims, ...change }).setProtectedHeader({ alg: 'RS256', kid: 'qa-key' }).sign(privateKey);
const validToken = await sign();
const verify = (token: string, project: string) => verifyTeacherIdentity(token, project, async () => publicKey);
assert.equal((await verify(validToken, projectId)).uid, 'qa-teacher');
for (const change of [{ aud: 'different-project' }, { iss: 'https://securetoken.google.com/wrong' },
  { iat: seconds + 3600 }, { auth_time: seconds + 3600 }, { auth_time: undefined }, { sub: '' },
  { exp: seconds - 60 }, { firebase: { sign_in_provider: 'anonymous' } }])
  await assert.rejects(() => sign(change).then(token => verify(token, projectId)), e => e instanceof AiRequestError && e.status === 401);
await assert.rejects(() => verify(validToken.slice(0, -8) + 'tampered', projectId), e => e instanceof AiRequestError && e.status === 401);
assert.throws(() => requireAllowedTeacher({ uid: 'qa-teacher', emailVerified: true }, {}), /Chưa cấu hình/);
requireAllowedTeacher({ uid: 'qa-teacher', emailVerified: true }, { CLASSGO_AI_TEACHER_UIDS: 'qa-teacher' });
assert.throws(() => requireAllowedTeacher({ uid: 'qa-teacher', emailVerified: false }, { CLASSGO_AI_TEACHER_UIDS: 'qa-teacher' }), e => e instanceof AiRequestError && e.status === 401);
assert.throws(() => requireAllowedTeacher({ uid: 'qa-stranger', emailVerified: true }, { CLASSGO_AI_TEACHER_UIDS: 'qa-teacher' }), e => e instanceof AiRequestError && e.status === 403);
const identity = await verify(validToken, projectId);
for (const user of [{ localId: identity.uid, emailVerified: true, disabled: true },
  { localId: identity.uid, emailVerified: false }, { localId: 'wrong-uid', emailVerified: true }])
  await assert.rejects(() => verifyFirebaseAccount(validToken, identity, 'same-project-public-key', async () => Response.json({ users: [user] })), e => e instanceof AiRequestError && e.status === 401);
await verifyFirebaseAccount(validToken, identity, 'same-project-public-key', async (url, options) => {
  assert.equal(new URL(String(url)).hostname, 'identitytoolkit.googleapis.com');
  assert.equal(options?.method, 'POST'); assert.equal(JSON.parse(String(options?.body)).idToken, validToken);
  return Response.json({ users: [{ localId: identity.uid, emailVerified: true }] });
});
await assert.rejects(() => verifyFirebaseAccount(validToken, identity, 'same-project-public-key', async () => { throw new Error('offline'); }), e => e instanceof AiRequestError && e.status === 503);

let clock = 1792972800000;
const redis = createQuotaTestRedis(() => clock);
const env = { CLASSGO_AI_ENABLED: 'true', GEMINI_API_KEY: 'qa-fake-key-not-valid', CLASSGO_AI_TEACHER_UIDS: 'qa-teacher',
  UPSTASH_REDIS_REST_URL: 'https://quota.example.test', UPSTASH_REDIS_REST_TOKEN: 'qa-fake-redis',
  CLASSGO_AI_RPM: '2', CLASSGO_AI_DAILY_LIMIT: '3', CLASSGO_AI_GLOBAL_DAILY_LIMIT: '4' };
const quota = () => createAiQuota(env, projectId, redis.send, () => clock);
const first = quota().lease('one'), simultaneous = quota().lease('one');
const parallel = await Promise.allSettled([first.beforeProviderCall(), simultaneous.beforeProviderCall()]);
assert.equal(parallel.filter(r => r.status === 'fulfilled').length, 1, 'one in-flight call per teacher across instances');
await first.release();
const second = quota().lease('one'); await second.beforeProviderCall(); await second.release();
await assert.rejects(() => quota().lease('one').beforeProviderCall(), e => e instanceof AiRequestError && e.status === 429);
clock += 61000;
const third = quota().lease('one'); await third.beforeProviderCall(); await third.release();
clock += 61000;
await assert.rejects(() => quota().lease('one').beforeProviderCall(), e => e instanceof AiRequestError && e.status === 429);
const other = quota().lease('two'); await other.beforeProviderCall(); await other.release();
await assert.rejects(() => quota().lease('three').beforeProviderCall(), e => e instanceof AiRequestError && e.status === 429, 'global daily cap');
assert.ok([...redis.values.keys()].every(k => !k.includes(':one:') && !k.includes(':two:')));
assert.throws(() => createAiQuota({}, projectId), /Chưa cấu hình/);
assert.throws(() => createAiQuota({ ...env, CLASSGO_AI_RPM: 'NaN' }, projectId), /chưa hợp lệ/);
await assert.rejects(() => createAiQuota(env, projectId, async () => { throw new Error('offline'); }).lease('one').beforeProviderCall(), e => e instanceof AiRequestError && e.status === 503);

const input = { subject: 'Toán', grade: '7', lessonName: 'Bài QA: Số hữu tỉ', count: 2, level: 'basic' as const };
let providerCalls = 0, reservations = 0;
const draft = { question: 'QA: Tính 1+1?', answer: '2', level: 'basic' as const };
const generated = await generateReviewQuestions(input, 'qa-fake', async () => { reservations++; }, new AbortController().signal, async request => {
  providerCalls++; assert.equal(request.config?.maxOutputTokens, 8192);
  return { text: JSON.stringify([draft, { ...draft, level: 'advanced' }]) };
});
assert.equal(generated.length, 1); assert.equal(reservations, 1);
providerCalls = 0; reservations = 0;
await assert.rejects(() => generateReviewQuestions(input, 'qa-fake', async () => { reservations++; }, new AbortController().signal, async request => {
  providerCalls++; assert.equal(request.model, 'gemini-flash-latest'); throw Object.assign(new Error('model missing'), { status: 404 });
}));
assert.equal(providerCalls, 1); assert.equal(reservations, 1, 'no automatic model fallback');
providerCalls = 0;
await assert.rejects(() => generateReviewQuestions(input, 'qa-fake', async () => {}, new AbortController().signal, async () => {
  providerCalls++; throw Object.assign(new Error('quota exceeded'), { status: 429 });
}));
assert.equal(providerCalls, 1, 'never retry/fallback on provider quota errors');
await assert.rejects(() => generateReviewQuestions(input, 'qa-fake', async () => { throw new AiRequestError(503, 'quota-down', 'blocked'); }, new AbortController().signal, async () => { providerCalls++; return { text: '[]' }; }));
assert.equal(providerCalls, 1, 'no provider call if quota reservation fails');
assert.equal(validateGenerationInput({ ...input, count: 20 }).count, 20, 'preserve existing 15/20-question options');
for (const invalid of [{ ...input, count: undefined }, { ...input, level: undefined }, { ...input, grade: '12' }, { ...input, count: 21 }, { ...input, count: 1.2 }, { ...input, grade: 'other' },
  { ...input, level: 'mixed' }, { ...input, customPrompt: 'x'.repeat(2001) }, { ...input, lessonName: '' }])
  assert.throws(() => validateGenerationInput(invalid), e => e instanceof AiRequestError && e.status === 400);

let generatedCalls = 0;
const handlerEnv = { ...env, CLASSGO_AI_RPM: '20', CLASSGO_AI_DAILY_LIMIT: '100', CLASSGO_AI_GLOBAL_DAILY_LIMIT: '200' };
const handlerRedis = createQuotaTestRedis(() => clock);
const makeHandler = (extra = {}) => createGenerateQuestionsHandler({ env: handlerEnv, verify,
  quota: (e, p) => createAiQuota(e, p, handlerRedis.send, () => clock),
  generate: async (_input, _key, reserve) => { await reserve(); generatedCalls++; return [draft]; }, ...extra });
async function invoke(handler: ReturnType<typeof makeHandler>, options: { method?: string; auth?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  const req = Readable.from([]) as IncomingMessage & { body?: unknown };
  req.method = options.method || 'POST'; req.headers = { host: 'classgo.example.test', 'content-type': 'application/json',
    ...(options.auth === undefined ? { authorization: `Bearer ${validToken}` } : options.auth ? { authorization: options.auth } : {}), ...options.headers };
  req.body = options.body === undefined ? input : options.body;
  const headers: Record<string, string> = {}; let responseText = '';
  const response = { statusCode: 200, setHeader: (k: string, v: unknown) => { headers[k] = String(v); }, end: (body: string) => { responseText = body; } };
  await handler(req, response as unknown as ServerResponse);
  return { status: response.statusCode, headers, body: JSON.parse(responseText), text: responseText };
}
assert.equal((await invoke(makeHandler({ env: { ...handlerEnv, CLASSGO_AI_ENABLED: 'false' } }))).body.code, 'AI_DISABLED');
assert.equal((await invoke(makeHandler(), { auth: '' })).status, 401);
assert.equal((await invoke(makeHandler(), { auth: 'Bearer forged' })).status, 401);
assert.equal((await invoke(makeHandler(), { method: 'GET' })).status, 405);
assert.equal((await invoke(makeHandler(), { headers: { origin: 'https://evil.example.test' } })).status, 403);
assert.equal((await invoke(makeHandler({ env: { ...handlerEnv, CLASSGO_AI_TEACHER_UIDS: 'another' } }))).status, 403);
assert.equal((await invoke(makeHandler({ env: { CLASSGO_AI_ENABLED: 'true', GEMINI_API_KEY: 'qa-fake' } }))).body.code, 'AI_TEACHER_CONFIG_MISSING');
assert.equal((await invoke(makeHandler({ env: { CLASSGO_AI_ENABLED: 'true', CLASSGO_AI_TEACHER_UIDS: 'qa-teacher' } }))).body.code, 'AI_KEY_CONFIG_MISSING');
assert.equal((await invoke(makeHandler({ env: { ...handlerEnv, UPSTASH_REDIS_REST_URL: '' } }))).body.code, 'AI_QUOTA_CONFIG_MISSING');
assert.equal((await invoke(makeHandler(), { body: '{not json' })).status, 400);
assert.equal((await invoke(makeHandler(), { headers: { 'content-length': '32769' } })).status, 413);
assert.equal((await invoke(makeHandler(), { headers: { 'content-type': 'text/plain' } })).status, 415);
assert.equal(generatedCalls, 0, 'all rejected requests stop before Gemini');
const ok = await invoke(makeHandler());
assert.equal(ok.status, 200); assert.equal(ok.body.questions[0].answer, '2');
assert.equal(ok.headers['Cache-Control'], 'private, no-store');
assert.ok(!ok.text.includes('qa-fake'));
const rateLimited = await invoke(makeHandler({ generate: async () => { throw new AiRequestError(429, 'AI_RATE_LIMIT', 'wait', 10); } }));
assert.equal(rateLimited.status, 429); assert.equal(rateLimited.headers['Retry-After'], '10');
const secretError = await invoke(makeHandler({ generate: async () => { throw new Error('private-key-and-provider-url'); } }));
assert.equal(secretError.status, 502); assert.ok(!secretError.text.includes('private-key'));
console.log('PASS: real JWT signatures/project/expiry/teacher checks; real Lua per-minute/day/global/concurrency reservations; provider attempts; Vercel handler validation, fail-closed paths and secret redaction. No Firebase data or Gemini requests.');
