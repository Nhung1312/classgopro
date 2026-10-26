import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import generateQuestionsHandler from './server/generateQuestionsHandler.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', remoteResponseSync: false }));
  app.use('/api/response-cards', (_req, res) => res.status(503).json({
    error: 'Đồng bộ hai thiết bị cần backend bền vững có xác thực. Chưa bật trên bản tích hợp.'
  }));

  // Local development uses the exact same authenticated, quota-protected API as Vercel.
  app.all('/api/generate-questions', generateQuestionsHandler);

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
