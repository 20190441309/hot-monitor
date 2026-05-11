import { Router } from 'express';
import { prisma } from '../db.js';
import { fetchRssFeed } from '../services/rss.js';

const router = Router();

// 获取所有 RSS 源
router.get('/', async (_req, res) => {
  try {
    const feeds = await prisma.rssFeed.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(feeds);
  } catch (error) {
    console.error('Error fetching RSS feeds:', error);
    res.status(500).json({ error: 'Failed to fetch RSS feeds' });
  }
});

// 新增 RSS 源
router.post('/', async (req, res) => {
  try {
    const { name, url } = req.body;

    if (!name?.trim() || !url?.trim()) {
      return res.status(400).json({ error: 'name and url are required' });
    }

    // 验证 URL 格式
    try { new URL(url); } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // 尝试获取 feed 验证有效性
    const items = await fetchRssFeed(url, name);
    if (items.length === 0) {
      return res.status(400).json({ error: '无法获取 RSS 内容，请检查 URL 是否正确' });
    }

    const feed = await prisma.rssFeed.create({
      data: { name: name.trim(), url: url.trim() }
    });

    res.status(201).json({ feed, itemCount: items.length });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: '该 RSS 源已存在' });
    }
    console.error('Error creating RSS feed:', error);
    res.status(500).json({ error: 'Failed to create RSS feed' });
  }
});

// 编辑 RSS 源
router.put('/:id', async (req, res) => {
  try {
    const { name, url } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name.trim();
    if (url !== undefined) {
      try { new URL(url); } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
      }
      data.url = url.trim();
    }

    const feed = await prisma.rssFeed.update({
      where: { id: req.params.id },
      data
    });

    res.json(feed);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'RSS feed not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: '该 RSS 源已存在' });
    }
    console.error('Error updating RSS feed:', error);
    res.status(500).json({ error: 'Failed to update RSS feed' });
  }
});

// 手动检查所有 RSS 源
router.post('/check', async (_req, res) => {
  try {
    const { runRssCheck } = await import('../jobs/rssChecker.js');
    const { io } = await import('../index.js');
    await runRssCheck(io);
    res.json({ message: 'RSS 检查完成' });
  } catch (error) {
    console.error('Error checking RSS feeds:', error);
    res.status(500).json({ error: 'RSS 检查失败' });
  }
});

// 删除 RSS 源
router.delete('/:id', async (req, res) => {
  try {
    await prisma.rssFeed.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'RSS feed not found' });
    }
    console.error('Error deleting RSS feed:', error);
    res.status(500).json({ error: 'Failed to delete RSS feed' });
  }
});

// 启用/禁用 RSS 源
router.patch('/:id/toggle', async (req, res) => {
  try {
    const feed = await prisma.rssFeed.findUnique({ where: { id: req.params.id } });
    if (!feed) {
      return res.status(404).json({ error: 'RSS feed not found' });
    }

    const updated = await prisma.rssFeed.update({
      where: { id: req.params.id },
      data: { isActive: !feed.isActive }
    });

    res.json(updated);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'RSS feed not found' });
    }
    console.error('Error toggling RSS feed:', error);
    res.status(500).json({ error: 'Failed to toggle RSS feed' });
  }
});

export default router;
