import React, { useEffect, useState } from "react";
import { Button, Table } from "../components/ui";
import { listarMisCursos } from "../services/cursos";
import { listarNotasPorCurso, crearNota, GradeType } from "../services/notas";

export default function InstructorNotas(){
  const [cursoId, setCursoId] = useState<string>("");
  const [cursos, setCursos] = useState<{ id:string; code:string; name:string }[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ (async()=>{
    const cs = await listarMisCursos();
    const mapped = cs.map(c => ({ id: c.id, code: c.code, name: c.name }));
    setCursos(mapped);
    if(mapped[0]) setCursoId(mapped[0].id);
  })(); }, []);

  useEffect(()=>{ (async()=>{
    if(!cursoId) return; setLoading(true);
    try{
      const data = await listarNotasPorCurso(cursoId);
      setRows(data.map(d => ({ id: d.id, Participante: d.enrollment?.participant?.name || "", Tipo: d.type, Nota: d.score.toFixed(1), Fecha: d.date.slice(0,10) })));
    }finally{ setLoading(false); }
  })(); }, [cursoId]);

  async function agregar(){
    const enrollmentId = prompt("ID de inscripciÃ³n (enrollmentId):")?.trim();
    const type = (prompt("Tipo (P1,P2,EXAMEN,PRACTICA,OTRO):") || "P1").toUpperCase() as GradeType;
    const score = Number(prompt("Nota (1.0 a 7.0):") || "6.0");
    if(!enrollmentId || isNaN(score)) return;
    await crearNota({ enrollmentId, type, score });
    const data = await listarNotasPorCurso(cursoId);
    setRows(data.map(d => ({ id: d.id, Participante: d.enrollment?.participant?.name || "", Tipo: d.type, Nota: d.score.toFixed(1), Fecha: d.date.slice(0,10) })));
  }

  const columns = ["Participante","Tipo","Nota","Fecha"];
  const tableRows = rows.map(r => [r.Participante, r.Tipo, r.Nota, r.Fecha]);

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify_between gap-2">
        <h1 className="text-xl font-semibold">Notas</h1>
        <div className="flex items-center gap-2">
          <select className="input" value={cursoId} onChange={e=>setCursoId(e.target.value)}>
            {cursos.map(c => <option key={c.id} value={c.id}>{c.code} â€¢ {c.name}</option>)}
          </select>
          <Button onClick={agregar} disabled={!cursoId || loading}>{loading? '...' : 'Agregar nota'}</Button>
        </div>
      </header>
      <Table columns={columns} rows={tableRows} />
      <div className="text-xs text-gray-500">Rango permitido en backend: 1.0 a 7.0 â€¢ Tipos vÃ¡lidos: P1, P2, EXAMEN, PRACTICA, OTRO.</div>
    </section>
  );
}
