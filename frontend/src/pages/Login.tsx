import React, { useState } from "react";
import axios from "axios";
import { Button, Card, Input, Label } from "../components/ui";
import { useAuth } from "../hooks/AuthProvider";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@org");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        if (data && typeof data === "object" && "error" in data) {
          setError(String((data as { error?: unknown }).error ?? "Error desconocido"));
        } else {
          setError(error.message);
        }
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Error desconocido");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-24 max-w-sm">
      <Card className="p-5">
        <h1 className="mb-3 text-lg font-semibold">Ingresar</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label>Correo</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Contraseña</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button disabled={loading}>{loading ? "Ingresando…" : "Entrar"}</Button>
        </form>
      </Card>
    </div>
  );
}
