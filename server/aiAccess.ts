import { createHash, randomUUID } from 'node:crypto';
import { importX509, jwtVerify, type JWTVerifyGetKey } from 'jose';

export class AiRequestError extends Error {
  constructor(public status: number, public code: string, message: string, public retryAfter?: number) { super(message); }
}
export type TeacherIdentity = { uid: string; email?: string; emailVerified: boolean };
const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let certificateCache: { expires: number; certificates: Record<string, string> } | undefined;
let certificateRequest: Promise<Record<string, string>> | undefined;
async function getCertificates() {
  if (certificateCache && certificateCache.expires > Date.now()) return certificateCache.certificates;
  if (!certificateRequest) certificateRequest = (async () => {
    const response = await fetch(CERTS_URL, { signal: AbortSignal.timeout(5000), redirect: 'error' });
    if (!response.ok) throw new Error('Certificate service unavailable');
    const certificates = await response.json();
    if (!certificates || typeof certificates !== 'object' || Array.isArray(certificates)) throw new Error('Invalid certificate response');
    const seconds = Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1] || 300);
    certificateCache = { certificates, expires: Date.now() + Math.min(seconds, 86400) * 1000 };
    return certificates as Record<string, string>;
  })().finally(() => { certificateRequest = undefined; });
  return certificateRequest;
}
const googleCertificateKey: JWTVerifyGetKey = async header => {
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || header.kid.length > 200) throw new Error('Invalid signing key');
  const certificates = await getCertificates();
  if (!Object.hasOwn(certificates, header.kid)) throw new Error('Unknown signing key');
  return importX509(certificates[header.kid], 'RS256');
};

/** Verify Firebase identity without service-account credentials or any Firestore access. */
export async function verifyTeacherIdentity(token: string, projectId: string, key: JWTVerifyGetKey = googleCertificateKey): Promise<TeacherIdentity> {
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['RS256'], audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`, requiredClaims: ['sub', 'iat', 'exp', 'auth_time'] });
    const now = Math.floor(Date.now() / 1000);
    if (!payload.sub || payload.sub.length > 128 || typeof payload.iat !== 'number' || payload.iat > now ||
        typeof payload.auth_time !== 'number' || payload.auth_time > now || payload.auth_time < 0 ||
        (payload.firebase as Record<string, unknown> | undefined)?.sign_in_provider === 'anonymous') throw new Error('Invalid identity claims');
    return { uid: payload.sub, email: typeof payload.email === 'string' ? payload.email : undefined,
      emailVerified: payload.email_verified === true };
  } catch (error) {
    const expired = (error as { code?: string }).code === 'ERR_JWT_EXPIRED';
    throw new AiRequestError(401, expired ? 'AI_TOKEN_EXPIRED' : 'AI_AUTH_INVALID', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Thầy cô vui lòng đăng nhập lại.');
  }
}
/** Preserve the live disabled-account/email check, using only ClassGo's existing Firebase project. */
export async function verifyFirebaseAccount(token: string, identity: TeacherIdentity, apiKey: string, send: typeof fetch = fetch) {
  let response: globalThis.Response;
  try {
    response = await send('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(apiKey), {
      method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }), signal: AbortSignal.timeout(5000),
    });
  } catch { throw new AiRequestError(503, 'AI_AUTH_UNAVAILABLE', 'Chưa kiểm tra được tài khoản giáo viên. Chưa gọi Gemini.'); }
  if (!response.ok) throw new AiRequestError(401, 'AI_AUTH_INVALID', 'Phiên đăng nhập không hợp lệ. Thầy cô vui lòng đăng nhập lại.');
  const data = await response.json() as { users?: Array<{ localId?: string; disabled?: boolean; emailVerified?: boolean }> };
  const user = data.users?.[0];
  if (!user || user.localId !== identity.uid || user.disabled || user.emailVerified !== true)
    throw new AiRequestError(401, 'AI_AUTH_INVALID', 'Tài khoản chưa hợp lệ hoặc email chưa được xác minh.');
  return identity;
}
export function requireAllowedTeacher(identity: TeacherIdentity, env: NodeJS.ProcessEnv) {
  const list = (value?: string) => (value || '').split(',').map(s => s.trim()).filter(Boolean);
  const uids = list(env.CLASSGO_AI_TEACHER_UIDS);
  if (!uids.length) throw new AiRequestError(503, 'AI_TEACHER_CONFIG_MISSING', 'Chưa cấu hình danh sách giáo viên được phép dùng AI cho môi trường này.');
  if (!identity.emailVerified) throw new AiRequestError(401, 'AI_AUTH_INVALID', 'Email giáo viên chưa được xác minh.');
  if (!uids.includes(identity.uid)) throw new AiRequestError(403, 'AI_TEACHER_NOT_ALLOWED', 'Tài khoản này chưa được cấp quyền tạo câu hỏi AI.');
}

// Atomic reservation across all serverless instances/deployments using this project's Redis.
// Counters are per provider attempt; reservations are never refunded after an error.
export const RESERVE_AI_QUOTA_LUA = `
local lock = redis.call('GET', KEYS[4])
if ARGV[7] == '1' then
  if lock then return {0, math.max(1, redis.call('TTL', KEYS[4])), 'busy'} end
elseif lock ~= ARGV[6] then return {0, 1, 'lease'} end
for i = 1, 3 do
  if tonumber(redis.call('GET', KEYS[i]) or '0') >= tonumber(ARGV[i]) then
    return {0, math.max(1, redis.call('TTL', KEYS[i])), 'limit'}
  end
end
for i = 1, 3 do
  local n = redis.call('INCR', KEYS[i])
  if n == 1 then redis.call('EXPIRE', KEYS[i], i == 1 and ARGV[4] or ARGV[5]) end
end
if ARGV[7] == '1' then redis.call('SET', KEYS[4], ARGV[6], 'EX', 90) end
return {1, 0, 'ok'}
`;
export const RELEASE_AI_QUOTA_LUA = `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0`;
export type AiQuotaLease = { beforeProviderCall: () => Promise<void>; release: () => Promise<void> };
export function createAiQuota(env: NodeJS.ProcessEnv, projectId: string, send: typeof fetch = fetch, now: () => number = Date.now) {
  const useUpstash = !!(env.UPSTASH_REDIS_REST_URL || env.UPSTASH_REDIS_REST_TOKEN);
  const endpoint = useUpstash ? env.UPSTASH_REDIS_REST_URL : env.KV_REST_API_URL;
  const token = useUpstash ? env.UPSTASH_REDIS_REST_TOKEN : env.KV_REST_API_TOKEN;
  if (!endpoint || !token) throw new AiRequestError(503, 'AI_QUOTA_CONFIG_MISSING', 'Chưa cấu hình bộ đếm hạn mức AI dùng chung. API tạm dừng để bảo vệ khóa trả phí.');
  let url: URL;
  try { url = new URL(endpoint); } catch { throw new AiRequestError(503, 'AI_QUOTA_CONFIG_MISSING', 'Cấu hình bộ đếm hạn mức AI chưa hợp lệ.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
    throw new AiRequestError(503, 'AI_QUOTA_CONFIG_MISSING', 'Bộ đếm hạn mức AI phải dùng địa chỉ HTTPS an toàn.');
  const limit = (key: string, fallback: number, max: number) => {
    const n = env[key] === undefined ? fallback : Number(env[key]);
    if (!Number.isInteger(n) || n < 1 || n > max) throw new AiRequestError(503, 'AI_LIMIT_CONFIG_INVALID', 'Cấu hình hạn mức AI chưa hợp lệ.');
    return n;
  };
  const limits = [limit('CLASSGO_AI_RPM', 20, 60), limit('CLASSGO_AI_DAILY_LIMIT', 100, 1000), limit('CLASSGO_AI_GLOBAL_DAILY_LIMIT', 200, 2000)];
  const namespace = `classgo:ai:${projectId}`;
  async function command(parts: (string | number)[]) {
    try {
      const response = await send(url.toString(), { method: 'POST', redirect: 'error',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(parts), signal: AbortSignal.timeout(4000) });
      const data = await response.json();
      if (!response.ok || data.error || data.result === undefined) throw new Error('Quota command failed');
      return data.result;
    } catch { throw new AiRequestError(503, 'AI_QUOTA_UNAVAILABLE', 'Không kiểm tra được hạn mức AI. Chưa gọi Gemini; thầy cô vui lòng thử lại sau.'); }
  }
  return {
    lease(uid: string): AiQuotaLease {
      const owner = createHash('sha256').update(uid).digest('hex').slice(0, 32);
      const lockKey = `${namespace}:lock:${owner}`;
      const lockToken = randomUUID();
      let reserved = false;
      return {
        async beforeProviderCall() {
          const seconds = Math.floor(now() / 1000);
          const minute = Math.floor(seconds / 60), day = Math.floor(seconds / 86400);
          const keys = [`${namespace}:minute:${owner}:${minute}`, `${namespace}:day:${owner}:${day}`, `${namespace}:global:${day}`, lockKey];
          const result = await command(['EVAL', RESERVE_AI_QUOTA_LUA, 4, ...keys, ...limits, 65 - seconds % 60, 86460 - seconds % 86400, lockToken, reserved ? '0' : '1']);
          if (!Array.isArray(result) || result.length !== 3 || ![0, 1].includes(Number(result[0])))
            throw new AiRequestError(503, 'AI_QUOTA_UNAVAILABLE', 'Phản hồi bộ đếm hạn mức AI không hợp lệ.');
          if (Number(result[0]) !== 1) throw new AiRequestError(429, 'AI_RATE_LIMIT', result[2] === 'busy'
            ? 'Tài khoản đang có một lượt tạo câu hỏi. Vui lòng đợi lượt đó hoàn tất.'
            : 'Đã tới hạn mức tạo câu hỏi AI. Thầy cô vui lòng thử lại sau.', Math.max(1, Number(result[1]) || 60));
          reserved = true;
        },
        async release() {
          if (reserved) await command(['EVAL', RELEASE_AI_QUOTA_LUA, 1, lockKey, lockToken]);
        },
      };
    },
  };
}
