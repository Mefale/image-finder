import XLSX from "xlsx";
import { ExcelProduct, ExcelReadResult } from "./excel.types";

type RowRecord = Record<string, unknown>;

const CODE_KEYS = ["codigo", "Codigo", "CODIGO"] as const;
const NAME_KEYS = ["nombre", "Nombre", "NOMBRE"] as const;

function readCell(row: RowRecord, keys: readonly string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) {
      return String(value).trim();
    }
  }
  return "";
}

function isRowEmpty(row: RowRecord) {
  return Object.values(row).every((value) => String(value ?? "").trim() === "");
}

export class ExcelReaderService {
  readProducts(filePath: string): ExcelReadResult {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { products: [], skippedRows: 0 };
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<RowRecord>(sheet, { defval: "" });

    const products: ExcelProduct[] = [];
    let skippedRows = 0;

    for (const row of rows) {
      if (isRowEmpty(row)) {
        skippedRows += 1;
        continue;
      }

      const code = readCell(row, CODE_KEYS);
      const name = readCell(row, NAME_KEYS);

      if (!code || !name) {
        skippedRows += 1;
        continue;
      }

      products.push({ code, name });
    }

    return { products, skippedRows };
  }
}

export const excelReaderService = new ExcelReaderService();
