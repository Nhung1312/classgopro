import type { IncomingMessage, ServerResponse } from 'node:http';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };
import { AiRequestError, verifyTeacherIdentity, verifyFirebaseAccount, requireAllowedTeacher, createAiQuota, type AiQuotaLease } from './aiAccess.js';
import { generateReviewQuestions, type QuestionGenerationInput } from './aiGeneration.js';

type ApiRequest = IncomingMessage & { body?: unknown };
type HandlerDependencies = { env: NodeJS.ProcessEnv; verify: typeof verifyTeacherIdentity;
  quota: typeof createAiQuota; generate: typeof generateReviewQuestions };
const MAX_BODY_BYTES = 32768;
function text(value: unknown, name: string, max: number, required = false): string | undefined {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string' || value.length > max || required && !value.trim())
    throw new AiRequestError(400, 'AI_INVALID_REQUEST', `Thông tin ${name} chưa hợp lệ hoặc quá dài.`);
  return value.trim();
}
export function validateGenerationInput(body: unknown): QuestionGenerationInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AiRequestError(400, 'AI_INVALID_REQUEST', 'Dữ liệu tạo câu hỏi chưa hợp lệ.');
  const b = body as Record<string, unknown>;
  const subject = text(b.subject, 'môn học', 120, true)!;
  const lessonName = text(b.lessonName, 'bài học', 500, true)!;
  const grade = text(b.grade, 'khối lớp', 2, true)!;
  if (!/^[6-9]$/.test(grade)) throw new AiRequestError(400, 'AI_INVALID_REQUEST', 'Vui lòng chọn khối lớp THCS từ 6 đến 9.');
  const count = b.count;
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > 20)
    throw new AiRequestError(400, 'AI_INVALID_REQUEST', 'Mỗi lượt tạo từ 1 đến 20 câu hỏi.');
  const level = b.level;
  if (level !== 'basic' && level !== 'advanced') throw new AiRequestError(400, 'AI_INVALID_REQUEST', 'Mức độ câu hỏi chưa hợp lệ.');
  if (b.existingQuestions !== undefined && (!Array.isArray(b.existingQuestions) || b.existingQuestions.length > 25 ||
      b.existingQuestions.some(q => typeof q !== 'string' || q.length > 500)))
    throw new AiRequestError(400, 'AI_INVALID_REQUEST', 'Danh sách đối chiếu tối đa 25 câu, mỗi câu không quá 500 ký tự.');
  return { subject, grade, lessonName, count, level,
    bookSeries: text(b.bookSeries, 'bộ sách', 200), semester: text(b.semester, 'học kỳ', 10),
    sectionName: text(b.sectionName, 'chương/chủ đề', 500), customPrompt: text(b.customPrompt, 'yêu cầu thêm', 2000),
    existingQuestions: b.existingQuestions as string[] | undefined };
}
async function readBody(req: ApiRequest) {
  const length = Number(req.headers['content-length'] || 0);
  if (!Number.isFinite(length) || length < 0 || length > MAX_BODY_BYTES) throw new AiRequestError(413, 'AI_REQUEST_TOO_LARGE', 'Dữ liệu tạo câu hỏi quá lớn.');
  let body = req.body;
  if (body === undefined) {
    const chunks: Buffer[] = []; let bytes = 0;
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > MAX_BODY_BYTES) throw new AiRequestError(413, 'AI_REQUEST_TOO_LARGE', 'Dữ liệu tạo câu hỏi quá lớn.');
      chunks.push(buffer);
    }
    body = Buffer.concat(chunks).toString('utf8');
  }
  if (Buffer.isBuffer(body)) body = body.toString('utf8');
  if (typeof body === 'string') {
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) throw new AiRequestError(413, 'AI_REQUEST_TOO_LARGE', 'Dữ liệu tạo câu hỏi quá lớn.');
    try { body = JSON.parse(body); } catch { throw new AiRequestError(400, 'AI_INVALID_JSON', 'Dữ liệu JSON chưa hợp lệ.'); }
  }
  if (Buffer.byteLength(JSON.stringify(body) || '') > MAX_BODY_BYTES) throw new AiRequestError(413, 'AI_REQUEST_TOO_LARGE', 'Dữ liệu tạo câu hỏi quá lớn.');
  return body;
}
function json(res: ServerResponse, status: number, data: unknown) { res.statusCode = status; res.end(JSON.stringify(data)); }
export function createGenerateQuestionsHandler(overrides: Partial<HandlerDependencies> = {}) {
  const deps = { env: process.env, verify: async (token: string, projectId: string) =>
    verifyFirebaseAccount(token, await verifyTeacherIdentity(token, projectId), firebaseConfig.apiKey), quota: createAiQuota, generate: generateReviewQuestions, ...overrides };
  return async function handler(req: ApiRequest, res: ServerResponse) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-ClassGo-AI-Version', 'authenticated-v1');
    let lease: AiQuotaLease | undefined;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); throw new AiRequestError(405, 'AI_METHOD_NOT_ALLOWED', 'API này nhận yêu cầu POST.'); }
      if (deps.env.CLASSGO_AI_ENABLED !== 'true') throw new AiRequestError(503, 'AI_DISABLED', 'Tạo câu hỏi AI chưa được quản trị viên kích hoạt trên Vercel.');
      const origin = req.headers.origin;
      if (origin) {
        try { if (typeof origin !== 'string' || new URL(origin).host !== req.headers.host) throw new Error('Origin mismatch'); }
        catch { throw new AiRequestError(403, 'AI_ORIGIN_REJECTED', 'Nguồn gửi yêu cầu không hợp lệ.'); }
      }
      const authorization = req.headers.authorization;
      if (typeof authorization !== 'string' || authorization.length > 4096 || !/^Bearer \S+$/i.test(authorization))
        throw new AiRequestError(401, 'AI_AUTH_REQUIRED', 'Thầy cô cần đăng nhập trước khi tạo câu hỏi AI.');
      const identity = await deps.verify(authorization.slice(7), firebaseConfig.projectId);
      requireAllowedTeacher(identity, deps.env);
      if (!/^application\/json(?:\s*;|$)/i.test(String(req.headers['content-type'] || '')))
        throw new AiRequestError(415, 'AI_JSON_REQUIRED', 'Yêu cầu tạo câu hỏi phải dùng JSON.');
      const input = validateGenerationInput(await readBody(req));
      const apiKey = deps.env.GEMINI_API_KEY;
      if (!apiKey?.trim()) throw new AiRequestError(503, 'AI_KEY_CONFIG_MISSING', 'Chưa cấu hình GEMINI_API_KEY ở phía máy chủ cho môi trường này.');
      lease = deps.quota(deps.env, firebaseConfig.projectId).lease(identity.uid);
      timeout = setTimeout(() => controller.abort(), 45000);
      const questions = await deps.generate(input, apiKey, lease.beforeProviderCall, controller.signal, undefined, deps.env.CLASSGO_AI_MODEL);
      json(res, 200, { questions });
    } catch (error) {
      let failure = error instanceof AiRequestError ? error : undefined;
      if (!failure && controller.signal.aborted) failure = new AiRequestError(504, 'AI_TIMEOUT', 'Lượt tạo câu hỏi quá thời gian. Không tự gọi lại để tránh phát sinh phí.');
      if (!failure && Number((error as { status?: number }).status) === 429)
        failure = new AiRequestError(429, 'AI_PROVIDER_RATE_LIMIT', 'Gemini đang giới hạn lượt gọi. Thầy cô vui lòng chờ rồi thử lại.', 60);
      failure ||= new AiRequestError(502, 'AI_GENERATION_FAILED', 'Máy chủ AI chưa tạo được câu hỏi. Vui lòng kiểm tra cấu hình hoặc thử lại sau.');
      if (failure.retryAfter) res.setHeader('Retry-After', String(failure.retryAfter));
      json(res, failure.status, { error: failure.message, code: failure.code });
    } finally {
      if (timeout) clearTimeout(timeout);
      // A quota-store outage must not turn an already delivered answer into an unhandled rejection.
      if (lease) await lease.release().catch(() => {});
    }
  };
}
export default createGenerateQuestionsHandler();
