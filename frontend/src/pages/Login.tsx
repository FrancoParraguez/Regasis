import { useState, type FormEvent } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import { Button, Card, Input, Label } from "../components/ui";
import { useAuth } from "../hooks/AuthProvider";
import { DEFAULT_ROUTE } from "../routes/definitions";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@org");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(DEFAULT_ROUTE[user.role], { replace: true });
    } catch (unknownError) {
      if (axios.isAxiosError(unknownError)) {
        const data = unknownError.response?.data;
        if (data && typeof data === "object" && "error" in data) {
          setError(String((data as { error?: unknown }).error ?? "Error desconocido"));
        } else {
          setError(unknownError.message);
        }
      } else if (unknownError instanceof Error) {
        setError(unknownError.message);
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
            <Label htmlFor="email">Correo</Label>
            <Input id="email" value={email} autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Ingresando…" : "Entrar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
