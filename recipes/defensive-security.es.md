# Receta: Seguridad Defensiva

## 1. Qué se comprueba
- Cero secretos, claves API, tokens o credenciales reales en el código fuente, tests o historial de Git.
- `.gitignore` excluye `.env` y `.env.*`, mientras `.env.example` documenta solo los nombres de las claves.
- Dependencias auditadas frente a vulnerabilidades conocidas (`osv-scanner` / `npm audit`).
- Análisis estático (`semgrep`) sin inyecciones, path traversal ni `exec` con interpolación de shell.
- Cualquier prueba activa se limita estrictamente a `localhost`, `127.0.0.1` o contenedores Docker locales propios.

## 2. Herramientas
- `gitleaks` (búsqueda de secretos), `osv-scanner` (vulnerabilidades en dependencias), `semgrep` (SAST).

## 3. Evidencia producida
- Resultado de los escáneres en `.agents/evidence/report.{md,json}` (y opcional `preview/security-report.md`).
- Protección confirmada de `.env` y diff libre de credenciales.

## 4. Errores típicos que busca el revisor
- Dejar claves (`sk_live_...`, `service_role`) en el código o expuestas al navegador (`NEXT_PUBLIC_*`).
- Subir archivos `.env` reales o imprimir secretos en logs.
- Usar `exec(...)` con cadenas de shell sobre entradas externas en lugar de `execFile` con `argv` estricto.
- Apuntar herramientas activas de escaneo fuera de `localhost`/Docker local.
