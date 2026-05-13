import fs from "fs";
import sharp from "sharp";

class ImageService {
  async downloadAndConvert(imageUrl: string, outputPath: string) {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await sharp(buffer).webp({ quality: 82 }).toFile(outputPath);

    if (!fs.existsSync(outputPath)) {
      throw new Error("Image conversion failed");
    }
  }
}

export const imageService = new ImageService();
