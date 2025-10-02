import { Card, Input, Label } from "../components/ui";
import { useAuth } from "../hooks/AuthProvider";

export default function Perfil() {
  const { user } = useAuth();
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Mi Perfil</h1>
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="profile-name">Nombre</Label>
            <Input id="profile-name" defaultValue={user?.name || "Usuario"} />
          </div>
          <div>
            <Label htmlFor="profile-email">Correo</Label>
            <Input id="profile-email" defaultValue={user?.email || ""} />
          </div>
          <div>
            <Label htmlFor="profile-role">Rol</Label>
            <Input id="profile-role" defaultValue={user?.role || ""} readOnly />
          </div>
          <div>
            <Label htmlFor="profile-provider">Proveedor</Label>
            <Input id="profile-provider" defaultValue={user?.providerId || ""} readOnly />
          </div>
        </div>
      </Card>
    </section>
  );
}
