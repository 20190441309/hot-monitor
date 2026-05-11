import axios from 'axios';
import * as cheerio from 'cheerio';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * 从目标页面提取 OG 图片 / Twitter 卡片图片
 * 返回图片 URL，失败返回 null
 */
export async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const { data: html } = await axios.get(url, {
      timeout: 8000,
      maxRedirects: 3,
      headers: { 'User-Agent': USER_AGENT },
      responseType: 'text',
    });

    const $ = cheerio.load(html);

    // 按优先级尝试多种 OG 图片来源
    const selectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]',
      'meta[property="twitter:image"]',
      'meta[itemprop="image"]',
    ];

    for (const sel of selectors) {
      const content = $(sel).attr('content');
      if (content && content.startsWith('http')) {
        return content;
      }
    }

    // 兜底：尝试 <link rel="image_src">
    const linkImg = $('link[rel="image_src"]').attr('href');
    if (linkImg && linkImg.startsWith('http')) {
      return linkImg;
    }

    return null;
  } catch {
    return null;
  }
}
