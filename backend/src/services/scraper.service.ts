import axios from "axios";
import * as cheerio from "cheerio";

const BING_SEARCH_URL = "https://www.bing.com/images/search";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9,es;q=0.8"
};

class ScraperService {
  async searchImages(query: string, limit: number): Promise<string[]> {
    const count = Math.max(limit, 1);

    const response = await axios.get(BING_SEARCH_URL, {
      params: {
        q: query,
        first: 0,
        count,
        adlt: "strict"
      },
      headers: HEADERS,
      timeout: 10000
    });

    const $ = cheerio.load(response.data as string);
    const seen = new Set<string>();
    const results: string[] = [];

    // Bing serves ~70 a.iusc anchors with JSON-encoded `m` attribute on /images/search.
    // turl is the Bing-CDN thumbnail (ts*.mm.bing.net) — already SafeSearch-filtered, no external domains.
    $("a.iusc").each((_idx, element) => {
      const raw = $(element).attr("m");
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as { turl?: string };
        const url = parsed.turl;
        if (url && url.startsWith("http") && !seen.has(url)) {
          seen.add(url);
          results.push(url);
        }
      } catch {
        // malformed JSON — skip
      }
    });

    // Fallback: directly rendered thumbnails when iusc anchors aren't present.
    $("img.mimg").each((_idx, element) => {
      const src = $(element).attr("src") || $(element).attr("data-src");
      if (src && src.startsWith("http") && !seen.has(src)) {
        seen.add(src);
        results.push(src);
      }
    });

    return results.slice(0, count);
  }
}

export const scraperService = new ScraperService();
