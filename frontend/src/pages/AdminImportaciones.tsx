import { FileDown, Upload } from "lucide-react";

import { Button, Card } from "../components/ui";

export default function AdminImportaciones() {
  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Importaciones</h1>
        <div className="flex items-center gap-2">
          <Button>
            <Upload size={16} /> Importar CSV participantes
          </Button>
          <Button variant="accent">
            <FileDown size={16} /> Plantilla CSV
          </Button>
        </div>
      </header>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 space-y-4 lg:col-span-8">
          <Card className="p-4">
            <p className="label">Subir archivo</p>
            <input type="file" className="input" accept=".csv" />
            <p className="mt-2 text-xs text-gray-500">
              Formato: <code className="font-mono">email,nombre,apellido,documento,proveedor,codigo_curso,rol_en_curso</code>
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm font-semibold">Resumen de resultados</p>
            <ul className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600 md:grid-cols-4">
              <li className="chip">Creados: 12</li>
              <li className="chip">Actualizados: 3</li>
              <li className="chip">Errores: 1</li>
              <li className="chip">Tiempo: 1.2s</li>
            </ul>
          </Card>
        </div>
        <div className="col-span-12 space-y-4 lg:col-span-4">
          <Card className="p-4">
            <div className="text-sm font-semibold">Seguridad</div>
            <p className="mt-1 text-sm text-gray-600">JWT/OAuth2, HTTPS, contraseñas robustas.</p>
          </Card>
        </div>
      </div>
    </section>
  );
}
