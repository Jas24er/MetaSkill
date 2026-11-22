# MetaSkill (`mtsk`)

[English](./README.md)

> **Tu agente no te dice "listo" hasta demostrarlo.**

> [!WARNING]
> **Demo (v0.2.0).** MetaSkill todavía es una demo y le faltan pruebas antes de usarlo en serio. Por ahora el benchmark solo tiene datos válidos de Codex, Claude Code aún no se ha medido y el piloto con usuarios no se ha hecho. Puede haber cambios incompatibles: no lo uses todavía en trabajo de producción.

MetaSkill es una capa de calidad pequeña para agentes de IA que programan (**Claude Code**, **Codex**, **Antigravity**). Hace que el agente acuerde qué significa "terminado" antes de empezar, trabaje en pasos comprobables y cierre con un **informe de evidencia** revisado por un revisor independiente.

---

## El Ciclo: Antes · Durante · Después

**1. Antes — un contrato corto.** El agente convierte tu petición en 3–5 requisitos comprobables en `SPEC.md`:

```markdown
## Contrato
- REQ-1: POST /api/tasks rechaza un título vacío con 400 (comprobación: `npm test`)
- REQ-2: La página principal muestra la lista de tareas (comprobación: `file: preview/home.png`)
- Fuera de alcance: autenticación, cambios de estilo
```

**2. Durante — pasos comprobables.** Una unidad pequeña cada vez, ejecutando su comprobación. Se detiene tras 3 intentos fallidos y te pregunta en vez de adivinar. Nunca toca los originales de `inputs/` ni escribe secretos en el código.

**3. Después — revisión independiente y evidencia.** Un revisor separado (`mtsk review` o el subagente `metaskill-reviewer`) busca fallos y `mtsk verify` escribe `.agents/evidence/report.md` + `report.json`:

```markdown
| Requisito | Estado | Evidencia |
| :--- | :--- | :--- |
| REQ-1: POST /api/tasks rechaza título vacío | `verified` | `npm test` OK (1.2s) |
| REQ-2: La página muestra la lista | `pending` | no existe `preview/home.png` |
```

Cada requisito termina como **`verified`**, **`pending`** o **`blocked`**; ninguno desaparece en silencio.

---

## Resultados del Banco de Pruebas (con y sin MetaSkill)

<!-- BENCH:START -->
Las cifras vienen de [`evals/RESULTS.md`](./evals/RESULTS.md) (ejecución del 2026-11-22, 7 escenarios de receta × 3 repeticiones por variante) y de la línea base v0.1 [`evals/baseline-v0.1.json`](./evals/baseline-v0.1.json) (8 escenarios rápidos × 3 repeticiones). Un "False Done" más bajo es mejor.

| Ejecución | Host | False Done % (sin → con MetaSkill) | Criterios % (sin → con MetaSkill) | Tiempo | Tokens | Ejecuciones completadas |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| Recetas (2026-11-22) | Codex | 0% → 0% | 97,62% → 95,29% | +21,58% | +50,83% | 42/42 |
| Recetas (2026-11-22) | Antigravity | error | error | n/d | n/d | 0/42 (cuota agotada) |
| Recetas (2026-11-22) | Claude Code | sin ejecutar | sin ejecutar | — | — | pending-auth |
| Línea base v0.1 | Codex | 11,11% → 0% | 82,5% → 96,67% | +5,75% | +28,17% | 33/48 |
| Línea base v0.1 | Antigravity | 0% → 13,64% | 80,87% → 82,45% | −8,07% | −0,38% | 45/48 |

Cómo leerlas:
- En la ejecución de recetas, Codex no declaró "listo" en falso en ninguna variante, así que no había nada que reducir. MetaSkill añadió un +21,58% de tiempo, por encima de nuestro límite del 20%.
- El juez de esa ejecución de Codex era Antigravity, que se quedó sin cuota: 40 de las 42 ejecuciones de Codex se puntuaron solo con comprobaciones deterministas, sin el juez LLM.
- En la línea base v0.1, MetaSkill bajó el "False Done" de Codex del 11,11% al 0%, pero Antigravity empeoró (0% → 13,64%).
- Claude Code aún no tiene cifras (la CLI no ha iniciado sesión).
<!-- BENCH:END -->

---

## Inicio Rápido (< 5 minutos)

**CLI (cualquier host):**

```bash
npx mtsk init            # mínimo: AGENTS.md, SPEC.md, .agents/skills/metaskill/, adaptador del host
npx mtsk contract validate
npx mtsk verify          # ejecuta las comprobaciones y escribe .agents/evidence/report.{md,json}
npx mtsk review          # sesión de revisión independiente (sin el razonamiento del autor)
```

`mtsk init --full` añade además `PROJECT_STATE.md`, `inputs/`, `preview/` y un perfil del equipo. En nuestra prueba de instalación empaquetada, instalar → `init` → `contract validate` → `verify` produjo un informe `verified` en 177 s, incluyendo `npm pack` y `npm install`.

**Estándar Agent Skills:** `npx skills add Jas24er/MetaSkill`

**Claude Code** (marketplace propio, [plugins/claude-code](./plugins/claude-code/README.md)):

```text
/plugin marketplace add Jas24er/MetaSkill
/plugin install metaskill@metaskill
```

Añade `/contract`, `/verify`, `/handoff`, el subagente `metaskill-reviewer`, un hook `SessionStart` (carga el contrato y el siguiente paso) y un hook `Stop` que bloquea el "listo" mientras falte evidencia.

**Codex:** `npx mtsk init --agents codex` — Codex lee `AGENTS.md` y `.agents/skills/metaskill/`; MetaSkill también escribe un perfil recomendado de solo lectura en `.codex/config.metaskill.toml` y hooks en `.codex/hooks.metaskill.json`. Revisión independiente: `mtsk review --host codex`.

**Antigravity:** `npx mtsk init --agents antigravity` — instala `.agents/skills/metaskill/` y `.agents/hooks.json`; el plugin en [plugins/antigravity](./plugins/antigravity/) añade skills de contrato, verificación y traspaso. Las capturas y grabaciones del navegador van en `preview/` y se citan en `.agents/evidence/`.

**GitHub Action** ([docs/GITHUB_ACTION.md](./docs/GITHUB_ACTION.md)):

```yaml
- uses: Jas24er/MetaSkill@main
  with:
    contract: SPEC.md
    post-pr-comment: "true"
```

---

## Recetas de Evidencia

Listas cortas (≤ 60 líneas, EN + ES) que se cargan solo cuando la tarea corresponde — ver [recipes/README.es.md](./recipes/README.es.md):
[Web y frontend](./recipes/web-frontend.es.md) · [API y backend](./recipes/api-backend.es.md) · [Bug en proyecto existente](./recipes/existing-project-bug.es.md) · [Datos y bases de datos](./recipes/data-databases.es.md) · [Seguridad defensiva](./recipes/defensive-security.es.md) · [Audio, vídeo e imagen](./recipes/audio-video-image.es.md) · [Aplicaciones con LLM y agentes](./recipes/llm-agents.es.md)

---

## Insignia "Verified with MetaSkill" (opcional)

```markdown
[![Verified with MetaSkill](https://img.shields.io/badge/verified%20with-MetaSkill-2ea44f)](./.agents/evidence/report.md)
```

Enlázala a tu último `.agents/evidence/report.md` para que cualquiera vea qué se comprobó realmente.

---

## En Pausa (sigue funcionando, no crece)

Hasta que los tres hosts principales estén sólidos: catálogo `radar/`, `mtsk probe`, `mtsk prefs`, adaptadores de Cursor / Windsurf / Cline y cualquier plataforma web.

---

## Más

- Guía del piloto: [docs/USER_PILOT_GUIDE.es.md](./docs/USER_PILOT_GUIDE.es.md) ([EN](./docs/USER_PILOT_GUIDE.md))
- Banco de pruebas: [evals/README.md](./evals/README.md) · Contribuir: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Licencia: **Apache-2.0** ([LICENSE](./LICENSE))
