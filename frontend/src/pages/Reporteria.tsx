import { useState, useMemo } from "react";
import { Button, Card, Input, Table } from "../components/ui";
import {
  reporteAsistencia,
  reporteCalificaciones,
  type AttendanceReportDTO,
  type GradeReportDTO
} from "../services/reportes";
import { exportToXlsx } from "../utils/xlsx";

type ReportType = "asistencia" | "calificaciones" | "mixto";

type ReportRow = Record<string, string | number | undefined>;

function mapAttendanceRow(data: AttendanceReportDTO): ReportRow {
  return {
    Curso: data.session?.course?.code ?? "",
    Fecha: data.session?.date?.slice(0, 10) ?? "",
    Participante: data.enrollment?.participant?.name ?? "",
    Estado: data.state ?? "",
    Observación: data.observation ?? ""
  };
}

function mapGradeRow(data: GradeReportDTO): ReportRow {
  return {
    Curso: data.enrollment?.course?.code ?? "",
    Participante: data.enrollment?.participant?.name ?? "",
    Tipo: data.type ?? "",
    Nota: data.score ?? "",
    Fecha: data.date?.slice(0, 10) ?? ""
  };
}

export default function Reporteria() {
  const [tipo, setTipo] = useState<ReportType>("asistencia");
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  const columns = useMemo(
    () =>
      rows.length
        ? Object.keys(rows[0])
        : ["Curso", "Fecha", "Participante", "Estado/%"],
    [rows]
  );

  const tableRows = useMemo(
    () =>
      rows.length
        ? rows.map((row) =>
            columns.map((column) => String(row[column] ?? ""))
          )
        : [
            ["CUR-001", "2025-10-03", "Ana Soto", "P (100%)"],
            ["CUR-001", "2025-10-10", "Leandro Ruiz", "A (0%)"]
          ],
    [columns, rows]
  );

  async function consultar() {
    setLoading(true);
    try {
      const commonParams = { from: desde || undefined, to: hasta || undefined };
      if (tipo === "asistencia") {
        const data = await reporteAsistencia(commonParams);
        setRows(data.map(mapAttendanceRow));
      } else if (tipo === "calificaciones") {
        const data = await reporteCalificaciones(commonParams);
        setRows(data.map(mapGradeRow));
      } else {
        const attendance = await reporteAsistencia(commonParams);
        const grades = await reporteCalificaciones(commonParams);
        setRows([
          ...attendance.map((dato) => ({
            Tipo: "Asistencia",
            ...mapAttendanceRow(dato)
          })),
          ...grades.map((dato) => ({
            Tipo: "Calificación",
            ...mapGradeRow(dato)
          }))
        ]);
      }
    } finally {
      setLoading(false);
    }
  }

  function exportar() {
    exportToXlsx(
      `reporte-${tipo}-${new Date().toISOString().slice(0, 10)}.xlsx`,
      rows
    );
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Reportes</h1>
        <div className="flex items-center gap-2">
          <Button onClick={consultar}>
            {loading ? "Cargando…" : "Consultar"}
          </Button>
          <Button onClick={exportar} disabled={!rows.length}>
            Generar Excel
          </Button>
        </div>
      </header>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 space-y-4 lg:col-span-8">
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <label className="label" htmlFor="report-provider">
                  Proveedor
                </label>
                <Input
                  id="report-provider"
                  placeholder="(se usa provider del usuario si es REPORTER)"
                  readOnly
                />
              </div>
              <div>
                <label className="label" htmlFor="report-from">
                  Desde
                </label>
                <Input
                  id="report-from"
                  type="date"
                  value={desde}
                  onChange={(event) => setDesde(event.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="report-to">
                  Hasta
                </label>
                <Input
                  id="report-to"
                  type="date"
                  value={hasta}
                  onChange={(event) => setHasta(event.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="report-type">
                  Tipo
                </label>
                <select
                  id="report-type"
                  className="input"
                  value={tipo}
                  onChange={(event) =>
                    setTipo(event.target.value as ReportType)
                  }
                >
                  <option value="asistencia">Asistencia</option>
                  <option value="calificaciones">Calificaciones</option>
                  <option value="mixto">Mixto</option>
                </select>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <p className="text-sm font-semibold">Vista previa</p>
            <Table columns={columns} rows={tableRows} />
          </Card>
        </div>
        <div className="col-span-12 space-y-4 lg:col-span-4">
          <Card className="p-4">
            <div className="text-sm font-semibold">Alcance</div>
            <p className="mt-1 text-sm text-gray-600">
              Los usuarios con rol REPORTER sólo consultan su proveedor asignado
              (en backend).
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}
