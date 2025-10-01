﻿import * as XLSX from "xlsx";
export function exportToXlsx(filename: string, rows: Record<string, any>[], sheetName = "Reporte"){
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}
