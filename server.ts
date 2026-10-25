import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json());

  const apiKey = process.env.GEMINI_API_KEY;
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', remoteResponseSync: false }));
  app.use('/api/response-cards', (_req, res) => res.status(503).json({
    error: 'Đồng bộ hai thiết bị cần backend bền vững có xác thực. Chưa bật trên bản tích hợp.'
  }));

  // POST /api/generate-questions
  app.post('/api/generate-questions', async (req, res) => {
    if (!apiKey) return res.status(503).json({ error: 'Chưa cấu hình Gemini cho máy chủ cục bộ.' });
    const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
    try {
      const {
        subject,
        bookSeries,
        grade,
        semester,
        sectionName,
        lessonName,
        count = 10,
        level = 'basic', // strictly 'basic' | 'advanced'
        customPrompt = '',
        existingQuestions = [],
      } = req.body;

      if (!subject || !lessonName) {
        return res.status(400).json({ error: 'Vui lòng cung cấp môn học và bài học.' });
      }

      const targetLevel: 'basic' | 'advanced' = level === 'advanced' ? 'advanced' : 'basic';
      const qCount = Math.min(Math.max(Number(count) || 10, 1), 20);

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

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  level: {
                    type: Type.STRING,
                    enum: [targetLevel],
                    description: `Mức độ bắt buộc phải là ${targetLevel}`,
                  },
                  question: {
                    type: Type.STRING,
                    description: 'Nội dung câu hỏi kiểm tra bài cũ',
                  },
                  answer: {
                    type: Type.STRING,
                    description: 'Đáp án chuẩn xác, súc tích (không kèm biểu điểm)',
                  },
                },
                required: ['level', 'question', 'answer'],
              },
            },
          },
        });
      } catch (genError: any) {
        console.warn('Primary model error, attempting fallback to gemini-flash-latest:', genError?.message);
        response = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  level: {
                    type: Type.STRING,
                    enum: [targetLevel],
                  },
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING },
                },
                required: ['level', 'question', 'answer'],
              },
            },
          },
        });
      }

      const text = response.text || '[]';
      let parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        parsed = [parsed];
      }

      // Strict validation: ONLY keep items where level strictly matches the requested targetLevel
      const validatedQuestions = parsed
        .filter((item: any) => {
          if (!item || !item.question || !item.answer) return false;
          // Reject any item where level does not match requested targetLevel
          return item.level === targetLevel;
        })
        .map((item: any) => ({
          question: String(item.question).trim(),
          answer: String(item.answer).trim(),
          level: targetLevel,
        }));

      res.json({ questions: validatedQuestions });
    } catch (error: any) {
      console.error('Gemini question generation error:', error);
      res.status(500).json({
        error: error.message || 'Không thể tạo câu hỏi lúc này. Vui lòng thử lại sau.',
      });
    }
  });

  // Vite integration: use Vite dev middlewares in dev, static build in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '127.0.0.1', () => {
    console.log(`ClassGo full-stack server running on http://127.0.0.1:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
