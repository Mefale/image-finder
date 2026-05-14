import { Router } from "express";
import multer from "multer";
import path from "path";
import { paths } from "../config/paths";
import { ensureDir } from "../utils/file.util";
import {
  approveImage,
  checkCloudinaryImage,
  getImages,
  getNextProduct,
  getStatus,
  goToPrevious,
  importDefaultProducts,
  importProducts,
  skipProduct,
  uploadExcel
} from "../controllers/product.controller";

ensureDir(paths.uploadsDir);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, paths.uploadsDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${timestamp}-${safeName}`);
  }
});

const upload = multer({ storage });

export const productRouter = Router();

productRouter.post("/upload", upload.single("file"), uploadExcel);
productRouter.post("/import", importProducts);
productRouter.post("/import-default", importDefaultProducts);
productRouter.get("/next", getNextProduct);
productRouter.get("/images", getImages);
productRouter.post("/approve", approveImage);
productRouter.post("/skip", skipProduct);
productRouter.post("/previous", goToPrevious);
productRouter.get("/status", getStatus);
productRouter.get("/cloudinary-image", checkCloudinaryImage);
