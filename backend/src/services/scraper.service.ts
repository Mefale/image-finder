import axios from "axios";
import * as cheerio from "cheerio";

const BING_ASYNC_URL = "https://www.bing.com/images/async";
const PAGE_SIZE = 35;
const MAX_PAGES = 4;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9,es;q=0.8"
};

class ScraperService {
  async searchImages(query: string, limit: number): Promise<string[]> {
    const target = Math.max(limit, 1);
    const results: string[] = [];
    const seen = new Set<string>();

    for (let page = 0; page < MAX_PAGES && results.length < target; page++) {
      const pageResults = await this.fetchPage(query, page);
      if (pageResults.length === 0) {
        break;
      }
      for (const url of pageResults) {
        if (seen.has(url)) continue;
        seen.add(url);
        results.push(url);
        if (results.length >= target) break;
      }
    }

    return results.slice(0, target);
  }

  private async fetchPage(query: string, page: number): Promise<string[]> {
    const response = await axios.get(BING_ASYNC_URL, {
      params: {
        q: query,
        first: page * PAGE_SIZE,
        count: PAGE_SIZE,
        adlt: "strict"
      },
      headers: HEADERS,
      timeout: 10000
    });

    return this.extractImageUrls(response.data as string);
  }

  private extractImageUrls(html: string): string[] {
    const $ = cheerio.load(html);
    const urls: string[] = [];

    $("a.iusc").each((_idx, element) => {
      const m = $(element).attr("m");
      if (!m) return;
      try {
        const parsed = JSON.parse(m) as { murl?: string; turl?: string };
        const candidate = parsed.murl || parsed.turl;
        if (candidate && this.isValidImageUrl(candidate)) {
          urls.push(candidate);
        }
      } catch {
        /* malformed JSON, skip */
      }
    });

    if (urls.length === 0) {
      $("img.mimg").each((_idx, element) => {
        const src = $(element).attr("src") || $(element).attr("data-src");
        if (src && this.isValidImageUrl(src)) {
          urls.push(src);
        }
      });
    }

    return urls;
  }

  private isValidImageUrl(url: string): boolean {
    if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
    if (url.includes("bing.com/th?")) return false;
    return true;
  }
}

export const scraperService = new ScraperService();
