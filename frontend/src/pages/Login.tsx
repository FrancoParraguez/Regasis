import React, { useState } from "react";
import { Button, Card, Input, Label } from "../components/ui";
import { useAuth } from "../hooks/AuthProvider";

export default function Login(){
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@org");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent){
    e.preventDefault();
    setError(null); setLoading(true);
    try{ await login(email, password); }
    catch(err:any){ setError(err?.response?.data?.error || err.message); }
    finally{ setLoading(false); }
  }

  return (
    <div className="mx-auto mt-24 max-w-sm">
      <Card className="p-5">
        <h1 className="mb-3 text-lg font-semibold">Ingresar</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label>Correo</Label>
            <Input value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div>
            <Label>ContraseÃ±a</Label>
            <Input type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button disabled={loading}>{loading? "Ingresandoâ€¦" : "Entrar"}</Button>
        </form>
      </Card>
    </div>
  );
}
