import { z } from "zod";
import { AutonomyModeSchema, LanguageSchema, PermissionModeSchema, PersonaSchema } from "./config.js";

export const EvalHostSchema = z.enum(["codex", "claude-code", "antigravity", "mock"]);
export type EvalHost = z.infer<typeof EvalHostSchema>;

export const EvalCheckTypeSchema = z.enum([
  "command",
  "file-exists",
  "file-contains",
  "file-not-contains",
  "immutable-dir",
  "no-mutations",
  "contract-verify",
]);

export const EvalDeterministicCheckSchema = z.object({
  id: z.string().min(1),
  type: EvalCheckTypeSchema,
  description: z.string().min(1).optional(),
  target: z.string().min(1).optional(),
  command: z.string().min(1).optional(),
  args: z.array(z.string()).optional(),
  pattern: z.string().min(1).optional(),
  expectExitCode: z.number().int().optional(),
});

export type EvalDeterministicCheck = z.infer<typeof EvalDeterministicCheckSchema>;

export const EvalScenarioSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1).optional(),
  recipe: z.string().min(1).optional(),
  subset: z.enum(["quick", "full"]).default("full"),
  fixtureDir: z.string().min(1),
  userPrompt: z.string().min(1),
  initialConfig: z.object({
    persona: PersonaSchema,
    language: LanguageSchema,
    autonomyMode: AutonomyModeSchema,
    permissionMode: PermissionModeSchema,
  }),
  requiredBehaviors: z.array(z.string().min(1)).min(3),
  forbiddenBehaviors: z.array(z.string().min(1)).min(2),
  evidenceRequired: z.array(z.string().min(1)).min(1),
  allowedWriteGlobs: z.array(z.string().min(1)).optional(),
  deterministicChecks: z.array(EvalDeterministicCheckSchema).default([]),
  claimDonePatterns: z.array(z.string().min(1)).optional(),
  rubricFocus: z.string().min(1).optional(),
});

export type EvalScenario = z.infer<typeof EvalScenarioSchema>;

export const EvalScenariosCatalogSchema = z.object({
  schemaVersion: z.union([z.literal("1.0.0"), z.literal("2.0.0")]),
  scenarios: z.array(EvalScenarioSchema).min(15),
});

export type EvalScenariosCatalog = z.infer<typeof EvalScenariosCatalogSchema>;

export const EvalJudgeScoreSchema = z.object({
  falseDone: z.boolean(),
  criteriaFulfilledRatio: z.number().min(0).max(1),
  collateralDamage: z.number().int().min(0),
  permissionViolations: z.number().int().min(0),
  estimatedInterventions: z.number().int().min(0),
  rationale: z.string().min(1),
});

export type EvalJudgeScore = z.infer<typeof EvalJudgeScoreSchema>;

export const EvalDeterministicResultSchema = z.object({
  filesAdded: z.array(z.string()),
  filesModified: z.array(z.string()),
  filesDeleted: z.array(z.string()),
  permissionViolations: z.number().int().min(0),
  collateralDamage: z.number().int().min(0),
  checksPassed: z.number().int().min(0),
  checksTotal: z.number().int().min(0),
  checkDetails: z.array(
    z.object({
      id: z.string(),
      ok: z.boolean(),
      detail: z.string(),
    })
  ),
  claimedDone: z.boolean(),
  deterministicFalseDone: z.boolean(),
});

export type EvalDeterministicResult = z.infer<typeof EvalDeterministicResultSchema>;

export const EvalRunRecordSchema = z.object({
  scenarioId: z.string(),
  host: EvalHostSchema,
  variant: z.enum(["bare", "metaskill"]),
  runIndex: z.number().int().min(1),
  status: z.enum(["completed", "error", "timeout", "unauthenticated"]),
  elapsedMs: z.number().nonnegative(),
  totalTokens: z.number().nonnegative().nullable(),
  falseDone: z.boolean(),
  criteriaFulfilledRatio: z.number().min(0).max(1),
  collateralDamage: z.number().int().min(0),
  permissionViolations: z.number().int().min(0),
  interventions: z.number().int().min(0),
  deterministic: EvalDeterministicResultSchema,
  judgeScore: EvalJudgeScoreSchema.nullable(),
  judgeProvider: z.string(),
  transcriptPath: z.string(),
  diffSummary: z.string(),
  errorMessage: z.string().optional(),
});

export type EvalRunRecord = z.infer<typeof EvalRunRecordSchema>;

export const EvalHostVariantMetricsSchema = z.object({
  falseDoneRatePct: z.number(),
  falseDoneStdDevPct: z.number(),
  criteriaFulfilledPct: z.number(),
  criteriaStdDevPct: z.number(),
  meanCollateralDamage: z.number(),
  totalPermissionViolations: z.number().int(),
  meanInterventions: z.number(),
  meanElapsedMs: z.number(),
  meanTokens: z.number().nullable(),
});

export type EvalHostVariantMetrics = z.infer<typeof EvalHostVariantMetricsSchema>;

export const EvalSummaryReportSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  generatedAt: z.string().datetime(),
  subset: z.enum(["quick", "full"]),
  runsPerScenario: z.number().int().min(1),
  hostsRequested: z.array(EvalHostSchema),
  hostStatus: z.record(z.string(), z.string()),
  byHost: z.record(
    z.string(),
    z.object({
      bare: EvalHostVariantMetricsSchema,
      metaskill: EvalHostVariantMetricsSchema,
      falseDoneReductionPct: z.number().nullable(),
      timeOverheadPct: z.number().nullable(),
      tokenOverheadPct: z.number().nullable(),
    })
  ),
  runs: z.array(EvalRunRecordSchema),
});

export type EvalSummaryReport = z.infer<typeof EvalSummaryReportSchema>;
