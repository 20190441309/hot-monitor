import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

// 提交反馈
router.post('/', async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: '标题不能为空' });
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: '内容不能为空' });
    }

    const feedback = await prisma.feedback.create({
      data: {
        title: title.trim().slice(0, 200),
        content: content.trim().slice(0, 5000),
      }
    });

    res.status(201).json({ message: '感谢你的反馈！', id: feedback.id });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: '提交失败，请稍后再试' });
  }
});

// 获取所有反馈（管理员）
router.get('/', async (_req, res) => {
  try {
    const feedbacks = await prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(feedbacks);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

export default router;
