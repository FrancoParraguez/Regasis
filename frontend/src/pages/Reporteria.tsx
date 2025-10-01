import React, { useState } from "react";
import { Button, Card, Input, Table } from "../components/ui";
import { reporteAsistencia, reporteCalificaciones } from "../services/reportes";
import { exportToXlsx } from "../utils/xlsx";

export default function Reporteria(){
  const [tipo, setTipo] = useState<'asistencia'|'calificaciones'|'mixto'>('asistencia');
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function consultar(){
    setLoading(true);
    try{
      if(tipo === 'asistencia'){
        const data = await reporteAsistencia({ from: desde || undefined, to: hasta || undefined });
        setRows(data.map((d:any) => ({
          Curso: d.session?.course?.code || "",
          Fecha: d.session?.date?.slice(0,10),
          Participante: d.enrollment?.participant?.name,
          Estado: d.state,
          Obs: d.observation || ""
        })));
      }else if(tipo === 'calificaciones'){
        const data = await reporteCalificaciones({ from: desde || undefined, to: hasta || undefined });
        setRows(data.map((d:any) => ({
          Curso: d.enrollment?.course?.code || "",
          Participante: d.enrollment?.participant?.name,
          Tipo: d.type,
          Nota: d.score,
          Fecha: d.date?.slice(0,10)
        })));
      }else{
        const A = await reporteAsistencia({ from: desde || undefined, to: hasta || undefined });
        const G = await reporteCalificaciones({ from: desde || undefined, to: hasta || undefined });
        setRows([
          ...A.map((d:any)=>({ Tipo: "Asistencia", Curso: d.session?.course?.code, Fecha: d.session?.date?.slice(0,10), Participante: d.enrollment?.participant?.name, Estado: d.state })),
          ...G.map((d:any)=>({ Tipo: "CalificaciÃ³n", Curso: d.enrollment?.course?.code, Fecha: d.date?.slice(0,10), Participante: d.enrollment?.participant?.name, Nota: d.score }))
        ]);
      }
    } finally { setLoading(false); }
  }

  function exportar(){
    exportToXlsx(`reporte-${tipo}-${new Date().toISOString().slice(0,10)}.xlsx`, rows);
  }

  const columns = rows.length ? Object.keys(rows[0]) : ["Curso","Fecha","Participante","Estado/%"];
  const tableRows = rows.length
    ? rows.map(r => columns.map(c => String(r[c] ?? "")))
    : [["CUR-001","2025-10-03","Ana Soto","P (100%)"],["CUR-001","2025-10-10","Leandro Ruiz","A (0%)"]];

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Reportes</h1>
        <div className="flex items-center gap-2">
          <Button onClick={consultar}>{loading? 'Cargandoâ€¦' : 'Consultar'}</Button>
          <Button onClick={exportar} disabled={!rows.length}>Generar Excel</Button>
        </div>
      </header>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <label className="label">Proveedor</label>
                <Input placeholder="(se usa provider del usuario si es REPORTER)" readOnly />
              </div>
              <div>
                <label className="label">Desde</label>
                <Input type="date" value={desde} onChange={e=>setDesde(e.target.value)} />
              </div>
              <div>
                <label className="label">Hasta</label>
                <Input type="date" value={hasta} onChange={e=>setHasta(e.target.value)} />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={tipo} onChange={e=>setTipo(e.target.value as any)}>
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
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Card className="p-4">
            <div className="text-sm font-semibold">Alcance</div>
            <p className="mt-1 text-sm text-gray-600">Los usuarios con rol REPORTER sÃ³lo consultan su proveedor asignado (en backend).</p>
          </Card>
        </div>
      </div>
    </section>
  );
}
