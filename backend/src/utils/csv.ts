import { parse } from "csv-parse";

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

export async function parseCsv(buffer: Buffer): Promise<Record<string, string>[]> {
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
