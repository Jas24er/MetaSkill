import { z } from "zod";
import { ContractCheckKindSchema } from "./contract.js";

export const RequirementClosureStatusSchema = z.enum(["verified", "pending", "blocked"]);
export type RequirementClosureStatus = z.infer<typeof RequirementClosureStatusSchema>;

export const EvidenceCheckExecutionSchema = z.object({
  raw: z.string().min(1),
  kind: ContractCheckKindSchema,
  ok: z.boolean(),
  exitCode: z.number().int().optional(),
  durationMs: z.number().nonnegative().optional(),
  outputSnippet: z.string().optional(),
});
export type EvidenceCheckExecution = z.infer<typeof EvidenceCheckExecutionSchema>;

export const EvidenceRequirementResultSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  status: RequirementClosureStatusSchema,
  evidence: z.array(z.string().min(1)),
  checkResults: z.array(EvidenceCheckExecutionSchema),
});
export type EvidenceRequirementResult = z.infer<typeof EvidenceRequirementResultSchema>;

export const EvidenceReportSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  generatedAt: z.string().datetime(),
  contractPath: z.string().min(1),
  contractHash: z.string().min(1),
  title: z.string().min(1),
  overallStatus: z.enum(["verified", "incomplete"]),
  requirements: z.array(EvidenceRequirementResultSchema),
  reviewerRisks: z.array(z.string()),
  summary: z.object({
    verified: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
    blocked: z.number().int().nonnegative(),
  }),
});
export type EvidenceReport = z.infer<typeof EvidenceReportSchema>;

/** Renders an evidence report in simple English or Spanish Markdown for human & PR consumption. */
export function renderEvidenceReportMarkdown(
  report: EvidenceReport,
  lang: "en" | "es" = "en"
): string {
  const isEs = lang === "es";
  const heading = isEs
    ? `## Informe de evidencia — ${report.title}`
    : `## Evidence Report — ${report.title}`;
  const colReq = isEs ? "Requisito" : "Requirement";
  const colStatus = isEs ? "Estado" : "Status";
  const colEvidence = isEs ? "Evidencia" : "Evidence";
  const risksLabel = isEs
    ? "Riesgos detectados por el revisor"
    : "Risks detected by the reviewer";
  const noneText = isEs ? "Ninguno" : "None";
  const summaryLabel = isEs
    ? `Estado general: **${report.overallStatus}** (${report.summary.verified} verificados, ${report.summary.pending} pendientes, ${report.summary.blocked} bloqueados)`
    : `Overall status: **${report.overallStatus}** (${report.summary.verified} verified, ${report.summary.pending} pending, ${report.summary.blocked} blocked)`;

  const lines: string[] = [
    heading,
    "",
    summaryLabel,
    "",
    `| ${colReq} | ${colStatus} | ${colEvidence} |`,
    "| :--- | :--- | :--- |",
  ];

  for (const req of report.requirements) {
    const safeDesc = req.description.replaceAll("|", "\\|");
    const safeEv = (req.evidence.join(" · ") || "-").replaceAll("|", "\\|");
    lines.push(`| ${req.id}: ${safeDesc} | \`${req.status}\` | ${safeEv} |`);
  }

  lines.push("");
  if (report.reviewerRisks.length > 0) {
    lines.push(`**${risksLabel}:**`);
    for (const risk of report.reviewerRisks) {
      lines.push(`- ${risk}`);
    }
  } else {
    lines.push(`**${risksLabel}:** ${noneText}.`);
  }
  lines.push("");
  return lines.join("\n");
}
