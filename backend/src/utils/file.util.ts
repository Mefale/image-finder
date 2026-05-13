import fs from "fs";
import path from "path";

export function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function getOutputImagePath(imagesDir: string, code: string) {
  const safeCode = sanitizeFileName(code);
  return path.join(imagesDir, `${safeCode}.jpg`);
}
