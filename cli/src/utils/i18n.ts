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
  intro: " MetaSkill — Universal AI Project Architect ",
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
      label: "Vibecoder (No-code / Plain language)",
      hint: "Everyday questions, safe defaults, visual previews",
    },
    dev: {
      label: "Developer (Technical control)",
      hint: "Explicit stack trade-offs, CLI flags, granular rules",
    },
  },
  domainsMessage: {
    vibecoder: "What are you building? (Space to select, Enter to confirm)",
    dev: "Select target domain playbooks:",
  },
  domainOptions: {
    "web-fullstack": {
      vibecoder: "Web App / Website (visual UI + browser checks)",
      dev: "App Web Full Stack (TypeScript, Next.js/Vite, Playwright QA)",
    },
    "video-audio": {
      vibecoder: "Videos & Audio (editing, captions, loudness, previews)",
      dev: "Video & Audio Multimodal (FFmpeg, Remotion, uv, contact sheets)",
    },
    "db-appsec": {
      vibecoder: "Database & Security Protection (safe logins, leak prevention)",
      dev: "Databases & Defensive AppSec (Postgres/RLS, gitleaks, semgrep, osv-scanner)",
    },
    custom: {
      vibecoder: "Other creative or technical discipline (3D, games, scripts, docs)",
      dev: "Custom domain (dynamic CLI/SDK/MCP synthesis)",
    },
  },
  agentsMessage: {
    vibecoder: "Which AI coding tool(s) will you open this folder with?",
    dev: "Target coding agents for thin IDE adapters:",
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
    dev: "Select execution rhythm:",
  },
  autonomyOptions: {
    guided: {
      vibecoder: "Milestone check-ins (review previews together step by step)",
      dev: "Guided (pause at milestones & preview reviews)",
    },
    "autonomous-long": {
      vibecoder: "Long autonomous runs (finishes unit, verifies evidence, halts if stuck)",
      dev: "Autonomous-long (clean unit handoffs + 3-strike breaker + Red-Zone pauses)",
    },
  },
  permissionMessage: {
    vibecoder: "What initial permission level should the AI start with?",
    dev: "Select initial permission tier (independent of profile/rhythm):",
  },
  permissionOptions: {
    "read-only": {
      vibecoder: "Read-only advisor (recommended — inspects & advises before editing anything)",
      dev: "read-only (inspect, critique & propose scope; explicit order required to write)",
    },
    "scoped-write": {
      vibecoder: "Scoped edits (edit only the specific deliverable I approve)",
      dev: "scoped-write (edit approved deliverable; Red-Zone actions still require approval)",
    },
    "autonomous-green": {
      vibecoder: "Autonomous in Green Zone (code/tests free; deploys & external tools still gated)",
      dev: "autonomous-green (Green-Zone code/tests/local commits; Red-Zone pauses enforced)",
    },
  },
  gitInitMessage: "Turn on automatic safety undo checkpoints (git init)? Recommended!",
  saveGlobalMessage: "Save your profile, language, rhythm & permissions as defaults for future projects?",
  summaryTitle: "MetaSkill Installed",
  dryRunTitle: "MetaSkill Dry Run (No Files Written)",
  createdLabel: "Created",
  updatedLabel: "Updated",
  mergedLabel: "Merged safely",
  unchangedLabel: "Unchanged",
  preservedLabel: "Preserved",
  conflictsLabel: "Conflicts",
  adaptersLabel: "IDE Adapters",
  globalPrefsSavedLabel: "Global defaults",
  conflictWarning:
    "Some managed MetaSkill blocks were edited outside MetaSkill and kept untouched. Review them or pass --force to refresh only the MetaSkill fenced blocks.",
  kickoffTitle: "Paste This Kickoff Prompt Into Your AI Agent",
  outro: "Next: run `mtsk doctor` to verify environment readiness.",
  outroDryRun: "Dry run complete — zero files were created or modified.",
  doctorScopeLabel: "Environment Readiness (does not replace task QA or preview evidence)",
  doctorScopeHint: "Doctor verifies machine prerequisites & adapter sync, not finished deliverables.",
  doctorReadinessTitle: "Project & Evidence Readiness Notes",
  inputsReadme: [
    "INPUTS DIRECTORY — STRICTLY READ-ONLY",
    "",
    "Place raw media, datasets, documents, or user fixtures here.",
    "MetaSkill agents may inspect these files but MUST NEVER modify, overwrite, or delete originals.",
    "Generated intermediates belong in build/, QA artifacts in preview/, and final exports in output/.",
    "",
  ].join("\n"),
};

const ES_COPY: CliCopy = {
  intro: " MetaSkill — Arquitecto Universal de Proyectos con IA ",
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
      label: "Vibecoder (Sin jerga técnica / Lenguaje cotidiano)",
      hint: "Preguntas claras, protecciones automáticas y vistas previas visuales",
    },
    dev: {
      label: "Developer (Control técnico)",
      hint: "Trade-offs explícitos, flags CLI, reglas y pruebas granulares",
    },
  },
  domainsMessage: {
    vibecoder: "¿Qué vas a construir? (Espacio para elegir, Enter para confirmar)",
    dev: "Selecciona los playbooks de dominio:",
  },
  domainOptions: {
    "web-fullstack": {
      vibecoder: "App Web / Sitio (interfaz visual + pruebas reales en navegador)",
      dev: "App Web Full Stack (TypeScript, Next.js/Vite, Playwright QA)",
    },
    "video-audio": {
      vibecoder: "Videos y Audio (edición, subtítulos, volumen, vistas previas)",
      dev: "Video y Audio Multimodal (FFmpeg, Remotion, uv, contact sheets)",
    },
    "db-appsec": {
      vibecoder: "Base de Datos y Protección de Seguridad (accesos seguros, antifugas)",
      dev: "Bases de Datos y AppSec Defensivo (Postgres/RLS, gitleaks, semgrep, osv-scanner)",
    },
    custom: {
      vibecoder: "Otra disciplina creativa o técnica (3D, juegos, scripts, documentos)",
      dev: "Dominio personalizado (síntesis dinámica de CLI/SDK/MCP)",
    },
  },
  agentsMessage: {
    vibecoder: "¿Con qué herramienta(s) de IA vas a abrir esta carpeta?",
    dev: "Agentes destino para generar adaptadores finos de IDE:",
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
      vibecoder: "Por hitos (revisamos avances y vistas previas paso a paso)",
      dev: "Guiado (pausas por hitos y revisión de vistas previas)",
    },
    "autonomous-long": {
      vibecoder: "Tramos largos autónomos (termina unidad, valida evidencia y frena si se atasca)",
      dev: "Autónomo largo (unidades limpias + circuit breaker 3 fallos + Zona Roja)",
    },
  },
  permissionMessage: {
    vibecoder: "¿Con qué permiso inicial debe empezar el agente?",
    dev: "Nivel inicial de permisos (independiente de perfil, idioma y ritmo):",
  },
  permissionOptions: {
    "read-only": {
      vibecoder: "Solo lectura inicial (recomendado — revisa y aconseja antes de cambiar nada)",
      dev: "read-only (inspecciona, critica y propone alcance; requiere orden explícita para escribir)",
    },
    "scoped-write": {
      vibecoder: "Edición acotada (solo modifica el entregable que apruebe)",
      dev: "scoped-write (edita el alcance aprobado; la Zona Roja sigue requiriendo permiso)",
    },
    "autonomous-green": {
      vibecoder: "Autónomo en Zona Verde (código y tests libres; despliegues y costes piden permiso)",
      dev: "autonomous-green (código/tests/commits locales libres; Zona Roja pausada)",
    },
  },
  gitInitMessage: "¿Activar puntos de control automáticos para deshacer errores (git init)? ¡Recomendado!",
  saveGlobalMessage: "¿Guardar perfil, idioma, ritmo y permisos como preferencia predeterminada para futuros proyectos?",
  summaryTitle: "MetaSkill Instalado",
  dryRunTitle: "Simulación MetaSkill (Sin Escribir Archivos)",
  createdLabel: "Creados",
  updatedLabel: "Actualizados",
  mergedLabel: "Integrados",
  unchangedLabel: "Sin cambios",
  preservedLabel: "Conservados",
  conflictsLabel: "Conflictos",
  adaptersLabel: "Adaptadores IDE",
  globalPrefsSavedLabel: "Preferencias globales",
  conflictWarning:
    "Algunos bloques de MetaSkill fueron modificados manualmente y se conservaron intactos. Revísalos o usa --force para actualizar solo los bloques cercados de MetaSkill.",
  kickoffTitle: "Pega Este Prompt Inicial en Tu Agente de IA",
  outro: "Siguiente paso: ejecuta `mtsk doctor` para verificar la preparación del entorno.",
  outroDryRun: "Simulación completada — no se creó ni modificó ningún archivo.",
  doctorScopeLabel: "Preparación del entorno (no sustituye QA ni evidencia de entrega)",
  doctorScopeHint: "Doctor verifica prerequisitos de la máquina y adaptadores, no que la entrega funcione.",
  doctorReadinessTitle: "Notas de Preparación de Proyecto y Evidencia",
  inputsReadme: [
    "CARPETA INPUTS — ESTRICTAMENTE DE SOLO LECTURA",
    "",
    "Coloca aquí tus archivos originales (videos, audios, datos, documentos o fixtures).",
    "Los agentes de MetaSkill pueden inspeccionar estos archivos, pero NUNCA deben modificarlos, sobrescribirlos ni borrarlos.",
    "Los archivos intermedios van en build/, la evidencia QA en preview/ y las entregas finales en output/.",
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
      ? "Empieza en modo asesoría de solo lectura: propón qué revisarás y qué respuesta devolverás antes de modificar o crear archivos."
      : `Empieza respetando el permiso '${config.permissionMode}' e inspecciona primero sin sobrescribir reglas propias.`;
  const permNoteEn =
    config.permissionMode === "read-only"
      ? "Start in read-only advisory mode: propose your review scope and expected output before modifying or creating any files."
      : `Start under '${config.permissionMode}' permission mode and inspect existing files before proposing edits.`;

  if (isEs) {
    return [
      "Actúa como MetaSkill siguiendo .agents/skills/metaskill/SKILL.md.",
      "Lee primero .agents/probe-profile.json, .agents/metaskill.config.json, SPEC.md y PROJECT_STATE.md.",
      `Ajustes activos — perfil: '${config.persona}', idioma: '${config.language}', ritmo: '${config.autonomyMode}', permisos: '${config.permissionMode}', modo: '${config.projectMode}'.`,
      permNoteEs,
      "Ayúdame con este proyecto: [DESCRIBE AQUÍ TU IDEA O QUÉ QUIERES REVISAR].",
    ].join("\n");
  }

  return [
    "Act as MetaSkill following .agents/skills/metaskill/SKILL.md.",
    "First inspect .agents/probe-profile.json, .agents/metaskill.config.json, SPEC.md, and PROJECT_STATE.md.",
    `Active settings — persona: '${config.persona}', language: '${config.language}', rhythm: '${config.autonomyMode}', permissions: '${config.permissionMode}', mode: '${config.projectMode}'.`,
    permNoteEn,
    "Help me with this project: [DESCRIBE YOUR IDEA OR WHAT TO REVIEW HERE].",
  ].join("\n");
}
