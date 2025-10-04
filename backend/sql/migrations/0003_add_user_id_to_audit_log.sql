-- Agrega la columna user_id a audit_log para enlazar los registros con los usuarios autenticados.
ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS user_id UUID;

-- Permite valores nulos para mantener compatibilidad con registros históricos.
ALTER TABLE audit_log
  ALTER COLUMN user_id DROP NOT NULL;

-- Declara la clave foránea hacia app_user si aún no existe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'audit_log_user_id_fkey'
  ) THEN
    ALTER TABLE audit_log
      ADD CONSTRAINT audit_log_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES app_user(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

-- Crea el índice para acelerar las consultas por usuario.
CREATE INDEX IF NOT EXISTS audit_log_user_id_idx ON audit_log (user_id);
