# Receta: API y Backend

## 1. Qué se comprueba
- Contrato del endpoint: códigos HTTP exactos (`200`/`201`, `400` en entrada inválida, `401`/`403` sin permiso, `404` si no existe).
- Estructura JSON de respuesta, campos obligatorios y mensajes de error claros.
- Validación de entradas frente a JSON corrupto, campos vacíos, tipos erróneos y valores límite sin excepciones sin capturar.

## 2. Herramientas
- Runner de pruebas del equipo (`node --test`, `vitest`, `jest`, `pytest`, `supertest`) contra el servidor/handler real.
- Validadores de esquema (`zod`, `pydantic`, OpenAPI).

## 3. Evidencia producida
- Ejecución de los tests de contrato en `.agents/evidence/report.{md,json}` mediante `mtsk verify`.
- Códigos HTTP y aserciones comprobadas tanto para entradas válidas como inválidas.

## 4. Errores típicos que busca el revisor
- JSON mal formado provocando `SyntaxError` sin capturar y devolviendo `500` en vez de `400`.
- Responder `200` ante un email inválido o campos obligatorios vacíos.
- Mockear el middleware de validación o probar solo funciones auxiliares en vez de la ruta HTTP real.
- Filtrar trazas de error, SQL o secretos en respuestas de error.
