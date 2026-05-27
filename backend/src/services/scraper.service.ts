import axios from "axios";
import * as cheerio from "cheerio";

const BING_ASYNC_URL = "https://www.bing.com/images/async";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
  // Bing's `adlt=strict` query param alone is unreliable on server IPs — the cookie is the authoritative SafeSearch signal.
  Cookie: "SRCHHPGUSR=ADLT=STRICT&NEWWNDW=1; _EDGE_S=ui=es-es; _EDGE_CD=u=es-es&m=es-es"
};

class ScraperService {
  async searchImages(query: string, limit: number): Promise<string[]> {
    const count = Math.max(limit, 1);

    const response = await axios.get(BING_ASYNC_URL, {
      params: {
        q: query,
        first: 0,
        count,
        adlt: "strict",
        safeSearch: "Strict"
      },
      headers: HEADERS,
      timeout: 10000
    });

    const $ = cheerio.load(response.data as string);
    const seen = new Set<string>();
    const results: string[] = [];

    // Parse thumbnail URLs from Bing's JSON-embedded anchor elements.
    // turl is served from th.bing.com (Bing's own CDN), already filtered by SafeSearch.
    $("a.iusc").each((_idx, element) => {
      const raw = $(element).attr("m");
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as { turl?: string; murl?: string };
        const url = parsed.turl || parsed.murl;
        if (url && url.startsWith("http") && !seen.has(url)) {
          seen.add(url);
          results.push(url);
        }
      } catch {
        // ignore malformed JSON
      }
    });

    // Fallback: also pick up any directly rendered img.mimg thumbnails
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
