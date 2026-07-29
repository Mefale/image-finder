import axios from "axios";
import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Bing sirve como maximo ~35 resultados por request; para juntar mas hay que
// pedir varias paginas moviendo el offset `first`.
const PAGE_SIZE = 35;
const MAX_PAGES = 4;

// Sin estos parametros Bing sirve resultados SIN filtrar (verificado: el default
// devuelve el mismo set que safeSearch=off). Van los tres porque Bing usa el
// query param en el endpoint async y la cookie como respaldo de sesion.
const SAFE_SEARCH_PARAMS = { safeSearch: "strict", adlt: "strict" };
const SAFE_SEARCH_COOKIE = "SRCHHPGUSR=ADLT=STRICT";

export type ScrapedImage = {
  /** Imagen original en el sitio de origen (alta resolucion, puede fallar por hotlink) */
  url: string;
  /** Thumbnail del CDN de Bing: baja resolucion pero siempre descargable */
  thumbnail: string;
  width?: number;
  height?: number;
};

class ScraperService {
  async searchImages(query: string, limit: number): Promise<ScrapedImage[]> {
    const target = Math.max(limit, 1);
    const results: ScrapedImage[] = [];
    const seen = new Set<string>();

    for (let page = 0; page < MAX_PAGES && results.length < target; page += 1) {
      const html = await this.fetchPage(query, page * PAGE_SIZE);
      const parsed = this.parseImages(html);

      // Si una pagina no aporta nada nuevo no tiene sentido seguir paginando.
      let added = 0;
      for (const image of parsed) {
        if (seen.has(image.url)) continue;
        seen.add(image.url);
        results.push(image);
        added += 1;
        if (results.length >= target) break;
      }

      if (added === 0) break;
    }

    return results.slice(0, target);
  }

  private async fetchPage(query: string, first: number): Promise<string> {
    const response = await axios.get<string>("https://www.bing.com/images/async", {
      params: { q: query, first, count: PAGE_SIZE, ...SAFE_SEARCH_PARAMS },
      timeout: 15000,
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
        Cookie: SAFE_SEARCH_COOKIE
      }
    });

    return response.data;
  }

  private parseImages(html: string): ScrapedImage[] {
    const $ = cheerio.load(html);
    const images: ScrapedImage[] = [];

    // Los `img.mimg` vienen lazy-loaded (sin src usable). La metadata real esta
    // en el atributo `m` de los anchors `a.iusc`, como JSON.
    $("a.iusc").each((_idx, element) => {
      const raw = $(element).attr("m");
      if (!raw) return;

      try {
        const meta = JSON.parse(raw) as {
          murl?: string;
          turl?: string;
          md5?: string;
        };

        const original = typeof meta.murl === "string" ? meta.murl : "";
        const thumbnail = typeof meta.turl === "string" ? meta.turl : "";
        if (!original.startsWith("http") && !thumbnail.startsWith("http")) return;

        images.push({
          url: original.startsWith("http") ? original : thumbnail,
          thumbnail: thumbnail.startsWith("http") ? thumbnail : original
        });
      } catch {
        // Anchor con JSON malformado: lo ignoramos y seguimos.
      }
    });

    if (images.length > 0) {
      return images;
    }

    // Fallback por si Bing cambia el markup: tomamos los src directos que haya.
    $("img.mimg").each((_idx, element) => {
      const src = $(element).attr("src") || $(element).attr("data-src");
      if (src && src.startsWith("http")) {
        images.push({ url: src, thumbnail: src });
      }
    });

    return images;
  }
}

export const scraperService = new ScraperService();
