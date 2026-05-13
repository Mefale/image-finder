import path from "path";

const rootDir = process.cwd();

export const paths = {
  rootDir,
  uploadsDir: path.join(rootDir, "uploads"),
  tempDir: path.join(rootDir, "temp"),
  imagesDir: path.join(rootDir, "imagenes"),
  defaultProductsJson: path.join(rootDir, "src", "json", "products.json")
};
