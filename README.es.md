> [Read in English -> README.md](./README.md)

# MetaSkill (`mtsk`) — Arquitecto Universal de Proyectos con IA

MetaSkill ayuda a un agente a elegir el siguiente paso verificable con las herramientas que el equipo ya usa. Puedes aplicarlo a una idea, una tarea en curso, una entrega o un traspaso. Cualquier agente que acepte texto puede usar el resumen. Para quienes quieran integración en el editor, el CLI incluye seis adaptadores.

**Desde el chat.** Comparte [SKILL.md](./SKILL.md) con tu agente y dile qué resultado buscas. Por ejemplo, «Estamos por publicar. Los criterios están en el ticket de entrega y las pruebas en nuestro informe de CI. Ayúdame a identificar qué queda por comprobar». Si el agente carece de acceso, pega los criterios y el resultado de la ejecución pertinente. Puede responder en la conversación.

---

## Instalación y Arranque Rápido

> **Estado de distribución:** El paquete **`mtsk`** (comandos `mtsk` y `metaskill`) está preparado para npm, **pendiente de publicación oficial en el registro público**. Mientras no se ejecute `npm publish`, instálalo o pruébalo directamente desde este repositorio o desde un paquete local (`npm pack`):

```bash
# 1. Clonar o entrar al repositorio de MetaSkill
npm install
npm run typecheck && npm run build

# 2. Enlazar globalmente en tu máquina (habilita `mtsk` y `metaskill`)
npm link

# 3. Desde la carpeta del proyecto que quieres revisar
mtsk assess --lang es
```

**Para un proyecto a punto de salir**, indica los equivalentes que usa tu equipo. Los valores de `--use` son referencias de texto. Puedes repetir la opción para `rules` (instrucciones), `scope` (alcance), `state` (seguimiento), `checks` (pruebas) o `release` (entrega).

```bash
mtsk assess --lang es --stage release --use "scope=Ticket de entrega RC-8" --use "checks=scripts/comprobar-entrega.ps1"
```

Pega el resumen en tu agente. El comando localiza nombres habituales y distingue lo encontrado de lo indicado por el equipo. No ejecuta scripts, consulta tableros ni escribe archivos. El agente puede comparar los criterios con los resultados que le compartas. Si todo está cubierto, el resultado puede ser simplemente una revisión de la entrega.

Elige `--stage start` para definir la primera entrega, `develop` para avanzar una tarea, `release` para revisar una versión o `maintain` para corregir o traspasar trabajo. En una carpeta con trabajo existente, la etapa queda abierta hasta que la indiques. Usa `mtsk init --dry-run` para previsualizar la instalación completa si la quieres adoptar, y `mtsk init` para aplicarla.

---

## Principios de Diseño

### 1. Primer Contacto Seguro (Modo Inicial de Solo Lectura)
- MetaSkill empieza como **asesor de solo lectura**. Propone en tu idioma qué archivos/comprobaciones necesita revisar y qué respuesta devolverá, inspecciona dentro del alcance acordado y entrega criterio útil **antes** de crear, modificar o instalar nada.
- **Proyecto nuevo (`greenfield`):** Recoge la idea en tus palabras (`<= 4` preguntas clave) y propone una primera entrega pequeña y utilizable antes de programar.
- **Proyecto existente (`brownfield`):** Revisa lo necesario para el objetivo actual, reutiliza el flujo del equipo y propone una incorporación solo si hay una carencia confirmada que afecta a la tarea.

### 2. Cuatro Ejes Independientes y Tres Alcances de Persistencia
Cambia en cualquier momento **perfil**, **idioma**, **ritmo de trabajo** y **permisos** con lenguaje natural (p. ej. *«Háblame como dev, en inglés y revísalo conmigo por hitos»*):

| Eje | Valores | Comportamiento |
| :--- | :--- | :--- |
| **Perfil (`persona`)** | `vibecoder` \| `dev` | Efectos concretos sin jerga vs. decisiones técnicas, costes y riesgos. |
| **Idioma (`language`)** | `auto` \| `en` \| `es` | Aplica desde la siguiente respuesta sin reescribir documentos previos. |
| **Ritmo (`autonomyMode`)** | `guided` \| `autonomous-long` | Revisión por hitos vs. unidades limpias autónomas con freno a los 3 fallos. |
| **Permisos (`permissionMode`)** | `read-only` (predeterminado) \| `scoped-write` \| `autonomous-green` | **Nunca escala** al cambiar de perfil, idioma o ritmo. |

- **Alcances de persistencia:** Aplicar solo en **esta conversación**, guardar en **este proyecto** (`.agents/metaskill.config.json`) o guardar opcionalmente para **futuros proyectos** con `mtsk prefs set` (`~/.mtsk/preferences.json`).
- Aprobar una recomendación, autorizar su implementación y convertirla en regla permanente son decisiones separadas salvo orden explícita.

### 3. Adaptadores Cercados, Detección de Conflictos e Idempotencia
- Repetir `mtsk init` conserva `persona`, `language`, `autonomyMode`, `permissionMode`, `agents`, `createdAt` y no convierte un proyecto nuevo vacío en `brownfield` solo por tener el andamiaje de MetaSkill.
- Todo bloque gestionado en `AGENTS.md`, `.gitignore`, `.cursor/rules/*.mdc`, `CLAUDE.md`, `.claude/skills/metaskill/SKILL.md`, `.windsurf/rules/metaskill.md`, `.gemini/GEMINI.md` y `.clinerules/metaskill.md` usa **bloques cercados** rastreados por hash SHA-256 en `.agents/.metaskill-managed.json`.
- Si modificas manualmente un bloque de MetaSkill, `mtsk sync` **conserva tus cambios intactos y reporta el conflicto** (puedes auditar sin escribir usando `mtsk sync --check`, o refrescar solo el bloque cercado con `mtsk sync --force`).
- Los archivos de la skill incluida en `.agents/skills/metaskill/` también se rastrean por hash: si editas uno, se reporta el conflicto en lugar de reemplazarlo (`mtsk sync --force` restaura la versión incluida).
- `.agents/probe-profile.json` contiene rutas locales y datos del equipo, por eso el bloque gestionado de `.gitignore` lo excluye del control de versiones.

### 4. Criterio, Crítica Profesional y Cierre de Requisitos
- **Recomendaciones:** Responden *qué conviene hacer*, *por qué encaja con la visión del usuario* y *qué evidencia cambiaría la conclusión*.
- **Crítica profesional:** Se aplica a ideas del usuario y al propio trabajo del agente, diferenciando **defectos demostrados**, **riesgos que merecen prueba** y **elecciones deliberadas de estilo**.
- `mtsk doctor` comprueba la preparación del entorno. Para aceptar una entrega, cita evidencia del resultado en el informe del equipo o en `preview/` si usas la estructura de MetaSkill.
- Cierra cada requisito como **`verified`**, **`pending`** o **`blocked`**. Comparte el traspaso en el chat o guárdalo, con autorización, en el sistema de seguimiento del equipo.

### 5. Aprendizaje Mínimo y Economía de Atención
- **Fallo detectable automáticamente** -> Prueba de regresión (ej. verificar que una regla del equipo sobrevive a dos `mtsk sync`).
- **Decisión recurrente con criterio** -> Actualizar skill existente o proponer una nueva (`<= 180` líneas) con **vista previa antes de escribir**, disparador, comprobaciones, 1 ejemplo, 1 excepción y método de validación.
- **Preferencia puntual** -> Respetarla en la tarea actual sin llenar el proyecto de reglas.
- La respuesta predeterminada es la más corta que permita entender y decidir, comunicando siempre cualquier riesgo decisivo.

---

## Garantías Honestas por Editor

| Editor | Lee `AGENTS.md` automático | Skills progresivas (`.agents/skills/`) | Cumplimiento de permisos | Puntos de entrada |
| :--- | :--- | :--- | :--- | :--- |
| **Claude Code** | No (vía `CLAUDE.md`) | Sí | Prompts/sandbox del editor + instrucciones | `CLAUDE.md`, `.claude/skills/metaskill/SKILL.md` |
| **Cursor** | Sí | Sí | Ajustes de Auto-Run del editor + instrucciones | `.cursor/rules/metaskill-*.mdc`, `AGENTS.md` |
| **Antigravity** | Sí | Sí | Controles de workspace/sandbox + instrucciones | `.gemini/GEMINI.md`, `.agents/skills/`, `AGENTS.md` |
| **Codex** | Sí | Sí | Modos sandbox OS (`read-only`/`workspace-write`) + instrucciones | `AGENTS.md`, `.agents/skills/` |
| **Windsurf** | No | No (lectura explícita) | Solo por instrucción (advisory) | `.windsurf/rules/metaskill.md` |
| **Cline** | No | No (lectura explícita) | Interruptores de auto-aprobación + instrucciones | `.clinerules/metaskill.md` |

---

## Dominios Piloto Incluidos (Hito 1)

| Playbook de Dominio | Motores Orquestados | Evidencia Obligatoria (`preview/`) |
| :--- | :--- | :--- |
| **App Web Full Stack** (`playbooks/web-fullstack.md`) | TypeScript, Next.js / React+Vite, Playwright / HTTP | `typecheck`, `build`, tests, interacción real (`0` errores 5xx/consola) + capturas o log en `preview/` |
| **Videos y Audios Multimodal** (`playbooks/video-audio-multimodal.md`) | FFmpeg, FFprobe, SoX, Remotion, Python vía `uv` | Streams `ffprobe` (`yuv420p`, `48000 Hz`), `-14/-16 LUFS`, `inputs/` inmutable y `preview/contact-sheet.png` |
| **Bases de Datos y AppSec Defensivo** (`playbooks/db-appsec-defensive.md`) | PostgreSQL / SQLite, Drizzle / Prisma, RLS, `gitleaks`, `semgrep`, `osv-scanner` | Migraciones declarativas, RLS `default-deny` e integridad, DAST solo en `localhost`/Docker y `preview/security-report.md` |

---

## Referencia del CLI

| Comando | Uso |
| :--- | :--- |
| `mtsk` o `mtsk assess` | Resumen portátil de solo lectura (`--dir`, `--stage`, `--use`, `--lang en\|es`, `--json`). Funciona sin inicializar el proyecto. |
| `mtsk init` | Configuración guiada (en español desde la pregunta 1 si eliges `Español`) o por flags (`--persona`, `--domains`, `--agents`, `--autonomy`, `--permissions`, `--lang`, `--yes`, `--no-git`, `--dry-run`, `--force`, `--save-global`) |
| `mtsk probe` | Sondeo determinista de solo lectura de OS, CPU/RAM, GPU/VRAM, IDEs y CLIs (`--json`, `--write`) |
| `mtsk doctor` | Diagnóstico de preparación del entorno: salud canónica, `AGENTS.md <= 100` líneas, deriva/conflictos de adaptadores, sugerencias por OS, matriz de editores y hardware (`--domain`, `--json`) |
| `mtsk sync` | Sincronización idempotente y segura contra conflictos (`--check`, `--force`, `--agents`, `--domains`, `--persona`, `--lang`, `--autonomy`, `--permissions`) |
| `mtsk prefs` | Consultar (`show`), guardar (`set`) o borrar (`clear`) preferencias globales opcionales (`~/.mtsk/preferences.json`) |

---

## Suite de Evaluación y Piloto con Usuarios

- **`evals/`:** Escenarios reproducibles y rúbricas binarias para auditar revisión *brownfield*, objeción profesional con evidencia, entregas sin verificar y cambio de preferencias sin escalar permisos (`npm test` valida contratos y cero mutaciones en modo lectura).
- **`docs/USER_PILOT_GUIDE.md`:** Guion moderado, ficha de registro y criterios de lanzamiento para el piloto con 5 usuarios reales.

---

## Hoja de Ruta Open-Core

- **Hito 1 (Este Repositorio — Apache-2.0):** CLI local (`mtsk`), cerebro MetaSkill con inicio de solo lectura, 4 ejes independientes, adaptadores con bloques cercados y detección de conflictos para 6 IDEs, 3 playbooks piloto, catálogo semilla verificado (`radar/seed-registry.json`) y contratos de evaluación.
- **Hito 2 (Plataforma Web Futura):** Canvas visual de pipelines sin terminal, registro de Skills/MCPs auditado continuamente con matriz `OS x Agente` y estimador de costes sobre los esquemas Zod exportados en `mtsk/schemas`.

---

## Contribuir y Licencia

Las contribuciones de nuevos playbooks, evaluaciones o entradas verificadas para `radar/seed-registry.json` son bienvenidas — consulta [CONTRIBUTING.md](./CONTRIBUTING.md).
Licenciado bajo **Apache License 2.0** ([LICENSE](./LICENSE)).
