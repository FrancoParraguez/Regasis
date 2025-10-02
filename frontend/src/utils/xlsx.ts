import * as XLSX from "xlsx";

type XlsxRow = Record<string, string | number | boolean | null | undefined>;

export function exportToXlsx(filename: string, rows: XlsxRow[], sheetName = "Reporte") {
  const safeFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, safeFilename);
}
