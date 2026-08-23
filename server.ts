import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import { authRouter } from './backend/routes/auth.js';
import { centersRouter } from './backend/routes/centers.js';
import { schedulesRouter } from './backend/routes/schedules.js';
import { requestsRouter } from './backend/routes/requests.js';
import { announcementsRouter } from './backend/routes/announcements.js';
import { adminRouter } from './backend/routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Global Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Routes First
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'KisanSetu Farmer Procurement API',
      timestamp: new Date().toISOString()
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/centers', centersRouter);
  app.use('/api/schedules', schedulesRouter);
  app.use('/api/requests', requestsRouter);
  app.use('/api/announcements', announcementsRouter);
  app.use('/api/admin', adminRouter);

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

  // In development, handle any unhandled client requests
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌾 KisanSetu Farmer Procurement System running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
