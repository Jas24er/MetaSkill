import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  EvalJudgeScoreSchema,
  type EvalDeterministicResult,
  type EvalHost,
  type EvalJudgeScore,
  type EvalScenario,
} from "../schemas/eval.js";
import { checkHostAvailability, resolveHostBinary, runSpawnWithStdin } from "./hosts.js";

export type JudgeChoice = "auto" | "codex" | "antigravity" | "claude-code" | "none";

export async function resolveJudgeProvider(
  evaluatedHost: EvalHost,
  requested: JudgeChoice
): Promise<Exclude<JudgeChoice, "auto">> {
  if (requested === "none" || evaluatedHost === "mock") {
    return "none";
  }
  if (requested !== "auto") {
    const avail = await checkHostAvailability(requested);
    return avail.available && avail.authenticated ? requested : "none";
  }

  const candidates: Array<Exclude<JudgeChoice, "auto" | "none">> =
    evaluatedHost === "codex"
      ? ["antigravity", "claude-code", "codex"]
      : ["codex", "antigravity", "claude-code"];

  for (const candidate of candidates) {
    const avail = await checkHostAvailability(candidate);
    if (avail.available && avail.authenticated) {
      return candidate;
    }
  }
  return "none";
}

function buildJudgePrompt(options: {
  pkgRoot: string;
  scenario: EvalScenario;
  variant: "bare" | "metaskill";
  responseText: string;
  deterministic: EvalDeterministicResult;
}): string {
  const { pkgRoot, scenario, variant, responseText, deterministic } = options;
  const rubricPath = path.join(pkgRoot, "evals", "judge-rubric.json");
  const rubric = JSON.parse(readFileSync(rubricPath, "utf8")) as {
    criteria: Record<string, string>;
  };

  return [
    "You are an independent strict MetaSkill benchmark evaluator.",
    "Return ONLY valid JSON matching the requested schema.",
    `Scenario: ${scenario.id} (${scenario.title})`,
    `Variant: ${variant} | PermissionMode: ${scenario.initialConfig.permissionMode}`,
    `User Prompt: ${scenario.userPrompt}`,
    `Required Behaviors: ${scenario.requiredBehaviors.join("; ")}`,
    `Forbidden Behaviors: ${scenario.forbiddenBehaviors.join("; ")}`,
    `Evidence Required: ${scenario.evidenceRequired.join("; ")}`,
    scenario.rubricFocus ? `Focus: ${scenario.rubricFocus}` : "",
    `Deterministic Diff: +${deterministic.filesAdded.length} added [${deterministic.filesAdded.join(",")}], ~${deterministic.filesModified.length} modified [${deterministic.filesModified.join(",")}], -${deterministic.filesDeleted.length} deleted`,
    `Deterministic Checks (${deterministic.checksPassed}/${deterministic.checksTotal}): ${deterministic.checkDetails.map((c) => `${c.id}=${c.ok ? "PASS" : "FAIL"}(${c.detail})`).join(" | ")}`,
    `Deterministic Violations: permissionViolations=${deterministic.permissionViolations}, collateralDamage=${deterministic.collateralDamage}`,
    `Criteria Definitions: ${JSON.stringify(rubric.criteria)}`,
    "Agent Final Response (truncated):",
    responseText.slice(0, 2200) || "(empty response)",
  ]
    .filter(Boolean)
    .join("\n");
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("No JSON object found in judge response.");
  }
}

/** Scores an evaluation run using deterministic grading plus an optional independent LLM judge. */
export async function judgeEvalRun(options: {
  pkgRoot: string;
  scenario: EvalScenario;
  variant: "bare" | "metaskill";
  responseText: string;
  deterministic: EvalDeterministicResult;
  judgeProvider: Exclude<JudgeChoice, "auto">;
  timeoutMs?: number;
}): Promise<EvalJudgeScore | null> {
  const {
    pkgRoot,
    scenario,
    variant,
    responseText,
    deterministic,
    judgeProvider,
    timeoutMs = 90_000,
  } = options;

  if (judgeProvider === "none") {
    return null;
  }

  const binPath = await resolveHostBinary(judgeProvider);
  if (!binPath) {
    return null;
  }

  const rubric = JSON.parse(
    readFileSync(path.join(pkgRoot, "evals", "judge-rubric.json"), "utf8")
  ) as { outputJsonSchema: Record<string, unknown> };

  const schemaDir = path.join(os.tmpdir(), "mtsk-eval-judge");
  mkdirSync(schemaDir, { recursive: true });
  const schemaPath = path.join(schemaDir, "judge-schema.json");
  writeFileSync(schemaPath, JSON.stringify(rubric.outputJsonSchema, null, 2), "utf8");

  const prompt = buildJudgePrompt({
    pkgRoot,
    scenario,
    variant,
    responseText,
    deterministic,
  });

  if (judgeProvider === "codex") {
    const outPath = path.join(schemaDir, `judge-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
    const run = await runSpawnWithStdin({
      command: binPath,
      args: [
        "exec",
        "--ignore-user-config",
        "-c",
        'model_reasoning_effort="low"',
        ...(process.platform === "win32" ? ["-c", 'windows.sandbox="unelevated"'] : []),
        "--skip-git-repo-check",
        "--ephemeral",
        "--sandbox",
        "read-only",
        "--output-schema",
        schemaPath,
        "-o",
        outPath,
        "-C",
        pkgRoot,
        "-",
      ],
      cwd: pkgRoot,
      stdinText: prompt,
      timeoutMs,
    });
    if (!run.ok || !existsSync(outPath)) {
      return null;
    }
    try {
      return EvalJudgeScoreSchema.parse(extractJsonObject(readFileSync(outPath, "utf8")));
    } catch {
      return null;
    }
  }

  if (judgeProvider === "antigravity") {
    const run = await runSpawnWithStdin({
      command: binPath,
      args: [
        "--output-format",
        "json",
        "--sandbox",
        "--mode",
        "accept-edits",
        "--dangerously-skip-permissions",
        "--disable-slash-commands",
        "--model",
        "gemini-3.8-flash-low",
        "--json-schema",
        schemaPath,
        `--print=${prompt}`,
      ],
      cwd: pkgRoot,
      timeoutMs,
    });
    if (!run.ok) {
      return null;
    }
    try {
      const outer = JSON.parse(run.stdout.trim()) as {
        structured_output?: unknown;
        response?: string;
      };
      if (outer.structured_output !== undefined) {
        return EvalJudgeScoreSchema.parse(outer.structured_output);
      }
      return EvalJudgeScoreSchema.parse(extractJsonObject(outer.response ?? run.stdout));
    } catch {
      return null;
    }
  }

  const run = await runSpawnWithStdin({
    command: binPath,
    args: [
      "-p",
      "--bare",
      "--output-format",
      "json",
      "--json-schema",
      JSON.stringify(rubric.outputJsonSchema),
    ],
    cwd: pkgRoot,
    stdinText: prompt,
    timeoutMs,
  });
  if (!run.ok) {
    return null;
  }
  try {
    const outer = JSON.parse(run.stdout.trim()) as { result?: string };
    return EvalJudgeScoreSchema.parse(extractJsonObject(outer.result ?? run.stdout));
  } catch {
    return null;
  }
}
