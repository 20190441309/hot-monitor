import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import axios from 'axios';
import dotenv from 'dotenv';
import cron from 'node-cron';

import { prisma } from './db.js';
import keywordsRouter from './routes/keywords.js';
import hotspotsRouter from './routes/hotspots.js';
import settingsRouter from './routes/settings.js';
import notificationsRouter from './routes/notifications.js';
import rssRouter from './routes/rss.js';
import feedbackRouter from './routes/feedback.js';
import { runHotspotCheck } from './jobs/hotspotChecker.js';
import { runRssCheck } from './jobs/rssChecker.js';
import { syncEnvFromDB } from './utils/settings.js';

dotenv.config();
await syncEnvFromDB();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve built client in production
app.use(express.static('../client/dist'));

// Routes
app.use('/api/keywords', keywordsRouter);
app.use('/api/hotspots', hotspotsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/rss', rssRouter);
app.use('/api/feedback', feedbackRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Image proxy — 防止 mixed content 和防盗链导致裂图
const IMAGE_PROXY_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const IMAGE_PROXY_TIMEOUT = 10_000; // 10s

app.get('/api/img-proxy', async (req, res) => {
  const url = req.query.url as string;

  if (!url) {
    return res.status(400).json({ error: 'url parameter is required' });
  }

  // URL 验证
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return res.status(400).json({ error: 'Only http/https URLs are allowed' });
  }

  // 屏蔽内网地址（SSRF 防护）
  const hostname = parsed.hostname;
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  ) {
    return res.status(400).json({ error: 'Private IPs are not allowed' });
  }

  try {
    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: IMAGE_PROXY_TIMEOUT,
      maxContentLength: IMAGE_PROXY_MAX_SIZE,
      headers: {
        'User-Agent': 'HotMonitor/1.0 ImageProxy',
        'Accept': 'image/*'
      }
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';
    const contentLength = parseInt(response.headers['content-length'] || '0', 10);

    if (contentLength > IMAGE_PROXY_MAX_SIZE) {
      return res.status(413).json({ error: 'Image too large (max 5MB)' });
    }

    // 设置缓存头（1 天）
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // 流式转发
    response.data.pipe(res);
  } catch (error: any) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return res.status(504).json({ error: 'Image fetch timed out' });
    }
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Image not found' });
    }
    console.error('Image proxy error:', error.message);
    res.status(502).json({ error: 'Failed to fetch image' });
  }
});

// Manual trigger for hotspot check (includes RSS)
app.post('/api/check-hotspots', async (req, res) => {
  try {
    await Promise.all([runHotspotCheck(io), runRssCheck(io)]);
    res.json({ message: 'Hotspot check completed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to run hotspot check' });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('subscribe', (keywords: string[]) => {
    keywords.forEach(kw => socket.join(`keyword:${kw}`));
    console.log(`Socket ${socket.id} subscribed to:`, keywords);
  });

  socket.on('unsubscribe', (keywords: string[]) => {
    keywords.forEach(kw => socket.leave(`keyword:${kw}`));
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Scheduled job: Run hotspot check every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log('🔄 Running scheduled hotspot check...');
  try {
    await runHotspotCheck(io);
    console.log('✅ Scheduled hotspot check completed');
  } catch (error) {
    console.error('❌ Scheduled hotspot check failed:', error);
  }
});

// Scheduled job: Run RSS feed check every 2 hours
cron.schedule('0 */2 * * *', async () => {
  console.log('📡 Running scheduled RSS feed check...');
  try {
    await runRssCheck(io);
    console.log('✅ Scheduled RSS feed check completed');
  } catch (error) {
    console.error('❌ Scheduled RSS feed check failed:', error);
  }
});

// Export for use in other modules
export { io };

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`
  🔥 热点监控服务启动成功!
  📡 Server running on http://localhost:${PORT}
  🔌 WebSocket ready
  ⏰ Hotspot check scheduled every 30 minutes
  `);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});
