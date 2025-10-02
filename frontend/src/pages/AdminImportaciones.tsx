import { useCallback, useMemo, useRef, useState, type ChangeEvent } from "react";
import { AlertCircle, CheckCircle2, FileDown, Loader2, Upload } from "lucide-react";

import { Button, Card } from "../components/ui";
import {
  descargarPlantillaParticipantes,
  importarParticipantes,
  type ImportSummary,
} from "../services/importaciones";

type ImportStatus = "idle" | "uploading" | "downloading";

export default function AdminImportaciones() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const importing = status === "uploading";
  const downloading = status === "downloading";

  const selectFile = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const [file] = event.target.files ?? [];
    setSelectedFile(file ?? null);
    setErrorMessage(null);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      setErrorMessage("Selecciona un archivo CSV o Excel antes de importar");
      return;
    }

    setStatus("uploading");
    setErrorMessage(null);

    try {
      const result = await importarParticipantes(selectedFile);
      setSummary(result);
      setLastRun(new Date());
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSelectedFile(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo completar la importación. Inténtalo nuevamente.";
      setErrorMessage(message);
    } finally {
      setStatus("idle");
    }
  }, [selectedFile]);

  const handleDownload = useCallback(async () => {
    setStatus("downloading");
    setErrorMessage(null);

    try {
      const blob = await descargarPlantillaParticipantes();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "plantilla_regasis.xlsx";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo descargar la plantilla. Inténtalo nuevamente.";
      setErrorMessage(message);
    } finally {
      setStatus("idle");
    }
  }, []);

  const hasErrors = (summary?.errors.length ?? 0) > 0;

  const metrics = useMemo(
    () => [
      { label: "Registros procesados", value: summary?.total ?? 0 },
      { label: "Creados", value: summary?.created ?? 0 },
      { label: "Actualizados", value: summary?.updated ?? 0 },
      { label: "Errores", value: summary?.errors.length ?? 0 },
    ],
    [summary],
  );

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Importaciones</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={handleUpload} disabled={importing || downloading}>
            {importing ? <Loader2 className="mr-2 animate-spin" size={16} /> : <Upload size={16} />}
            Importar participantes
          </Button>
          <Button
            type="button"
            variant="accent"
            onClick={handleDownload}
            disabled={importing || downloading}
          >
            {downloading ? (
              <Loader2 className="mr-2 animate-spin" size={16} />
            ) : (
              <FileDown size={16} />
            )}
            Plantilla Excel
          </Button>
        </div>
      </header>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 space-y-4 lg:col-span-8">
          <Card className="space-y-4 p-4">
            <div>
              <p className="label">Archivo de participantes</p>
              <input
                ref={fileInputRef}
                type="file"
                className="input"
                accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={selectFile}
              />
              <p className="mt-2 text-xs text-gray-500">
                Formatos aceptados:
                <code className="ml-1 font-mono">
                  email,nombre,apellido,documento,proveedor,codigo_curso,rol_en_curso
                </code>
                <span className="ml-1">en CSV (UTF-8) o Excel (.xlsx).</span>
              </p>
              {selectedFile ? (
                <p className="mt-2 text-xs text-gray-600">Archivo seleccionado: {selectedFile.name}</p>
              ) : null}
            </div>
            {errorMessage ? (
              <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle size={18} className="mt-0.5" />
                <div>{errorMessage}</div>
              </div>
            ) : null}
            {lastRun ? (
              <p className="text-xs text-gray-500">
                Última ejecución: {lastRun.toLocaleString()}
              </p>
            ) : null}
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {hasErrors ? (
                <AlertCircle className="text-amber-500" size={18} />
              ) : summary ? (
                <CheckCircle2 className="text-emerald-500" size={18} />
              ) : null}
              <span>Resumen de resultados</span>
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600 md:grid-cols-4">
              {metrics.map((metric) => (
                <li key={metric.label} className="chip">
                  {metric.label}: {metric.value}
                </li>
              ))}
            </ul>
            {hasErrors ? (
              <div className="mt-4 space-y-2 text-sm text-red-700">
                <p className="font-medium">Detalle de errores</p>
                <ul className="space-y-1">
                  {summary?.errors.map((item) => (
                    <li key={item} className="rounded bg-red-50 px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {!summary ? (
              <p className="mt-4 text-xs text-gray-500">
                Ejecuta una importación para ver resultados y métricas en esta sección.
              </p>
            ) : null}
          </Card>
        </div>
        <div className="col-span-12 space-y-4 lg:col-span-4">
          <Card className="p-4">
            <div className="text-sm font-semibold">Buenas prácticas</div>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              <li>Valida duplicados en el CSV antes de subirlo.</li>
              <li>Utiliza la plantilla oficial para mantener los encabezados.</li>
              <li>Verifica los códigos de curso activos.</li>
            </ul>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-semibold">Seguridad</div>
            <p className="mt-1 text-sm text-gray-600">
              Las importaciones requieren un usuario con rol Administrador y quedan registradas en la
              auditoría del sistema.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}
