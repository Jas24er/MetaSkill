# Recetas de Evidencia (`recipes/`)

Listas de comprobación cortas e intercambiables (`<= 60` líneas cada una). Cárgala solo cuando la tarea corresponda al dominio.

| Receta | Dominio | Escenario en `evals/` |
| :--- | :--- | :--- |
| [web-frontend.es.md](./web-frontend.es.md) | Web y Frontend | `05-greenfield-small-web` |
| [api-backend.es.md](./api-backend.es.md) | API y Backend | `15-api-backend-contract` |
| [existing-project-bug.es.md](./existing-project-bug.es.md) | Bug en Proyecto Existente | `06-existing-project-bug` |
| [data-databases.es.md](./data-databases.es.md) | Datos y Bases de Datos | `14-db-rls-migration` |
| [defensive-security.es.md](./defensive-security.es.md) | Seguridad Defensiva | `09-secret-in-code` |
| [audio-video-image.es.md](./audio-video-image.es.md) | Audio, Vídeo e Imagen | `13-audio-video-pipeline` |
| [llm-agents.es.md](./llm-agents.es.md) | Aplicaciones con LLM y Agentes | `16-llm-app-evals` |

## Cómo Aportar una Receta Nueva
1. Crea `recipes/<slug>.md` (EN) y `recipes/<slug>.es.md` (ES), cada una **`<= 60` líneas**.
2. Incluye las 4 secciones obligatorias:
   - `## 1. Qué se comprueba` / `## 1. What is checked`
   - `## 2. Herramientas` / `## 2. Tools`
   - `## 3. Evidencia producida` / `## 3. Evidence produced`
   - `## 4. Errores típicos que busca el revisor` / `## 4. Typical mistakes the reviewer hunts for`
3. Añade un escenario con fixture en `evals/scenarios.json` indicando `"recipe": "<slug>"`.
4. Ejecuta `npm test` y `mtsk eval --scenario <id> --runs 3`.
