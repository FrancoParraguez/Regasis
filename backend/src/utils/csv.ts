import { parse } from "csv-parse";
export async function parseCsv(buffer: Buffer): Promise<Record<string,string>[]> {
  return new Promise((resolve, reject) => {
    const rows: Record<string,string>[] = [];
    const parser = parse({ columns: true, skip_empty_lines: true, trim: true });
    parser.on("readable", () => {
      let record; while ((record = parser.read()) !== null) rows.push(record);
    });
    parser.on("error", reject);
    parser.on("end", () => resolve(rows));
    parser.write(buffer); parser.end();
  });
}
