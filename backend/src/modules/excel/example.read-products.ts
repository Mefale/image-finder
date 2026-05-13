import path from "path";
import { excelReaderService } from "./excel.service";

const filePath = path.resolve(process.cwd(), "products.xlsx");

const result = excelReaderService.readProducts(filePath);

// eslint-disable-next-line no-console
console.log(`Loaded ${result.products.length} products. Skipped: ${result.skippedRows}`);
// eslint-disable-next-line no-console
console.log(result.products);
