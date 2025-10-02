import { Router } from "express";
import multer from "multer";
import { PrismaClient } from "@prisma/client";

import { requireRole } from "../middleware/auth.js";
import { parseCsv } from "../utils/csv.js";

const prisma = new PrismaClient();
const router = Router();
const upload = multer();

const TEMPLATE_HEADER = [
  "email",
  "nombre",
  "apellido",
  "documento",
  "proveedor",
  "codigo_curso",
  "rol_en_curso",
] as const;

const TEMPLATE_SAMPLE_ROW = [
  "participante@org.test",
  "Ana",
  "Pérez",
  "12345678",
  "Proveedor Demo",
  "CUR-001",
  "Alumno",
];

const TEMPLATE_COLUMN_WIDTHS = [28, 18, 18, 14, 22, 16, 16];

type TemplateRows = readonly (readonly string[])[];

function createTemplateWorkbook(): Buffer {
  const rows = [TEMPLATE_HEADER, TEMPLATE_SAMPLE_ROW] as const satisfies TemplateRows;
  const { values: sharedStringValues, indexMap: sharedStringIndex, totalCount: sharedCount } =
    createSharedStrings(rows);
  const sheetXml = buildSheetXml(rows, TEMPLATE_COLUMN_WIDTHS, sharedStringIndex);
  const sharedStringsXml = buildSharedStringsXml(sharedStringValues, sharedCount);
  const createdAt = new Date().toISOString();

  const entries = [
    {
      path: "[Content_Types].xml",
      data: toBuffer(`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`),
    },
    {
      path: "_rels/.rels",
      data: toBuffer(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`),
    },
    {
      path: "docProps/core.xml",
      data: toBuffer(`<?xml version="1.0" encoding="UTF-8"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Plantilla participantes</dc:title>
  <dc:subject>Importaciones Regasis</dc:subject>
  <dc:creator>Regasis</dc:creator>
  <cp:lastModifiedBy>Regasis</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:modified>
</cp:coreProperties>`),
    },
    {
      path: "docProps/app.xml",
      data: toBuffer(`<?xml version="1.0" encoding="UTF-8"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Excel</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs>
    <vt:vector size="2" baseType="variant">
      <vt:variant>
        <vt:lpstr>Worksheets</vt:lpstr>
      </vt:variant>
      <vt:variant>
        <vt:i4>1</vt:i4>
      </vt:variant>
    </vt:vector>
  </HeadingPairs>
  <TitlesOfParts>
    <vt:vector size="1" baseType="lpstr">
      <vt:lpstr>Plantilla</vt:lpstr>
    </vt:vector>
  </TitlesOfParts>
  <Company>Regasis</Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0300</AppVersion>
</Properties>`),
    },
    {
      path: "xl/workbook.xml",
      data: toBuffer(`<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <fileVersion appName="xl"/>
  <workbookPr date1904="false"/>
  <bookViews>
    <workbookView activeTab="0"/>
  </bookViews>
  <sheets>
    <sheet name="Plantilla" sheetId="1" r:id="rId1"/>
  </sheets>
  <calcPr calcId="171027"/>
</workbook>`),
    },
    {
      path: "xl/_rels/workbook.xml.rels",
      data: toBuffer(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`),
    },
    {
      path: "xl/styles.xml",
      data: toBuffer(`<?xml version="1.0" encoding="UTF-8"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1">
    <font>
      <sz val="11"/>
      <color theme="1"/>
      <name val="Calibri"/>
      <family val="2"/>
    </font>
  </fonts>
  <fills count="2">
    <fill>
      <patternFill patternType="none"/>
    </fill>
    <fill>
      <patternFill patternType="gray125"/>
    </fill>
  </fills>
  <borders count="1">
    <border>
      <left/>
      <right/>
      <top/>
      <bottom/>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`),
    },
    {
      path: "xl/worksheets/sheet1.xml",
      data: toBuffer(sheetXml),
    },
    {
      path: "xl/sharedStrings.xml",
      data: toBuffer(sharedStringsXml),
    },
  ];

  return createStoredZip(entries);
}

type SharedStringIndex = ReadonlyMap<string, number>;

function buildSheetXml(
  rows: TemplateRows,
  widths: readonly number[],
  sharedStringIndex: SharedStringIndex,
) {
  const columnsXml = widths
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join("");

  const hasCells = rows.length > 0 && rows[0]?.length && rows[0].length > 0;
  const dimensionRef = hasCells
    ? `A1:${columnName(rows[0].length - 1)}${rows.length}`
    : "A1";

  const rowsXml = rows
    .map((cells, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cellsXml = cells
        .map((value, colIndex) => {
          const reference = `${columnName(colIndex)}${rowNumber}`;
          const sharedIndex = sharedStringIndex.get(value) ?? 0;
          return `<c r="${reference}" t="s"><v>${sharedIndex}</v></c>`;
        })
        .join("");
      return `<row r="${rowNumber}">${cellsXml}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="${dimensionRef}"/>
  <sheetViews>
    <sheetView workbookViewId="0" tabSelected="1"/>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>${columnsXml}</cols>
  <sheetData>${rowsXml}</sheetData>
</worksheet>`;
}

function buildSharedStringsXml(strings: readonly string[], count: number) {
  const itemsXml = strings
    .map((value) => `<si><t>${escapeXml(value)}</t></si>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${count}" uniqueCount="${strings.length}">${itemsXml}</sst>`;
}

function createSharedStrings(rows: TemplateRows) {
  const indexMap = new Map<string, number>();
  const values: string[] = [];
  let totalCount = 0;

  for (const row of rows) {
    for (const cell of row) {
      totalCount += 1;
      if (!indexMap.has(cell)) {
        indexMap.set(cell, values.length);
        values.push(cell);
      }
    }
  }

  return { indexMap, values, totalCount } as const;
}

function columnName(index: number) {
  let value = index;
  let label = "";

  while (value >= 0) {
    label = String.fromCharCode((value % 26) + 65) + label;
    value = Math.floor(value / 26) - 1;
  }

  return label;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toBuffer(content: string) {
  return Buffer.from(content, "utf8");
}

type ZipEntry = {
  path: string;
  data: Buffer;
};

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 1) !== 0) {
        crc = 0xedb88320 ^ (crc >>> 1);
      } else {
        crc >>>= 1;
      }
    }
    table[index] = crc >>> 0;
  }

  return table;
})();

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    const index = (crc ^ byte) & 0xff;
    crc = CRC32_TABLE[index] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createStoredZip(entries: ZipEntry[]) {
  const fileSections: Buffer[] = [];
  const centralSections: Buffer[] = [];
  let offset = 0;
  const { time: dosTime, date: dosDate } = toDosDateTime(new Date());

  for (const entry of entries) {
    const fileName = Buffer.from(entry.path, "utf8");
    const crc = crc32(entry.data);
    const localHeader = Buffer.alloc(30);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(entry.data.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(fileName.length, 26);
    localHeader.writeUInt16LE(0, 28);

    fileSections.push(localHeader, fileName, entry.data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(entry.data.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(fileName.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralSections.push(centralHeader, fileName);

    offset += localHeader.length + fileName.length + entry.data.length;
  }

  const centralDirectorySize = centralSections.reduce((total, section) => total + section.length, 0);
  const centralDirectoryOffset = offset;

  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDirectorySize, 12);
  endRecord.writeUInt32LE(centralDirectoryOffset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...fileSections, ...centralSections, endRecord]);
}

function toDosDateTime(date: Date) {
  let year = date.getUTCFullYear();
  if (year < 1980) {
    year = 1980;
  }

  const dosTime =
    (date.getUTCHours() << 11) |
    (date.getUTCMinutes() << 5) |
    Math.floor(date.getUTCSeconds() / 2);
  const dosDate =
    ((year - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();

  return { time: dosTime & 0xffff, date: dosDate & 0xffff };
}

const TEMPLATE_BUFFER = createTemplateWorkbook();

router.post("/participantes", requireRole("ADMIN"), upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Archivo requerido" });
  }

  const rows = await parseCsv(req.file.buffer);
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  const requiredFields = ["email", "nombre", "proveedor", "codigo_curso"] as const;

  for (const [idx, row] of rows.entries()) {
    try {
      const missingFields = requiredFields.filter((field) => {
        const value = row[field];
        return typeof value !== "string" || value.trim().length === 0;
      });

      if (missingFields.length > 0) {
        throw new Error(`Faltan datos obligatorios (${missingFields.join(", ")})`);
      }

      const email = row.email.trim();
      const providerName = row.proveedor.trim();
      const courseCode = row.codigo_curso.trim();
      const provider = await prisma.provider.upsert({
        where: { name: providerName },
        update: {},
        create: { name: providerName },
      });

      const course = await prisma.course.findUnique({
        where: { code: courseCode },
      });

      if (!course) {
        throw new Error(`Curso ${courseCode} no existe`);
      }

      const firstName = row.nombre.trim();
      const lastName = typeof row.apellido === "string" ? row.apellido.trim() : "";
      const fullName = lastName ? `${firstName} ${lastName}` : firstName;
      const participant = await prisma.participant.upsert({
        where: { email },
        update: { name: fullName, providerId: provider.id },
        create: { email, name: fullName, providerId: provider.id },
      });

      const before = await prisma.enrollment.findUnique({
        where: {
          participantId_courseId: {
            participantId: participant.id,
            courseId: course.id,
          },
        },
      });

      if (before) {
        updated += 1;
      }

      await prisma.enrollment.upsert({
        where: {
          participantId_courseId: {
            participantId: participant.id,
            courseId: course.id,
          },
        },
        update: {},
        create: { participantId: participant.id, courseId: course.id },
      });

      if (!before) {
        created += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      errors.push(`Fila ${idx + 1}: ${message}`);
    }
  }

  res.json({ created, updated, errors, total: rows.length });
});

router.get("/participantes/plantilla", requireRole("ADMIN"), (_req, res) => {
  const buffer = TEMPLATE_BUFFER;
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", "attachment; filename=plantilla_regasis.xlsx");
  res.setHeader("Content-Length", buffer.length.toString());
  res.send(buffer);
});

export default router;
