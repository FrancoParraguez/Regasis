# Migraciones SQL

Este directorio contiene scripts SQL independientes de Prisma para actualizar el esquema de la base de datos.

## Ejecución manual

1. Conecta al contenedor o servidor donde se ejecuta PostgreSQL.
2. Ejecuta cada archivo en orden alfabético usando `psql`, por ejemplo:

   ```bash
   psql "$DATABASE_URL" -f backend/sql/migrations/0003_add_user_id_to_audit_log.sql
   ```

Los scripts están diseñados para ser idempotentes (`IF NOT EXISTS`) para que puedan ejecutarse en entornos ya provisionados.
