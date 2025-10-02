import { parse } from "csv-parse";
import { read, utils } from "xlsx";

const CANDIDATE_DELIMITERS = [",", ";", "\t"] as const;

function detectDelimiter(buffer: Buffer): string {
  const preview = buffer.toString("utf8", 0, Math.min(buffer.length, 1024));
  const [firstLine = preview] = preview.replace(/^\ufeff/, "").split(/\r?\n/);

  let bestDelimiter = ",";
  let bestCount = -1;

  for (const delimiter of CANDIDATE_DELIMITERS) {
    const occurrences = firstLine.split(delimiter).length - 1;
    if (occurrences > bestCount) {
      bestDelimiter = delimiter;
      bestCount = occurrences;
    }
  }

  return bestCount > 0 ? bestDelimiter : ",";
}

function isLikelyXlsx(buffer: Buffer, mimetype?: string) {
  if (mimetype && mimetype.includes("spreadsheetml")) return true;
  // XLSX files are just zip files (PK header)
  return (
    buffer.length >= 4 &&
    buffer.slice(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
  );
}

function parseCsvBuffer(buffer: Buffer): Promise<Record<string, string>[]> {
  const delimiter = detectDelimiter(buffer);

  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter,
      bom: true // handles UTF-8 BOM correctly
    });

    parser.on("readable", () => {
      let record;
      while ((record = parser.read()) !== null) {
        rows.push(record);
      }
    });

    parser.on("error", reject);
    parser.on("end", () => resolve(rows));

    parser.write(buffer);
    parser.end();
  });
}

function parseXlsxBuffer(buffer: Buffer): Record<string, string>[] {
  const workbook = read(buffer, { type: "buffer", dense: true });
  const [firstSheetName] = workbook.SheetNames;
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  const table = utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false
  });

  if (table.length === 0) return [];

  const [headerRow, ...dataRows] = table;
  const headers = headerRow.map((value) =>
    typeof value === "string" ? value.trim() : String(value ?? "").trim()
  );

  return dataRows
    .map((cells) => {
      const record: Record<string, string> = {};
      let hasValue = false;

      for (let i = 0; i < headers.length; i++) {
        const key = headers[i];
        if (!key) continue;

        const rawValue = cells[i];
        const value =
          typeof rawValue === "string"
            ? rawValue.trim()
            : rawValue == null
            ? ""
            : String(rawValue).trim();

        if (value.length > 0) hasValue = true;
        record[key] = value;
      }

      return hasValue ? record : null;
    })
    .filter((r): r is Record<string, string> => r !== null);
}

export async function parseImportFile(
  buffer: Buffer,
  mimetype?: string
): Promise<Record<string, string>[]> {
  if (isLikelyXlsx(buffer, mimetype)) {
    return parseXlsxBuffer(buffer);
  }
  return parseCsvBuffer(buffer);
}

export async function parseCsv(
  buffer: Buffer,
  mimetype?: string
): Promise<Record<string, string>[]> {
  return parseImportFile(buffer, mimetype);
}
