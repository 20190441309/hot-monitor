import { Router } from 'express';
import { prisma } from '../db.js';
import { sortHotspots } from '../utils/sortHotspots.js';

function computeRelated(hotspots: any[]): Map<string, { relatedCount: number; relatedIds: string[] }> {
  const result = new Map<string, { relatedCount: number; relatedIds: string[] }>();

  // Group by keywordId
  const byKeyword = new Map<string, any[]>();
  for (const h of hotspots) {
    const kid = h.keywordId ?? null;
    if (!byKeyword.has(kid)) byKeyword.set(kid, []);
    byKeyword.get(kid)!.push(h);
  }

  // For each keyword group, compute tag overlap
  for (const group of byKeyword.values()) {
    // Parse tags for each hotspot in the group
    const parsed = group.map(h => {
      let tags: string[] = [];
      if (h.tags) {
        try { tags = JSON.parse(h.tags); } catch { tags = []; }
      }
      return { id: h.id, tagSet: new Set(tags) };
    });

    // Compare each pair
    for (let i = 0; i < parsed.length; i++) {
      const relatedIds: string[] = [];
      for (let j = 0; j < parsed.length; j++) {
        if (i === j) continue;
        // Count tag overlap
        let overlap = 0;
        for (const tag of parsed[i].tagSet) {
          if (parsed[j].tagSet.has(tag)) overlap++;
        }
        if (overlap >= 2) {
          relatedIds.push(parsed[j].id);
        }
      }
      result.set(parsed[i].id, {
        relatedCount: relatedIds.length,
        relatedIds
      });
    }
  }

  return result;
}

const router = Router();

// 获取所有热点
router.get('/', async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '20', 
      source, 
      importance,
      keywordId,
      isReal,
      timeRange,
      timeFrom,
      timeTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (source) where.source = source;
    if (importance) where.importance = importance;
    if (keywordId) where.keywordId = keywordId;
    if (isReal !== undefined && isReal !== '') {
      where.isReal = isReal === 'true';
    }

    // 时间范围筛选
    if (timeRange) {
      const now = new Date();
      let dateFrom: Date | null = null;
      switch (timeRange) {
        case '1h':
          dateFrom = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'today':
          dateFrom = new Date(now);
          dateFrom.setHours(0, 0, 0, 0);
          break;
        case '7d':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
      if (dateFrom) {
        where.createdAt = { gte: dateFrom };
      }
    } else if (timeFrom || timeTo) {
      where.createdAt = {};
      if (timeFrom) where.createdAt.gte = new Date(timeFrom as string);
      if (timeTo) where.createdAt.lte = new Date(timeTo as string);
    }

    // 排序处理
    let orderBy: any;
    const sort = sortBy as string;
    const order = (sortOrder as string) === 'asc' ? 'asc' : 'desc';

    // importance 和 hot 需要在内存中排序（Prisma 不支持自定义排序）
    const needsMemorySort = sort === 'importance' || sort === 'hot';

    switch (sort) {
      case 'publishedAt':
        orderBy = [{ publishedAt: order }, { createdAt: 'desc' }];
        break;
      case 'relevance':
        orderBy = { relevance: order };
        break;
      case 'importance':
      case 'hot':
        orderBy = { createdAt: 'desc' };
        break;
      default:
        orderBy = { createdAt: order };
        break;
    }

    const [rawHotspots, total, allForRelated] = await Promise.all([
      prisma.hotspot.findMany({
        where,
        orderBy,
        ...(needsMemorySort ? {} : { skip, take: limitNum }),
        include: {
          keyword: {
            select: { id: true, text: true, category: true }
          }
        }
      }),
      prisma.hotspot.count({ where }),
      // Lightweight query for related computation (all matching, no pagination)
      prisma.hotspot.findMany({
        where,
        select: { id: true, keywordId: true, tags: true }
      })
    ]);

    let hotspots;
    if (needsMemorySort) {
      const sorted = sortHotspots(rawHotspots, sort, order as 'asc' | 'desc');
      hotspots = sorted.slice(skip, skip + limitNum);
    } else {
      hotspots = rawHotspots;
    }

    // Compute related discussions (tag overlap within same keyword)
    const relatedMap = computeRelated(allForRelated);
    const enriched = hotspots.map(h => {
      const related = relatedMap.get(h.id) || { relatedCount: 0, relatedIds: [] };
      return { ...h, ...related };
    });

    res.json({
      data: enriched,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching hotspots:', error);
    res.status(500).json({ error: 'Failed to fetch hotspots' });
  }
});

// 获取热点统计
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const [
      totalHotspots,
      todayHotspots,
      urgentHotspots,
      sourceStats,
      importanceStats,
      dailyTrends,
      topKeywords
    ] = await Promise.all([
      prisma.hotspot.count(),
      prisma.hotspot.count({
        where: { createdAt: { gte: today } }
      }),
      prisma.hotspot.count({
        where: { importance: 'urgent' }
      }),
      prisma.hotspot.groupBy({
        by: ['source'],
        _count: { source: true }
      }),
      prisma.hotspot.groupBy({
        by: ['importance'],
        _count: { importance: true }
      }),
      // SQLite: 按日分组统计最近 7 天
      prisma.$queryRaw<{ date: string; count: number }[]>`
        SELECT strftime('%Y-%m-%d', createdAt) as date, COUNT(*) as count
        FROM Hotspot
        WHERE createdAt >= ${sevenDaysAgo.toISOString()}
        GROUP BY strftime('%Y-%m-%d', createdAt)
        ORDER BY date ASC
      `,
      // 按关键词分组，取 top 10
      prisma.hotspot.groupBy({
        by: ['keywordId'],
        _count: { keywordId: true },
        orderBy: { _count: { keywordId: 'desc' } },
        take: 10,
        where: { keywordId: { not: null } }
      })
    ]);

    // 补全 7 天中没有数据的日期
    const trendMap = new Map(dailyTrends.map(d => [d.date, Number(d.count)]));
    const trends: { date: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      trends.push({ date: key, count: trendMap.get(key) ?? 0 });
    }

    // 查询 top keywords 的关键词文本
    const keywordIds = topKeywords.map(k => k.keywordId).filter(Boolean) as string[];
    const keywords = keywordIds.length > 0
      ? await prisma.keyword.findMany({ where: { id: { in: keywordIds } }, select: { id: true, text: true } })
      : [];
    const keywordMap = new Map(keywords.map(k => [k.id, k.text]));

    const topKeywordsData = topKeywords.map(k => ({
      keywordId: k.keywordId,
      keyword: keywordMap.get(k.keywordId!) || '未知',
      count: k._count.keywordId
    }));

    res.json({
      total: totalHotspots,
      today: todayHotspots,
      urgent: urgentHotspots,
      bySource: sourceStats.reduce((acc: Record<string, number>, item: { source: string; _count: { source: number } }) => {
        acc[item.source] = item._count.source;
        return acc;
      }, {} as Record<string, number>),
      byImportance: importanceStats.reduce((acc: Record<string, number>, item: { importance: string; _count: { importance: number } }) => {
        acc[item.importance] = item._count.importance;
        return acc;
      }, {} as Record<string, number>),
      trends,
      topKeywords: topKeywordsData
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// 获取所有标签（聚合）
router.get('/tags', async (req, res) => {
  try {
    const hotspots = await prisma.hotspot.findMany({
      where: { tags: { not: null } },
      select: { tags: true }
    });

    const tagCounts = new Map<string, number>();
    for (const hotspot of hotspots) {
      if (!hotspot.tags) continue;
      try {
        const parsed = JSON.parse(hotspot.tags);
        if (Array.isArray(parsed)) {
          for (const tag of parsed) {
            if (typeof tag === 'string' && tag.trim()) {
              tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            }
          }
        }
      } catch {}
    }

    const tags = [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// 更新单个热点的标签
router.put('/:id/tags', async (req, res) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'tags must be an array of strings' });
    }

    const sanitized = tags
      .filter((t: any) => typeof t === 'string')
      .map((t: string) => t.trim())
      .filter(Boolean)
      .slice(0, 10);

    const hotspot = await prisma.hotspot.update({
      where: { id },
      data: { tags: JSON.stringify(sanitized) }
    });

    res.json(hotspot);
  } catch (error) {
    console.error('Error updating tags:', error);
    res.status(500).json({ error: 'Failed to update tags' });
  }
});

// 批量为未标记热点生成标签
router.post('/batch-tag', async (req, res) => {
  try {
    const untagged = await prisma.hotspot.findMany({
      where: {
        OR: [
          { tags: null },
          { tags: '[]' },
          { tags: '' }
        ]
      },
      include: {
        keyword: { select: { text: true } }
      },
      take: 100
    });

    if (untagged.length === 0) {
      return res.json({ processed: 0, total: 0, message: '没有需要生成标签的热点' });
    }

    const { analyzeContent } = await import('../services/ai.js');
    let processed = 0;

    for (const hotspot of untagged) {
      try {
        const keyword = hotspot.keyword?.text || '';
        const fullText = hotspot.title + '\n' + hotspot.content;
        const analysis = await analyzeContent(fullText, keyword);

        await prisma.hotspot.update({
          where: { id: hotspot.id },
          data: { tags: JSON.stringify(analysis.tags || []) }
        });
        processed++;
      } catch (error) {
        console.error(`Failed to tag hotspot ${hotspot.id}:`, error);
      }
    }

    res.json({ processed, total: untagged.length, message: `已为 ${processed} 条热点生成标签` });
  } catch (error) {
    console.error('Error in batch-tag:', error);
    res.status(500).json({ error: 'Failed to batch generate tags' });
  }
});

// 获取单个热点
router.get('/:id', async (req, res) => {
  try {
    const hotspot = await prisma.hotspot.findUnique({
      where: { id: req.params.id },
      include: {
        keyword: true
      }
    });

    if (!hotspot) {
      return res.status(404).json({ error: 'Hotspot not found' });
    }

    res.json(hotspot);
  } catch (error) {
    console.error('Error fetching hotspot:', error);
    res.status(500).json({ error: 'Failed to fetch hotspot' });
  }
});

// 获取热点的关联讨论
router.get('/:id/related', async (req, res) => {
  try {
    const hotspot = await prisma.hotspot.findUnique({
      where: { id: req.params.id },
      select: { id: true, keywordId: true, tags: true }
    });

    if (!hotspot) {
      return res.status(404).json({ error: 'Hotspot not found' });
    }

    // Parse this hotspot's tags
    let myTags: string[] = [];
    if (hotspot.tags) {
      try { myTags = JSON.parse(hotspot.tags); } catch { myTags = []; }
    }

    if (myTags.length === 0 || !hotspot.keywordId) {
      return res.json([]);
    }

    const myTagSet = new Set(myTags);

    // Find other hotspots in the same keyword group
    const candidates = await prisma.hotspot.findMany({
      where: {
        keywordId: hotspot.keywordId,
        id: { not: hotspot.id },
        tags: { not: null }
      },
      select: {
        id: true,
        title: true,
        summary: true,
        source: true,
        url: true,
        authorName: true,
        publishedAt: true,
        tags: true
      }
    });

    // Filter by tag overlap >= 2
    const related = candidates.filter(c => {
      let cTags: string[] = [];
      if (c.tags) {
        try { cTags = JSON.parse(c.tags); } catch { cTags = []; }
      }
      let overlap = 0;
      for (const tag of cTags) {
        if (myTagSet.has(tag)) overlap++;
      }
      return overlap >= 2;
    });

    res.json(related.slice(0, 50));
  } catch (error) {
    console.error('Error fetching related hotspots:', error);
    res.status(500).json({ error: 'Failed to fetch related hotspots' });
  }
});

// 手动搜索热点
router.post('/search', async (req, res) => {
  try {
    const { query, sources = ['twitter', 'bing'] } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // 导入搜索服务
    const { searchTwitter } = await import('../services/twitter.js');
    const { searchBing } = await import('../services/search.js');
    const { analyzeContent } = await import('../services/ai.js');

    const results: any[] = [];

    // Twitter 搜索
    if (sources.includes('twitter')) {
      try {
        const tweets = await searchTwitter(query);
        results.push(...tweets);
      } catch (error) {
        console.error('Twitter search failed:', error);
      }
    }

    // Bing 搜索
    if (sources.includes('bing')) {
      try {
        const webResults = await searchBing(query);
        results.push(...webResults);
      } catch (error) {
        console.error('Bing search failed:', error);
      }
    }

    // AI 分析前几个结果
    const analyzedResults = await Promise.all(
      results.slice(0, 10).map(async (item) => {
        try {
          const analysis = await analyzeContent(item.title + ' ' + item.content, query);
          return { ...item, analysis };
        } catch {
          return { ...item, analysis: null };
        }
      })
    );

    res.json({ results: analyzedResults });
  } catch (error) {
    console.error('Error searching hotspots:', error);
    res.status(500).json({ error: 'Failed to search hotspots' });
  }
});

// 保存搜索结果为热点
router.post('/save', async (req, res) => {
  try {
    const { title, content, url, source, sourceId, publishedAt, viewCount, likeCount,
      retweetCount, replyCount, quoteCount, commentCount, danmakuCount, author, analysis } = req.body;

    if (!title || !url || !source) {
      return res.status(400).json({ error: 'title, url, source are required' });
    }

    // 检查是否已存在（唯一约束 url + source）
    const existing = await prisma.hotspot.findUnique({
      where: { url_source: { url, source } }
    });

    if (existing) {
      return res.json({ hotspot: existing, saved: false, message: '该热点已存在' });
    }

    // 获取 OG 图片
    const { fetchOgImage } = await import('../services/ogImage.js');
    const thumbnail = await fetchOgImage(url);

    const hotspot = await prisma.hotspot.create({
      data: {
        title: title.slice(0, 500),
        content: content?.slice(0, 5000) || '',
        url,
        source,
        sourceId: sourceId || null,
        isReal: analysis?.isReal ?? true,
        relevance: analysis?.relevance ?? 0,
        relevanceReason: analysis?.relevanceReason || null,
        keywordMentioned: analysis?.keywordMentioned ?? false,
        importance: analysis?.importance || 'low',
        summary: analysis?.summary || null,
        tags: analysis?.tags ? JSON.stringify(analysis.tags) : null,
        thumbnail: thumbnail || null,
        viewCount: viewCount || null,
        likeCount: likeCount || null,
        retweetCount: retweetCount || null,
        replyCount: replyCount || null,
        commentCount: commentCount || null,
        danmakuCount: danmakuCount || null,
        authorName: author?.name || null,
        authorUsername: author?.username || null,
        authorAvatar: author?.avatar || null,
        authorFollowers: author?.followers || null,
        authorVerified: author?.verified || null,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
      }
    });

    res.status(201).json({ hotspot, saved: true, message: '热点已保存' });
  } catch (error) {
    console.error('Error saving hotspot:', error);
    res.status(500).json({ error: 'Failed to save hotspot' });
  }
});

// 删除热点
router.delete('/:id', async (req, res) => {
  try {
    await prisma.hotspot.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Hotspot not found' });
    }
    console.error('Error deleting hotspot:', error);
    res.status(500).json({ error: 'Failed to delete hotspot' });
  }
});

export default router;
