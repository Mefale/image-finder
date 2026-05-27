import axios from "axios";
import * as cheerio from "cheerio";

class ScraperService {
  async searchImages(query: string, limit: number) {
    const url = "https://www.bing.com/images/async";
    const params = { q: query, first: 0, count: Math.max(limit, 1) };

    const response = await axios.get(url, {
      params,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9,es;q=0.8"
      }
    });

    const $ = cheerio.load(response.data);
    const results: string[] = [];

    $("img.mimg").each((_idx, element) => {
      const src = $(element).attr("src") || $(element).attr("data-src");
      if (src && src.startsWith("http")) {
        results.push(src);
      }
    });

    return results.slice(0, limit);
  }
}

export const scraperService = new ScraperService();
