import { Request, Response, NextFunction } from "express";
import fs from "fs";
import { paths } from "../config/paths";
import { excelService } from "../services/excel.service";
import { queueService } from "../services/queue.service";
import { scraperService } from "../services/scraper.service";
import { imageDownloaderService } from "../modules/image/image-downloader.service";

type ProductPayload = Array<{ code?: string; name?: string }>;
type ImportPayload = { products?: ProductPayload } | ProductPayload;

export async function uploadExcel(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Missing file" });
      return;
    }

    const products = await excelService.parseProducts(req.file.path);
    queueService.setProducts(products);

    res.json({ total: products.length });
  } catch (error) {
    next(error);
  }
}

export async function importProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = req.body as ImportPayload;
    const rawProducts = Array.isArray(payload) ? payload : payload?.products;

    if (!rawProducts || rawProducts.length === 0) {
      res.status(400).json({ error: "Missing products" });
      return;
    }

    const products = rawProducts
      .map((item) => ({
        code: String(item?.code || "").trim(),
        name: String(item?.name || "").trim()
      }))
      .filter((item) => item.code && item.name);

    if (products.length === 0) {
      res.status(400).json({ error: "No valid products" });
      return;
    }

    queueService.setProducts(products);

    res.json({ total: products.length });
  } catch (error) {
    next(error);
  }
}

export async function getNextProduct(_req: Request, res: Response, next: NextFunction) {
  try {
    const current = queueService.getCurrent();
    res.json({ current, index: queueService.getCurrentIndex(), total: queueService.getTotal() });
  } catch (error) {
    next(error);
  }
}

export async function getImages(req: Request, res: Response, next: NextFunction) {
  try {
    const current = queueService.getCurrent();
    if (!current) {
      res.status(404).json({ error: "No current product" });
      return;
    }

    const requested = Number(req.query.limit) || 40;
    const limit = Math.min(Math.max(requested, 1), 140);
    const images = await scraperService.searchImages(current.name, limit);
    queueService.cacheImages(
      current.code,
      images.map((image) => image.url)
    );

    res.json({ product: current, images });
  } catch (error) {
    next(error);
  }
}

export async function approveImage(req: Request, res: Response, next: NextFunction) {
  try {
    const current = queueService.getCurrent();
    if (!current) {
      res.status(404).json({ error: "No current product" });
      return;
    }

    const imageUrl = String(req.body?.imageUrl || "").trim();
    if (!imageUrl) {
      res.status(400).json({ error: "Missing imageUrl" });
      return;
    }

    const fallbackUrl = String(req.body?.fallbackUrl || "").trim() || undefined;

    const result = await imageDownloaderService.downloadResizeAndConvert({
      imageUrl,
      code: current.code,
      fallbackUrl
    });
    queueService.markApproved(current.code, imageUrl);
    queueService.advance();

    res.json({ savedAs: result.outputPath, next: queueService.getCurrent() });
  } catch (error) {
    next(error);
  }
}

export async function skipProduct(_req: Request, res: Response, next: NextFunction) {
  try {
    const current = queueService.getCurrent();
    if (!current) {
      res.status(404).json({ error: "No current product" });
      return;
    }

    queueService.markSkipped(current.code);
    queueService.advance();

    res.json({ next: queueService.getCurrent() });
  } catch (error) {
    next(error);
  }
}

export async function goToPrevious(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = queueService.goBack();
    if (!result) {
      res.status(400).json({ error: "Already at first product" });
      return;
    }
    if (result.wasApproved) {
      await imageDownloaderService.deleteImage(result.code);
    }
    const current = queueService.getCurrent();
    res.json({ current, index: queueService.getCurrentIndex(), total: queueService.getTotal() });
  } catch (error) {
    next(error);
  }
}

export async function importDefaultProducts(_req: Request, res: Response, next: NextFunction) {
  try {
    const raw = await fs.promises.readFile(paths.defaultProductsJson, "utf-8");
    const parsed = JSON.parse(raw);
    const rawProducts = Array.isArray(parsed) ? parsed : parsed?.products;

    if (!rawProducts || rawProducts.length === 0) {
      res.status(400).json({ error: "No products in default JSON" });
      return;
    }

    const products = rawProducts
      .map((item: any) => ({
        code: String(item?.code || "").trim(),
        name: String(item?.name || "").trim()
      }))
      .filter((item: any) => item.code && item.name);

    queueService.setProducts(products);
    res.json({ total: products.length });
  } catch (error) {
    next(error);
  }
}

export async function getStatus(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(queueService.getStatus());
  } catch (error) {
    next(error);
  }
}

export async function gotoProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const index = Number(req.body?.index);
    if (isNaN(index)) {
      res.status(400).json({ error: "Missing index" });
      return;
    }
    const ok = queueService.goToIndex(index);
    if (!ok) {
      res.status(400).json({ error: "Índice fuera de rango" });
      return;
    }
    const current = queueService.getCurrent();
    res.json({ current, index: queueService.getCurrentIndex(), total: queueService.getTotal() });
  } catch (error) {
    next(error);
  }
}

export async function resetQueue(_req: Request, res: Response, next: NextFunction) {
  try {
    queueService.setProducts([]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

export async function checkCloudinaryImage(req: Request, res: Response, next: NextFunction) {
  try {
    const code = String(req.query.code || "").trim();
    if (!code) {
      res.status(400).json({ error: "Missing code" });
      return;
    }
    const url = await imageDownloaderService.getCloudinaryImageUrl(code);
    res.json({ url });
  } catch (error) {
    next(error);
  }
}
