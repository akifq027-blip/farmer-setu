import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';

import { authRouter } from './backend/routes/auth.js';
import { centersRouter } from './backend/routes/centers.js';
import { schedulesRouter } from './backend/routes/schedules.js';
import { requestsRouter } from './backend/routes/requests.js';
import { announcementsRouter } from './backend/routes/announcements.js';
import { adminRouter } from './backend/routes/admin.js';
import { geminiVoiceRouter } from './backend/routes/geminiVoice.js';
import { setupGeminiLiveWebSocket } from './backend/services/geminiLiveService.js';
import { store } from './backend/store.js';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  const httpServer = http.createServer(app);

  // Setup Gemini Live Real-time WebSocket Service
  setupGeminiLiveWebSocket(httpServer);

  // Global Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Routes First
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'KisanSetu Farmer Procurement API',
      database: store.getDatabaseStatus(),
      timestamp: new Date().toISOString()
    });
  });

  // Database status & management endpoint
  app.get('/api/database/status', (req, res) => {
    res.json({
      success: true,
      ...store.getDatabaseStatus()
    });
  });

  app.post('/api/database/sync', async (req, res) => {
    try {
      await store.initMySQLSync();
      res.json({
        success: true,
        message: 'Aiven MySQL synchronization refreshed successfully.',
        status: store.getDatabaseStatus()
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/centers', centersRouter);
  app.use('/api/schedules', schedulesRouter);
  app.use('/api/requests', requestsRouter);
  app.use('/api/announcements', announcementsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/gemini', geminiVoiceRouter);

  // Serve static files from /public
  const publicDir = path.join(process.cwd(), 'public');
  app.use(express.static(publicDir));

  // Serve convenient pretty routes directly to HTML files
  app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
  app.get('/login', (req, res) => res.sendFile(path.join(publicDir, 'login.html')));
  app.get('/register', (req, res) => res.sendFile(path.join(publicDir, 'register.html')));
  app.get('/dashboard', (req, res) => res.sendFile(path.join(publicDir, 'dashboard.html')));
  app.get('/request', (req, res) => res.sendFile(path.join(publicDir, 'request.html')));
  app.get('/status', (req, res) => res.sendFile(path.join(publicDir, 'status.html')));
  app.get('/schedule', (req, res) => res.sendFile(path.join(publicDir, 'schedule.html')));
  app.get('/centers', (req, res) => res.sendFile(path.join(publicDir, 'centers.html')));
  app.get('/profile', (req, res) => res.sendFile(path.join(publicDir, 'profile.html')));
  app.get('/help', (req, res) => res.sendFile(path.join(publicDir, 'help.html')));
  app.get('/admin', (req, res) => res.sendFile(path.join(publicDir, 'admin', 'index.html')));
  app.get('/admin/login', (req, res) => res.sendFile(path.join(publicDir, 'admin', 'login.html')));
  app.get('/admin/index.html', (req, res) => res.sendFile(path.join(publicDir, 'admin', 'index.html')));

  // In development, handle any unhandled client requests via Vite middleware
  if (!isProduction) {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn('Vite dev middleware fallback:', e);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      // If requested file has .html, try serving from public
      if (req.path.endsWith('.html')) {
        const filePath = path.join(publicDir, req.path);
        return res.sendFile(filePath);
      }
      res.sendFile(path.join(publicDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🌾 KisanSetu Farmer Procurement System running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
