-- Agrega la columna userId a la tabla AuditLog para enlazar los registros con los usuarios autenticados.
ALTER TABLE "AuditLog"
  ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Asegura que la columna permita valores nulos para compatibilidad con registros históricos.
ALTER TABLE "AuditLog"
  ALTER COLUMN "userId" DROP NOT NULL;

-- Declara la clave foránea hacia la tabla User si aún no existe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AuditLog_userId_fkey'
  ) THEN
    ALTER TABLE "AuditLog"
      ADD CONSTRAINT "AuditLog_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "User"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

-- Crea el índice para acelerar las consultas por usuario.
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog" ("userId");
