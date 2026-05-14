import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import sharp from "sharp";
import { paths } from "../../config/paths";
import { ensureDir, getOutputImagePath, sanitizeFileName } from "../../utils/file.util";
import { ImageDownloadRequest, ImageDownloadResult } from "./image-downloader.types";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export class ImageDownloaderService {
  private configured = false;
  private isProduction = process.env.ENV === "prod";

  private ensureCloudinaryConfig() {
    if (this.configured) {
      return;
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Missing Cloudinary env vars");
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });

    this.configured = true;
  }

  private getImageUrl(sku: string): string {
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    if (!cloud) {
      return "";
    }
    return `https://res.cloudinary.com/${cloud}/image/upload/mefale/products/${sku}.jpg`;
  }

  async getCloudinaryImageUrl(code: string): Promise<string | null> {
    const safeCode = sanitizeFileName(code);
    const fullPublicId = `mefale/products/${safeCode}`;
    this.ensureCloudinaryConfig();
    const resource = await cloudinary.api.resource(fullPublicId).catch(() => null);
    if (!resource) {
      return null;
    }
    return (resource.secure_url as string) || this.getImageUrl(safeCode);
  }

  async deleteImage(code: string): Promise<void> {
    const safeCode = sanitizeFileName(code);
    const fullPublicId = `mefale/products/${safeCode}`;
    if (this.isProduction) {
      this.ensureCloudinaryConfig();
      console.log(`[Cloudinary] deleteImage: intentando borrar "${fullPublicId}"`);
      const result = await cloudinary.uploader.destroy(fullPublicId, { invalidate: true, resource_type: "image" });
      console.log(`[Cloudinary] deleteImage resultado:`, result);
    } else {
      const localPath = getOutputImagePath(paths.imagesDir, code);
      await fs.promises.unlink(localPath).catch(() => {});
    }
  }

  async downloadResizeAndConvert(
    request: ImageDownloadRequest
  ): Promise<ImageDownloadResult> {
    const { imageUrl, code } = request;

    if (!imageUrl || !code) {
      throw new Error("Missing imageUrl or code");
    }

    const safeCode = sanitizeFileName(code);
    const folder = "mefale/products";

    try {
      const response = await axios.get<ArrayBuffer>(imageUrl, {
        responseType: "arraybuffer",
        timeout: 15000,
        maxContentLength: MAX_IMAGE_BYTES,
        validateStatus: (status) => status >= 200 && status < 300
      });

      const inputBuffer = Buffer.from(response.data);
      if (this.isProduction) {
        const fullPublicId = `${folder}/${safeCode}`;
        console.log(`[Cloudinary] Subiendo: public_id="${fullPublicId}" code="${code}"`);
        const outputBuffer = await sharp(inputBuffer)
          .jpeg({ quality: 100, mozjpeg: true })
          .toBuffer();

        this.ensureCloudinaryConfig();

        const existing = await cloudinary.api.resource(fullPublicId).catch(() => null);
        if (existing) {
          console.log(`[Cloudinary] Imagen encontrada - public_id: "${existing.public_id}", format: "${existing.format}"`);
          const destroyResult = await cloudinary.uploader.destroy(fullPublicId, { invalidate: true, resource_type: "image" });
          console.log(`[Cloudinary] Resultado destroy:`, destroyResult);
        }

        const result = await new Promise<{ secure_url?: string; url?: string }>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder,
              public_id: safeCode,
              overwrite: true,
              invalidate: true,
              resource_type: "image",
              format: "jpg"
            },
            (error, uploaded) => {
              if (error || !uploaded) {
                console.error(`[Cloudinary] Error al subir ${code}:`, error);
                reject(error || new Error("Cloudinary upload failed"));
                return;
              }
              console.log(`[Cloudinary] Resultado:`, {
                public_id: uploaded.public_id,
                secure_url: uploaded.secure_url,
                bytes: uploaded.bytes,
                existing: (uploaded as any).existing ?? false,
                version: uploaded.version,
              });
              resolve(uploaded);
            }
          );

          stream.end(outputBuffer);
        });

        const outputPath = result.secure_url || result.url || this.getImageUrl(safeCode);
        return { outputPath, bytes: outputBuffer.length };
      }

      ensureDir(paths.imagesDir);
      const outputPath = getOutputImagePath(paths.imagesDir, code);
      await sharp(inputBuffer)
        .jpeg({ quality: 100, mozjpeg: true })
        .toFile(outputPath);

      console.log(`[Local] Imagen guardada: ${outputPath}`);
      return { outputPath, bytes: inputBuffer.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Image download failed: ${message}`);
    }
  }
}

export const imageDownloaderService = new ImageDownloaderService();
