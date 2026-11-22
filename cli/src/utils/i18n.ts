import type {
  AutonomyMode,
  DomainId,
  LanguagePreference,
  MetaSkillConfig,
  PermissionMode,
  Persona,
} from "../schemas/config.js";
import type { AgentId } from "../schemas/probe.js";

export type UiLocale = "en" | "es";

/** Resolves UI locale for CLI prompts and generated starter prose. */
export function resolveUiLanguage(lang: LanguagePreference): UiLocale {
  return lang === "es" ? "es" : "en";
}

export interface CliCopy {
  intro: string;
  cancelled: string;
  detectedEnvTitle: string;
  modeLabel: string;
  osLabel: string;
  ramLabel: string;
  gitLabel: string;
  yes: string;
  no: string;
  personaMessage: string;
  personaOptions: Record<Persona, { label: string; hint: string }>;
  domainsMessage: Record<Persona, string>;
  domainOptions: Record<DomainId, Record<Persona, string>>;
  agentsMessage: Record<Persona, string>;
  agentLabels: Record<AgentId, string>;
  autonomyMessage: Record<Persona, string>;
  autonomyOptions: Record<AutonomyMode, Record<Persona, string>>;
  permissionMessage: Record<Persona, string>;
  permissionOptions: Record<PermissionMode, Record<Persona, string>>;
  gitInitMessage: string;
  saveGlobalMessage: string;
  summaryTitle: string;
  dryRunTitle: string;
  createdLabel: string;
  updatedLabel: string;
  mergedLabel: string;
  unchangedLabel: string;
  preservedLabel: string;
  conflictsLabel: string;
  adaptersLabel: string;
  globalPrefsSavedLabel: string;
  conflictWarning: string;
  kickoffTitle: string;
  outro: string;
  outroDryRun: string;
  doctorScopeLabel: string;
  doctorScopeHint: string;
  doctorReadinessTitle: string;
  inputsReadme: string;
}

const EN_COPY: CliCopy = {
  intro: " MetaSkill — Proof Before Done ",
  cancelled: "MetaSkill setup cancelled.",
  detectedEnvTitle: "Detected Environment",
  modeLabel: "Mode",
  osLabel: "OS",
  ramLabel: "RAM",
  gitLabel: "Git",
  yes: "yes",
  no: "no",
  personaMessage: "Choose your profile:",
  personaOptions: {
    vibecoder: {
      label: "Plain Language",
      hint: "Clear steps, safe defaults, simple evidence reports",
    },
    dev: {
      label: "Developer",
      hint: "Technical trade-offs, CLI flags, explicit checks",
    },
  },
  domainsMessage: {
    vibecoder: "What are you building? (Space to select, Enter to confirm)",
    dev: "Select target domains:",
  },
  domainOptions: {
    "web-fullstack": {
      vibecoder: "Web App / Website (UI + real browser checks)",
      dev: "Web Full Stack (TypeScript, Next.js/Vite, Playwright QA)",
    },
    "video-audio": {
      vibecoder: "Videos & Audio (editing, captions, volume, previews)",
      dev: "Video & Audio (FFmpeg, Remotion, contact sheets)",
    },
    "db-appsec": {
      vibecoder: "Database & Security Protection (safe logins, leak checks)",
      dev: "Databases & Defensive Security (Postgres/RLS, gitleaks, semgrep, osv-scanner)",
    },
    custom: {
      vibecoder: "General project (works for any codebase or task)",
      dev: "General / custom project",
    },
  },
  agentsMessage: {
    vibecoder: "Which AI coding tool(s) will you use in this folder?",
    dev: "Target coding hosts for adapters:",
  },
  agentLabels: {
    "claude-code": "Claude Code (CLAUDE.md + .claude/skills)",
    cursor: "Cursor (.cursor/rules/*.mdc)",
    antigravity: "Antigravity / Gemini (.agents/skills + .gemini)",
    windsurf: "Windsurf (.windsurf/rules)",
    codex: "Codex (AGENTS.md + .agents/skills)",
    cline: "Cline (.clinerules)",
  },
  autonomyMessage: {
    vibecoder: "How should the AI pace its work with you?",
    dev: "Select work pace:",
  },
  autonomyOptions: {
    guided: {
      vibecoder: "Step-by-step milestones (review progress together)",
      dev: "Guided (pause at milestones & evidence reviews)",
    },
    "autonomous-long": {
      vibecoder: "Long runs (finishes unit, verifies proof, stops after 3 failed attempts)",
      dev: "Autonomous (verified units + stop after 3 failures + permission gates)",
    },
  },
  permissionMessage: {
    vibecoder: "What initial permission level should the AI start with?",
    dev: "Select initial permission tier:",
  },
  permissionOptions: {
    "read-only": {
      vibecoder: "Read-only advisor (recommended — inspects & proposes a contract before editing)",
      dev: "read-only (inspect, critique & propose contract; explicit order required to write)",
    },
    "scoped-write": {
      vibecoder: "Scoped edits (edit only the approved deliverable)",
      dev: "scoped-write (edit approved scope; risky actions still require permission)",
    },
    "autonomous-green": {
      vibecoder: "Autonomous in safe work (code & tests free; installs, deletes & deploys ask permission)",
      dev: "autonomous-green (code/tests/local commits free; external/destructive actions ask permission)",
    },
  },
  gitInitMessage: "Turn on automatic undo checkpoints (git init)? Recommended!",
  saveGlobalMessage: "Save defaults for future projects?",
  summaryTitle: "MetaSkill Installed",
  dryRunTitle: "MetaSkill Dry Run (No Files Written)",
  createdLabel: "Created",
  updatedLabel: "Updated",
  mergedLabel: "Merged safely",
  unchangedLabel: "Unchanged",
  preservedLabel: "Preserved",
  conflictsLabel: "Conflicts",
  adaptersLabel: "Host Adapters",
  globalPrefsSavedLabel: "Global defaults",
  conflictWarning:
    "Some managed MetaSkill blocks were edited outside MetaSkill and kept untouched. Review them or pass --force to refresh only the MetaSkill fenced blocks.",
  kickoffTitle: "Paste This Into Your AI Agent",
  outro: "Next: agree on a short contract in SPEC.md, then run checks before marking done.",
  outroDryRun: "Dry run complete — zero files were created or modified.",
  doctorScopeLabel: "Environment Readiness (does not prove deliverable quality)",
  doctorScopeHint: "Doctor verifies local tools & adapters, not that requirements pass.",
  doctorReadinessTitle: "Project & Evidence Readiness Notes",
  inputsReadme: [
    "INPUTS DIRECTORY — STRICTLY READ-ONLY",
    "",
    "Place raw media, datasets, or original fixtures here.",
    "Agents may read these files but MUST NEVER modify, overwrite, or delete originals.",
    "Store temporary intermediates in build/, heavy media evidence in preview/, and final exports in output/.",
    "",
  ].join("\n"),
};

const ES_COPY: CliCopy = {
  intro: " MetaSkill — Pruebas Antes de Decir Listo ",
  cancelled: "Configuración de MetaSkill cancelada.",
  detectedEnvTitle: "Entorno Detectado",
  modeLabel: "Modo",
  osLabel: "Sistema",
  ramLabel: "RAM",
  gitLabel: "Git",
  yes: "sí",
  no: "no",
  personaMessage: "Elige tu perfil:",
  personaOptions: {
    vibecoder: {
      label: "Lenguaje simple",
      hint: "Pasos claros, protecciones automáticas e informes fáciles de leer",
    },
    dev: {
      label: "Developer",
      hint: "Decisiones técnicas, flags CLI y comprobaciones explícitas",
    },
  },
  domainsMessage: {
    vibecoder: "¿Qué vas a construir? (Espacio para elegir, Enter para confirmar)",
    dev: "Selecciona los dominios:",
  },
  domainOptions: {
    "web-fullstack": {
      vibecoder: "App Web / Sitio (interfaz visual + pruebas reales en navegador)",
      dev: "App Web Full Stack (TypeScript, Next.js/Vite, Playwright QA)",
    },
    "video-audio": {
      vibecoder: "Videos y Audio (edición, subtítulos, volumen, vistas previas)",
      dev: "Video y Audio (FFmpeg, Remotion, hojas de miniaturas)",
    },
    "db-appsec": {
      vibecoder: "Base de Datos y Seguridad (accesos seguros, antifugas)",
      dev: "Bases de Datos y Seguridad Defensiva (Postgres/RLS, gitleaks, semgrep, osv-scanner)",
    },
    custom: {
      vibecoder: "Proyecto general (sirve para cualquier código o tarea)",
      dev: "Proyecto general / personalizado",
    },
  },
  agentsMessage: {
    vibecoder: "¿Con qué herramienta(s) de IA vas a abrir esta carpeta?",
    dev: "Herramientas destino para generar adaptadores:",
  },
  agentLabels: {
    "claude-code": "Claude Code (CLAUDE.md + .claude/skills)",
    cursor: "Cursor (.cursor/rules/*.mdc)",
    antigravity: "Antigravity / Gemini (.agents/skills + .gemini)",
    windsurf: "Windsurf (.windsurf/rules)",
    codex: "Codex (AGENTS.md + .agents/skills)",
    cline: "Cline (.clinerules)",
  },
  autonomyMessage: {
    vibecoder: "¿Con qué ritmo prefieres que trabaje la IA contigo?",
    dev: "Selecciona el ritmo de trabajo:",
  },
  autonomyOptions: {
    guided: {
      vibecoder: "Por pasos (revisamos avances y pruebas juntos)",
      dev: "Guiado (pausas por hitos y revisión de evidencia)",
    },
    "autonomous-long": {
      vibecoder: "Tramos largos (termina cada unidad, comprueba y para tras 3 fallos)",
      dev: "Autónomo (unidades comprobadas + parar tras 3 fallos + pedir permiso en acciones delicadas)",
    },
  },
  permissionMessage: {
    vibecoder: "¿Con qué permiso inicial debe empezar la IA?",
    dev: "Nivel inicial de permisos:",
  },
  permissionOptions: {
    "read-only": {
      vibecoder: "Solo lectura inicial (recomendado — revisa y propone contrato antes de editar)",
      dev: "read-only (inspecciona, critica y propone contrato; requiere orden explícita para editar)",
    },
    "scoped-write": {
      vibecoder: "Edición acotada (solo modifica el entregable aprobado)",
      dev: "scoped-write (edita el alcance aprobado; acciones delicadas siguen pidiendo permiso)",
    },
    "autonomous-green": {
      vibecoder: "Autónomo en trabajo seguro (código y tests libres; instalar, borrar o publicar pide permiso)",
      dev: "autonomous-green (código/tests/commits locales libres; acciones externas o destructivas piden permiso)",
    },
  },
  gitInitMessage: "¿Activar puntos de control automáticos para deshacer errores (git init)? ¡Recomendado!",
  saveGlobalMessage: "¿Guardar valores por defecto para futuros proyectos?",
  summaryTitle: "MetaSkill Instalado",
  dryRunTitle: "Simulación MetaSkill (Sin Escribir Archivos)",
  createdLabel: "Creados",
  updatedLabel: "Actualizados",
  mergedLabel: "Integrados",
  unchangedLabel: "Sin cambios",
  preservedLabel: "Conservados",
  conflictsLabel: "Conflictos",
  adaptersLabel: "Adaptadores",
  globalPrefsSavedLabel: "Preferencias globales",
  conflictWarning:
    "Algunos bloques de MetaSkill fueron modificados manualmente y se conservaron intactos. Revísalos o usa --force para actualizar solo los bloques cercados.",
  kickoffTitle: "Pega Esto en Tu Agente de IA",
  outro: "Siguiente paso: acuerda un contrato corto en SPEC.md y comprueba cada requisito antes de darlo por terminado.",
  outroDryRun: "Simulación completada — no se creó ni modificó ningún archivo.",
  doctorScopeLabel: "Preparación del entorno (no sustituye las pruebas del entregable)",
  doctorScopeHint: "Doctor verifica herramientas de la máquina y adaptadores, no que el contrato pase.",
  doctorReadinessTitle: "Notas de Preparación y Evidencia",
  inputsReadme: [
    "CARPETA INPUTS — ESTRICTAMENTE DE SOLO LECTURA",
    "",
    "Coloca aquí tus archivos originales (videos, audios, datos, documentos o fixtures).",
    "Los agentes pueden leer estos archivos, pero NUNCA deben modificarlos, sobrescribirlos ni borrarlos.",
    "Los archivos intermedios van en build/, la evidencia visual o multimedia en preview/ y las entregas finales en output/.",
    "",
  ].join("\n"),
};

export function getCliCopy(locale: UiLocale): CliCopy {
  return locale === "es" ? ES_COPY : EN_COPY;
}

export function buildKickoffPrompt(config: MetaSkillConfig): string {
  const isEs = config.language === "es";
  const permNoteEs =
    config.permissionMode === "read-only"
      ? "Empieza en modo asesoría de solo lectura: revisa sin modificar archivos y propón un contrato corto en SPEC.md antes de editar."
      : `Empieza respetando el permiso '${config.permissionMode}', acuerda el contrato corto en SPEC.md y demuestra cada requisito con evidencia real.`;
  const permNoteEn =
    config.permissionMode === "read-only"
      ? "Start in read-only advisory mode: inspect without modifying files and propose a short contract in SPEC.md before editing."
      : `Start under '${config.permissionMode}' permissions, agree on a short contract in SPEC.md, and prove each requirement before saying done.`;

  if (isEs) {
    return [
      "Actúa como MetaSkill siguiendo .agents/skills/metaskill/SKILL.md (Antes · Durante · Después).",
      "Reutiliza las instrucciones, el seguimiento y las pruebas que ya tiene el equipo.",
      `Permisos iniciales: '${config.permissionMode}' (${config.projectMode}).`,
      permNoteEs,
      "Ayúdame con este proyecto: [DESCRIBE AQUÍ QUÉ QUIERES LOGRAR O REVISAR].",
    ].join("\n");
  }

  return [
    "Act as MetaSkill following .agents/skills/metaskill/SKILL.md (Before · During · After).",
    "Reuse the team's existing instructions, tracker, and checks.",
    `Initial permissions: '${config.permissionMode}' (${config.projectMode}).`,
    permNoteEn,
    "Help me with this project: [DESCRIBE WHAT YOU WANT TO BUILD OR REVIEW HERE].",
  ].join("\n");
}
