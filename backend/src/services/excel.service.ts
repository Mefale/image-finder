import XLSX from "xlsx";
import { Product } from "../domain/product.types";

class ExcelService {
  async parseProducts(filePath: string): Promise<Product[]> {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return [];
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: ""
    });

    const products: Product[] = [];
    for (const row of rows) {
      const code = String(row.codigo || row.Codigo || row.CODIGO || "").trim();
      const name = String(row.nombre || row.Nombre || row.NOMBRE || "").trim();
      if (code && name) {
        products.push({ code, name });
      }
    }

    return products;
  }
}

export const excelService = new ExcelService();
