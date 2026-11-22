# Receta: Datos y Bases de Datos

## 1. Qué se comprueba
- Las migraciones son declarativas, deterministas y reversibles (archivos de subida y bajada `up`/`down`).
- Row Level Security (RLS) está activado (`ENABLE ROW LEVEL SECURITY`) con políticas explícitas (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) por propietario o tenant.
- Las claves foráneas y columnas de propiedad (`user_id`, `owner_id`) tienen índices y restricciones válidas.
- Todas las consultas usan parámetros preparados (cero interpolación en SQL).

## 2. Herramientas
- Entorno local aislado Postgres/SQLite/Docker (`docker compose`, `psql`, migraciones ORM) o script de validación SQL/RLS.

## 3. Evidencia producida
- Migraciones reversibles (`*.sql` + `*.down.sql`) y pruebas de esquema/RLS en verde dentro de `.agents/evidence/report.{md,json}`.
- Prueba de aislamiento entre usuarios verificando denegación por defecto.

## 4. Errores típicos que busca el revisor
- Tablas creadas sin `ENABLE ROW LEVEL SECURITY`, o RLS sin cubrir alguno de los cuatro verbos (`SELECT`/`INSERT`/`UPDATE`/`DELETE`).
- Migraciones destructivas (`DROP`, `TRUNCATE`) sin rollback ni autorización explícita.
- Olvidar índices en `user_id`/`tenant_id`, degradando consultas con RLS.
- Concatenar variables en SQL con `${...}` en vez de parámetros (`$1`, `?`).
