import React from "react";
import { Card, Input, Label } from "../components/ui";
import { useAuth } from "../hooks/AuthProvider";

export default function Perfil(){
  const { user } = useAuth();
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Mi Perfil</h1>
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Label>Nombre</Label>
            <Input defaultValue={user?.name || "Usuario"}/>
          </div>
          <div>
            <Label>Correo</Label>
            <Input defaultValue={user?.email || ""}/>
          </div>
          <div>
            <Label>Rol</Label>
            <Input defaultValue={user?.role || ""} readOnly/>
          </div>
          <div>
            <Label>Proveedor</Label>
            <Input defaultValue={user?.providerId || ""} readOnly/>
          </div>
        </div>
      </Card>
    </section>
  );
}
