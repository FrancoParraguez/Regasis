import React, { useEffect, useState } from "react";
import { Button, Input, Table } from "../components/ui";
import { listarSesionesMias } from "../services/sesiones";
import { obtenerAsistencia, guardarAsistencia, AttendanceState } from "../services/asistencias";

export default function InstructorAsistencia(){
  const [sessionId, setSessionId] = useState<string>("");
  const [sesiones, setSesiones] = useState<{id:string; label:string}[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ (async()=>{
    const s = await listarSesionesMias();
    const mapped = s.map(x => ({ id: x.id, label: `${x.course?.code || ''} â€¢ ${x.date.slice(0,10)}` }));
    setSesiones(mapped);
    if(mapped[0]) setSessionId(mapped[0].id);
  })(); }, []);

  useEffect(()=>{ (async()=>{
    if(!sessionId) return; setLoading(true);
    try{ const a = await obtenerAsistencia(sessionId); setData(a); }
    finally{ setLoading(false); }
  })(); }, [sessionId]);

  function toggle(enrollmentId: string){
    setData(prev => prev.map(x => x.enrollment.id === enrollmentId ? { ...x, state: x.state === "PRESENTE" ? "AUSENTE" : "PRESENTE" } : x));
  }

  async function save(){
    const items = data.map(x => ({ enrollmentId: x.enrollment.id, state: x.state as AttendanceState, observation: x.observation || undefined }));
    await guardarAsistencia(sessionId, items);
  }

  const columns = ["Participante","Curso","Estado","Obs."];
  const rows = data.map(x => [
    <div key={x.id} className="flex items-center gap-2"><span className="dot"/><span className="font-medium">{x.enrollment.participant.name}</span></div>,
    x.enrollment.course.code,
    <Button key={x.enrollment.id+"btn"} onClick={()=>toggle(x.enrollment.id)} variant={x.state === 'PRESENTE'?"accent":"ghost"}>{x.state}</Button>,
    <Input key={x.enrollment.id+"obs"} defaultValue={x.observation || ''} onChange={(e)=> setData(prev => prev.map(y => y.enrollment.id===x.enrollment.id? { ...y, observation: e.target.value } : y)) }/>
  ]);

  return (
    <section className="space-y-4">
      <header className="flex flex_wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Asistencia</h1>
        <div className="flex items-center gap-2">
          <select className="input" value={sessionId} onChange={e=>setSessionId(e.target.value)}>
            {sesiones.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <Button onClick={save} disabled={!data.length || loading}>{loading? 'Guardandoâ€¦' : 'Guardar'}</Button>
        </div>
      </header>
      <Table columns={columns} rows={rows} />
    </section>
  );
}
