import { Server } from 'socket.io';
import { prisma } from '../db.js';
import { fetchRssFeed } from '../services/rss.js';
import { analyzeContent, preMatchKeyword } from '../services/ai.js';
import { sendHotspotEmail } from '../services/email.js';

const MAX_ITEMS_PER_FEED = 10;

export async function runRssCheck(io: Server): Promise<void> {
  console.log('📡 Starting RSS feed check...');

  const feeds = await prisma.rssFeed.findMany({
    where: { isActive: true }
  });

  if (feeds.length === 0) {
    console.log('No active RSS feeds to check');
    return;
  }

  const keywords = await prisma.keyword.findMany({
    where: { isActive: true }
  });

  if (keywords.length === 0) {
    console.log('No active keywords to match RSS content against');
    return;
  }

  const expandedKeywords = keywords.map(k => k.text.toLowerCase());

  console.log(`Checking ${feeds.length} RSS feeds against ${keywords.length} keywords...`);

  let newHotspotsCount = 0;

  for (const feed of feeds) {
    console.log(`\n📡 Checking feed: "${feed.name}" (${feed.url})`);

    try {
      const items = await fetchRssFeed(feed.url, feed.name);
      console.log(`  Fetched ${items.length} items`);

      let processed = 0;

      for (const item of items) {
        if (processed >= MAX_ITEMS_PER_FEED) break;

        const fullText = item.title + '\n' + item.content;

        // 文本匹配关键词
        const matchedKeyword = keywords.find(kw => {
          const kwLower = kw.text.toLowerCase();
          return fullText.toLowerCase().includes(kwLower);
        });

        if (!matchedKeyword) continue;

        try {
          // 去重检查
          const existing = await prisma.hotspot.findFirst({
            where: { url: item.url, source: 'rss' }
          });
          if (existing) continue;

          // AI 分析
          const preMatch = preMatchKeyword(fullText, expandedKeywords);
          const analysis = await analyzeContent(fullText, matchedKeyword.text, preMatch);

          if (!analysis.isReal) {
            console.log(`  ❌ Filtered fake/spam: ${item.title.slice(0, 30)}...`);
            continue;
          }

          if (analysis.relevance < 50) {
            console.log(`  ⏭ Low relevance (${analysis.relevance}): ${item.title.slice(0, 30)}...`);
            continue;
          }

          if (!analysis.keywordMentioned && analysis.relevance < 65) {
            continue;
          }

          // 保存热点
          const hotspot = await prisma.hotspot.create({
            data: {
              title: item.title.slice(0, 500),
              content: item.content.slice(0, 5000),
              url: item.url,
              source: 'rss',
              sourceId: item.sourceId || null,
              isReal: analysis.isReal,
              relevance: analysis.relevance,
              relevanceReason: analysis.relevanceReason || null,
              keywordMentioned: analysis.keywordMentioned ?? null,
              importance: analysis.importance,
              summary: analysis.summary,
              authorName: item.author?.name || null,
              publishedAt: item.publishedAt || null,
              keywordId: matchedKeyword.id
            },
            include: { keyword: true }
          });

          newHotspotsCount++;
          processed++;
          console.log(`  ✅ New hotspot [rss]: ${hotspot.title.slice(0, 40)}... (${analysis.importance})`);

          // 创建通知
          await prisma.notification.create({
            data: {
              type: 'hotspot',
              title: `发现新热点: ${hotspot.title.slice(0, 50)}`,
              content: analysis.summary || hotspot.content.slice(0, 100),
              hotspotId: hotspot.id
            }
          });

          // WebSocket 通知
          io.to(`keyword:${matchedKeyword.text}`).emit('hotspot:new', hotspot);
          io.emit('notification', {
            type: 'hotspot',
            title: '发现新热点',
            content: hotspot.title,
            hotspotId: hotspot.id,
            importance: hotspot.importance
          });

          // 邮件通知
          if (['high', 'urgent'].includes(analysis.importance)) {
            await sendHotspotEmail(hotspot);
          }
        } catch (error) {
          console.error(`  Error processing RSS item:`, error);
        }
      }

      // 更新最后检查时间
      await prisma.rssFeed.update({
        where: { id: feed.id },
        data: { lastChecked: new Date() }
      });

      console.log(`  Feed "${feed.name}" done: ${processed} new hotspots`);

      // 避免过快请求
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Error checking feed "${feed.name}":`, error);
    }
  }

  console.log(`\n✨ RSS check completed. Found ${newHotspotsCount} new hotspots.`);
}
