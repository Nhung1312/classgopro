import { GoogleGenAI, Type } from '@google/genai';
import firebaseAppletConfig from '../firebase-applet-config.json';

/**
 * Vercel API for ClassGo review-question generation.
 * Fail-closed: unavailable until explicitly enabled and restricted to approved Firebase UIDs.
 * No API key is ever returned to the browser.
 */
type Request = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};
type Response = {
  status(code: number): Response;
  setHeader(name: string, value: string): Response;
  json(data: Record<string, unknown>): void;
};
type ReviewLevel = 'basic' | 'advanced';
type Question = { level: ReviewLevel; question: string; answer: string };

const stringField = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

function send(res: Response, status: number, error: string): void {
  res.status(status).json({ error });
}

async function verifyFirebaseUser(idToken: string, firebaseKey: string): Promise<string | null> {
  try {
    const reply = await fetch(
      'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(firebaseKey),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!reply.ok) return null;
    const data = await reply.json() as {
      users?: Array<{ localId?: string; disabled?: boolean; emailVerified?: boolean }>;
    };
    const user = data.users?.[0];
    return user && !user.disabled && user.emailVerified === true ? (user.localId || null) : null;
  } catch {
    return null;
  }
}

export default async function handler(req: Request, res: Response): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, 'Chức năng này chỉ chấp nhận yêu cầu tạo câu hỏi.');
  }

  // Explicit opt-in is important: merging main may automatically deploy Vercel Production.
  if (process.env.CLASSGO_AI_ENABLED !== 'true') {
    return send(res, 503, 'Tạo câu hỏi AI chưa được quản trị viên kích hoạt trên Vercel.');
  }
  const aiKey = process.env.GEMINI_API_KEY;
  const firebaseKey = process.env.CLASSGO_FIREBASE_API_KEY
    || process.env.VITE_FIREBASE_API_KEY
    || firebaseAppletConfig.apiKey;
  const allowedUids = new Set((process.env.CLASSGO_AI_TEACHER_UIDS || '')
    .split(',').map(value => value.trim()).filter(Boolean));

  if (!aiKey || !firebaseKey || allowedUids.size === 0) {
    return send(res, 503, 'Thiếu cấu hình Gemini hoặc danh sách giáo viên được phép dùng AI trên Vercel.');
  }

  const auth = req.headers.authorization;
  const authorization = Array.isArray(auth) ? auth[0] : auth;
  const token = /^Bearer\s+(\S+)$/i.exec(authorization || '')?.[1];
  if (!token || token.length > 4096) {
    return send(res, 401, 'Vui lòng đăng nhập tài khoản giáo viên trước khi tạo câu hỏi AI.');
  }
  const uid = await verifyFirebaseUser(token, firebaseKey);
  if (!uid) return send(res, 401, 'Phiên đăng nhập chưa hợp lệ hoặc email chưa được xác minh.');
  if (!allowedUids.has(uid)) {
    return send(res, 403, 'Tài khoản này chưa được cấp quyền sử dụng Gemini trả phí.');
  }

  const raw = typeof req.body === 'string' ? (() => {
    try { return JSON.parse(req.body); } catch { return null; }
  })() : req.body;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || JSON.stringify(raw).length > 24000) {
    return send(res, 400, 'Dữ liệu yêu cầu không hợp lệ hoặc quá lớn.');
  }
  const input = raw as Record<string, unknown>;
  const subject = stringField(input.subject, 80);
  const grade = stringField(input.grade, 3);
  const lessonName = stringField(input.lessonName, 200);
  const sectionName = stringField(input.sectionName, 160);
  const semester = stringField(input.semester, 12);
  const bookSeries = stringField(input.bookSeries, 140);
  const customPrompt = stringField(input.customPrompt, 800);
  const requestedCount = Number(input.count);
  const count = Number.isInteger(requestedCount) ? Math.max(1, Math.min(requestedCount, 10)) : 5;
  const level: ReviewLevel | null = input.level === 'basic' || input.level === 'advanced'
    ? input.level : null;
  if (!subject || !lessonName || !['6', '7', '8', '9'].includes(grade) || !level) {
    return send(res, 400, 'Vui lòng chọn đúng môn, khối 6–9, bài học và mức độ câu hỏi.');
  }
  const existingQuestions = Array.isArray(input.existingQuestions)
    ? input.existingQuestions.slice(0, 20).map(value => stringField(value, 200)).filter(Boolean)
    : [];
  const levelGuideline = level === 'basic'
    ? 'Cơ bản: nhận biết, thông hiểu trực tiếp, một bước tính, không đánh đố.'
    : 'Nâng cao: vận dụng 2–3 bước phù hợp đúng lớp, không vượt chương trình THCS.';
  const prompt = [
    'Bạn là giáo viên THCS Việt Nam, soạn câu hỏi kiểm tra bài cũ theo CTGDPT 2018.',
    'Chỉ trả về JSON array, mỗi phần tử có level, question, answer.',
    'Tạo đúng ' + count + ' câu; toàn bộ level phải là "' + level + '".',
    'Môn: ' + subject + '; Lớp: ' + grade + '; Bài: ' + lessonName,
    'Chủ đề: ' + sectionName + '; Học kỳ: ' + semester + '; Bộ sách: ' + bookSeries,
    levelGuideline,
    'Câu hỏi và đáp án chính xác, súc tích, không ghi biểu điểm.',
    'Không trùng các câu: ' + existingQuestions.join(' | '),
    'Yêu cầu bổ sung: ' + customPrompt,
  ].join('\n');

  try {
    // One model attempt only. Never silently double API usage on a fallback model.
    const ai = new GoogleGenAI({ apiKey: aiKey });
    const generated = await ai.models.generateContent({
      model: process.env.CLASSGO_AI_MODEL || 'gemini-flash-latest',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              level: { type: Type.STRING, enum: [level] },
              question: { type: Type.STRING },
              answer: { type: Type.STRING },
            },
            required: ['level', 'question', 'answer'],
          },
        },
      },
    });
    const result = JSON.parse(generated.text || '[]') as unknown;
    if (!Array.isArray(result)) return send(res, 502, 'Gemini chưa trả về danh sách câu hỏi hợp lệ.');
    const questions: Question[] = result.filter((item): item is Question =>
      !!item && typeof item === 'object' && item.level === level &&
      typeof item.question === 'string' && !!item.question.trim() &&
      typeof item.answer === 'string' && !!item.answer.trim()
    ).slice(0, count).map(item => ({
      level,
      question: item.question.trim().slice(0, 3000),
      answer: item.answer.trim().slice(0, 3000),
    }));
    res.status(200).json({ questions });
  } catch (error: unknown) {
    const status = typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status: unknown }).status) : 0;
    const code = status === 429 ? 429 : status === 401 || status === 403 ? 503 : 502;
    send(res, code, code === 429
      ? 'Gemini đã đạt giới hạn yêu cầu. Vui lòng thử lại sau.'
      : 'Không tạo được câu hỏi. Kiểm tra model, quota và cấu hình Gemini trên Vercel.');
  }
}
