type TokenProvider = (forceRefresh?: boolean) => Promise<string>;
export class AiQuestionRequestError extends Error {
  constructor(message: string, public status: number, public code: string, public retryAfter?: number) { super(message); }
}
/** Shared by single-lesson and batch generation; no Gemini credential enters the browser. */
export function createAiQuestionRequester(getToken: TokenProvider, send: typeof fetch = fetch) {
  return async (params: Record<string, unknown>) => {
    const request = async (forceRefresh: boolean) => {
      const token = await getToken(forceRefresh);
      if (!token) throw new AiQuestionRequestError('Thầy cô cần đăng nhập trước khi tạo câu hỏi AI.', 401, 'AI_AUTH_REQUIRED');
      const response = await send('/api/generate-questions', { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(params), signal: AbortSignal.timeout(60000) });
      const isJson = response.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await response.json() : null;
      return { response, data };
    };
    let { response, data } = await request(false);
    if (response.status === 401 && data?.code === 'AI_TOKEN_EXPIRED') ({ response, data } = await request(true));
    if (!response.ok) throw new AiQuestionRequestError(data?.error || `Máy chủ tạo câu hỏi chưa sẵn sàng (${response.status}).`,
      response.status, data?.code || 'AI_REQUEST_FAILED', Number(response.headers.get('retry-after')) || undefined);
    if (!data || !Array.isArray(data.questions)) throw new AiQuestionRequestError('Phản hồi máy chủ tạo câu hỏi chưa đúng định dạng.', 502, 'AI_INVALID_RESPONSE');
    return data;
  };
}
export const requestAiQuestions = createAiQuestionRequester(async forceRefresh => {
  const { auth } = await import('../lib/firebase');
  await auth.authStateReady();
  if (!auth.currentUser) throw new AiQuestionRequestError('Thầy cô cần đăng nhập trước khi tạo câu hỏi AI.', 401, 'AI_AUTH_REQUIRED');
  return auth.currentUser.getIdToken(forceRefresh);
});
