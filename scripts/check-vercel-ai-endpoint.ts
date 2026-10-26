import assert from 'node:assert/strict';
import handler from '../api/generate-questions';
import type { IncomingMessage, ServerResponse } from 'node:http';

type Reply = { status: number; data: any; headers: Record<string, string> };
async function invoke(method: string, headers: Record<string, string> = {}): Promise<Reply> {
  const result: Reply = { status: 200, data: null, headers: {} };
  const res = {
    statusCode: 200,
    setHeader(key: string, value: string) { result.headers[key] = value; return this; },
    end(text: string) { result.status = this.statusCode; result.data = JSON.parse(text); },
  };
  await handler({
    method,
    headers,
    body: { subject: 'Toán', grade: '7', lessonName: 'Số hữu tỉ', count: 2, level: 'basic' },
  } as unknown as IncomingMessage, res as unknown as ServerResponse);
  return result;
}
const savedEnabled = process.env.CLASSGO_AI_ENABLED;
const savedKey = process.env.GEMINI_API_KEY;
const savedAllowed = process.env.CLASSGO_AI_TEACHER_UIDS;
try {
  process.env.CLASSGO_AI_ENABLED = 'false';
  assert.equal((await invoke('POST')).status, 503, 'API fails closed by default');
  const get = await invoke('GET');
  assert.equal(get.status, 405, 'GET must never call Gemini');
  assert.equal(get.headers.Allow, 'POST');
  process.env.CLASSGO_AI_ENABLED = 'true';
  process.env.GEMINI_API_KEY = 'fake-test-key-never-sent';
  process.env.CLASSGO_AI_TEACHER_UIDS = 'teacher-test-uid';
  assert.equal((await invoke('POST')).status, 401, 'unauthenticated calls are blocked');
  assert.equal((await invoke('POST', { authorization: 'Bearer bad' })).status, 401, 'invalid bearer is blocked');
  console.log('PASS: Vercel API route method, disabled-state, no-key-cost and auth guards');
} finally {
  if (savedEnabled === undefined) delete process.env.CLASSGO_AI_ENABLED; else process.env.CLASSGO_AI_ENABLED = savedEnabled;
  if (savedKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = savedKey;
  if (savedAllowed === undefined) delete process.env.CLASSGO_AI_TEACHER_UIDS; else process.env.CLASSGO_AI_TEACHER_UIDS = savedAllowed;
}
