import { GoogleGenAI, Type, type GenerateContentParameters } from '@google/genai';
import { AiRequestError } from './aiAccess.js';

export type QuestionGenerationInput = {
  subject: string; bookSeries?: string; grade: string; semester?: string; sectionName?: string;
  lessonName: string; count: number; level: 'basic' | 'advanced'; customPrompt?: string; existingQuestions?: string[];
};
export async function generateReviewQuestions(input: QuestionGenerationInput, apiKey: string,
  beforeProviderCall: () => Promise<void>, signal: AbortSignal,
  provider?: (request: GenerateContentParameters) => Promise<{ text?: string }>, model = 'gemini-flash-latest') {
  const { subject, bookSeries, grade, semester, sectionName, lessonName, customPrompt, existingQuestions } = input;
  const targetLevel = input.level, qCount = input.count;
  let levelGuideline = '';
  if (targetLevel === 'basic') {
    levelGuideline = `TẠO TOÀN BỘ ${qCount} CÂU HỎI Ở MỨC ĐỘ CƠ BẢN (level = "basic"):
- Nội dung: Nhận biết, nhớ kiến thức, hiểu trực tiếp, công thức, tính toán 1 bước, áp dụng đơn giản.
- Câu hỏi ngắn gọn, phù hợp học sinh cần củng cố kiến thức nền.
- Thời gian học sinh trả lời miệng: 30 giây đến 2 phút.
- TUYỆT ĐỐI KHÔNG sinh câu hỏi nâng cao hay câu hỏi đánh đố.
- Toàn bộ câu hỏi bắt buộc có thuộc tính "level": "basic".`;
  } else {
    levelGuideline = `TẠO TOÀN BỘ ${qCount} CÂU HỎI Ở MỨC ĐỘ NÂNG CAO (level = "advanced"):
- Nội dung: Thông hiểu sâu hơn, vận dụng, 2-3 bước tính toán/lập luận, so sánh, giải thích, bài toán ngắn đòi hỏi tư duy logic.
- Thời gian học sinh trả lời miệng: 1 đến 4 phút.
- Nâng cao KHÔNG PHẢI là câu hỏi thi học sinh giỏi, KHÔNG dùng kiến thức vượt chương trình, KHÔNG dùng mẹo lạ hay kiến thức lớp trên.
- Toàn bộ câu hỏi bắt buộc có thuộc tính "level": "advanced".`;
  }

  const existingContext =
    Array.isArray(existingQuestions) && existingQuestions.length > 0
      ? `\n- KHÔNG trùng lặp nội dung với các câu hỏi đã có sau đây: ${existingQuestions
          .slice(0, 25)
          .map((q: string) => `"${q}"`)
          .join('; ')}`
      : '';

  const bookSeriesContext = bookSeries ? `\n- Bộ sách giáo khoa: ${bookSeries}` : '';

  const prompt = `Bạn là một giáo viên chuyên môn giàu kinh nghiệm theo chương trình Giáo dục Phổ thông 2018 tại Việt Nam.
Hãy tạo đúng ${qCount} câu hỏi kiểm tra bài cũ cho học sinh với thông tin sau:
- Môn học: ${subject}${bookSeriesContext}
- Khối lớp: ${grade}
- Học kỳ: ${semester ? `Học kỳ ${semester}` : 'Theo phân phối chương trình'}
- Chương / Chủ đề: ${sectionName || 'Nội dung trọng tâm'}
- Bài học: ${lessonName}${existingContext}
${customPrompt ? `- Yêu cầu bổ sung của giáo viên: ${customPrompt}` : ''}

Yêu cầu quy chuẩn sư phạm:
1. ${levelGuideline}
2. Bám sát SGK: Nội dung câu hỏi và đáp án phải chuẩn xác, đúng chuẩn kiến thức kỹ năng môn ${subject} lớp ${grade} THCS${bookSeries ? ` theo bộ sách "${bookSeries}"` : ''}, đúng phạm vi bài học đã chọn, tuyệt đối không ra kiến thức vượt chương trình lớp ${grade}.
3. Định dạng:
   - "question": Câu hỏi ngắn gọn, tường minh, chuẩn xác về mặt khoa học và sư phạm.
   - "answer": Câu trả lời hoặc lời giải/kết quả chuẩn xác, súc tích. TUYỆT ĐỐI KHÔNG ghi biểu điểm, thang điểm (như 5 điểm, 10 điểm), không ghi rubric chấm điểm, không ghi thông tin phân loại học sinh.
   - "level": Phải đúng là "${targetLevel}".
4. Trả về đúng ${qCount} câu hỏi. KHÔNG trộn lẫn mức độ khác.`;


  const ai = provider ? undefined : new GoogleGenAI({ apiKey, httpOptions: {
    headers: { 'User-Agent': 'aistudio-build' }, retryOptions: { attempts: 1 }, timeout: 45000,
  } });
  const call = provider || ((request: GenerateContentParameters) => ai!.models.generateContent(request));
  const request = (model: string): GenerateContentParameters => ({ model, contents: prompt, config: {
    abortSignal: signal, maxOutputTokens: 8192, responseMimeType: 'application/json',
    responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
      level: { type: Type.STRING, enum: [targetLevel] }, question: { type: Type.STRING }, answer: { type: Type.STRING },
    }, required: ['level', 'question', 'answer'] } },
  } });
  // One paid provider attempt per reservation; no SDK retry or automatic model fallback.
  await beforeProviderCall();
  const response = await call(request(model));
  let parsed: unknown;
  try { parsed = JSON.parse(response.text || '[]'); }
  catch { throw new AiRequestError(502, 'AI_INVALID_RESPONSE', 'AI trả về dữ liệu chưa hợp lệ. Thầy cô có thể thử lại.'); }
  if (!Array.isArray(parsed)) throw new AiRequestError(502, 'AI_INVALID_RESPONSE', 'AI chưa trả về danh sách câu hỏi hợp lệ.');
  const items = parsed;
  const questions = items.filter(item => item && typeof item === 'object' && item.level === targetLevel &&
      typeof item.question === 'string' && item.question.trim() && typeof item.answer === 'string' && item.answer.trim())
    .slice(0, qCount).map(item => ({ question: item.question.trim().slice(0, 3000), answer: item.answer.trim().slice(0, 3000), level: targetLevel }));
  if (!questions.length) throw new AiRequestError(502, 'AI_EMPTY_RESPONSE', 'AI chưa trả về câu hỏi hợp lệ cho mức độ đã chọn.');
  return questions;
}
