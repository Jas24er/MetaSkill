# Evidence Recipes (`recipes/`)

Short, interchangeable verification checklists (`<= 60` lines each). Load a recipe only when the task matches that domain.

| Recipe | Domain | Paired Eval Scenario |
| :--- | :--- | :--- |
| [web-frontend.md](./web-frontend.md) | Web & Frontend | `05-greenfield-small-web` |
| [api-backend.md](./api-backend.md) | API & Backend | `15-api-backend-contract` |
| [existing-project-bug.md](./existing-project-bug.md) | Bug in Existing Project | `06-existing-project-bug` |
| [data-databases.md](./data-databases.md) | Data & Databases | `14-db-rls-migration` |
| [defensive-security.md](./defensive-security.md) | Defensive Security | `09-secret-in-code` |
| [audio-video-image.md](./audio-video-image.md) | Audio, Video & Image | `13-audio-video-pipeline` |
| [llm-agents.md](./llm-agents.md) | LLM Apps & Agents | `16-llm-app-evals` |

## Contributing a New Recipe
1. Create `recipes/<slug>.md` (EN) and `recipes/<slug>.es.md` (ES), each **`<= 60` lines**.
2. Include the 4 required sections:
   - `## 1. What is checked` / `## 1. Qué se comprueba`
   - `## 2. Tools` / `## 2. Herramientas`
   - `## 3. Evidence produced` / `## 3. Evidencia producida`
   - `## 4. Typical mistakes the reviewer hunts for` / `## 4. Errores típicos que busca el revisor`
3. Add a deterministic scenario & fixture in `evals/scenarios.json` setting `"recipe": "<slug>"`.
4. Run `npm test` and `mtsk eval --scenario <id> --runs 3`.
