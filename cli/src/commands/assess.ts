import path from "node:path";
import { capabilities, inspectProjectTools, type Capability } from "../probes/project-tools.js";
import type { UiLocale } from "../utils/i18n.js";

export const stages = ["start", "develop", "release", "maintain"] as const;
type Stage = (typeof stages)[number];

const copy = {
  en: {
    title: "MetaSkill project brief (read-only)",
    stages: { start: "Starting", develop: "In development", release: "Preparing a release", maintain: "Maintenance", unknown: "To confirm" },
    roles: { rules: "Team instructions", scope: "Scope and decisions", state: "Current work", checks: "Quality checks", release: "Release process" },
    stageLabel: "Stage", declared: "Team reference", discovered: "Found locally",
    instructions: "Use this brief in the current agent. Start with the requested outcome and the team's own tools. Listed sources are leads. Confirm what they cover before proposing anything new. If the workflow covers the task, use it as it stands. Ask before making changes.",
    next: {
      start: "Describe the first result someone should be able to try and agree on one way to check it.",
      develop: "Pick the next piece of work from the team's queue and identify the existing check that would demonstrate completion.",
      release: "Compare the release criteria with evidence for the version being shipped. Report any unchecked criterion and the smallest check that would settle it.",
      maintain: "Use one reported issue and the team's checks to define a focused regression check and a handoff.",
      unknown: "What are you trying to finish next? Use that answer to choose the stage and review only the relevant sources.",
    },
  },
  es: {
    title: "Resumen del proyecto para el agente (solo lectura)",
    stages: { start: "Inicio", develop: "En desarrollo", release: "Preparación de entrega", maintain: "Mantenimiento", unknown: "Por confirmar" },
    roles: { rules: "Instrucciones del equipo", scope: "Alcance y decisiones", state: "Trabajo en curso", checks: "Pruebas de calidad", release: "Proceso de entrega" },
    stageLabel: "Etapa", declared: "Referencia del equipo", discovered: "Encontrado en el proyecto",
    instructions: "Usa este resumen en el agente actual. Parte del resultado pedido y de las herramientas del equipo. Las referencias son pistas. Confirma qué cubren antes de proponer algo nuevo. Si el flujo ya cubre la tarea, úsalo tal cual. Pide autorización antes de hacer cambios.",
    next: {
      start: "Describe el primer resultado que alguien podrá probar y acuerda una forma de comprobarlo.",
      develop: "Elige la siguiente tarea de la lista del equipo e identifica la prueba existente que demostraría que está terminada.",
      release: "Compara los criterios de entrega con la evidencia de la versión que se va a publicar. Indica qué criterio sigue pendiente y la prueba más pequeña que lo aclararía.",
      maintain: "Parte de un problema reportado y de las pruebas del equipo para definir cómo comprobar la corrección y qué dejar a quien retome el trabajo.",
      unknown: "¿Qué quieres terminar ahora? Usa la respuesta para elegir la etapa y revisar solo las fuentes pertinentes.",
    },
  },
};

interface AssessOptions {
  dir: string;
  stage?: Stage;
  use: string[];
  lang: UiLocale;
  json?: boolean;
}

function parseReferences(values: string[]): Map<Capability, string[]> {
  const references = new Map<Capability, string[]>();
  for (const value of values) {
    const separator = value.indexOf("=");
    const role = value.slice(0, separator).trim();
    const reference = value.slice(separator + 1).trim();
    const capability = capabilities.find((key) => key === role);
    if (separator < 1 || !reference || !capability) {
      throw new Error(`Expected --use role=reference. Roles: ${capabilities.join(", ")}.`);
    }
    const list = references.get(capability) ?? [];
    if (!list.includes(reference)) list.push(reference);
    references.set(capability, list);
  }
  return references;
}

export async function assessCommand(options: AssessOptions): Promise<void> {
  const references = parseReferences(options.use);
  const { inventory, empty } = await inspectProjectTools(path.resolve(options.dir), references);
  const stage = options.stage ?? (empty && references.size === 0 ? "start" : "unknown");
  const local = copy[options.lang];
  const nextStep = local.next[stage];
  if (options.json) {
    console.log(JSON.stringify({ stage, inventory, nextStep, instructions: local.instructions }, null, 2));
    return;
  }
  const lines = [local.title, `${local.stageLabel} — ${local.stages[stage]}`, ""];
  for (const { capability, declared, discovered } of inventory) {
    const details = [];
    if (declared.length) details.push(`${local.declared} — ${declared.join(", ")}`);
    if (discovered.length) details.push(`${local.discovered} — ${discovered.join(", ")}`);
    if (details.length) lines.push(`${local.roles[capability]} — ${details.join(" | ")}`);
  }
  console.log([...lines, "", local.instructions, nextStep].join("\n"));
}
