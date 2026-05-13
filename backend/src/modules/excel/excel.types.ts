export type ExcelProduct = {
  code: string;
  name: string;
};

export type ExcelReadResult = {
  products: ExcelProduct[];
  skippedRows: number;
};
