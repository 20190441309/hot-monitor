import Parser from 'rss-parser';
import type { SearchResult } from '../types.js';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'HotMonitor/1.0 (RSS Reader)'
  }
});

export async function fetchRssFeed(url: string, feedName?: string): Promise<SearchResult[]> {
  try {
    const feed = await parser.parseURL(url);

    const items: SearchResult[] = (feed.items || []).slice(0, 20).map(item => ({
      title: item.title || 'Untitled',
      content: item.contentSnippet || item.content || item.summary || '',
      url: item.link || '',
      source: 'rss' as const,
      sourceId: item.guid || item.link || undefined,
      publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
      author: {
        name: item.creator || item.author || feed.title || feedName || 'Unknown',
        username: undefined,
        avatar: undefined,
        followers: undefined,
        verified: undefined
      }
    })).filter(item => item.url); // 过滤掉没有链接的条目

    return items;
  } catch (error) {
    console.error(`Failed to fetch RSS feed ${url}:`, error);
    return [];
  }
}
