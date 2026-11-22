import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import pc from "picocolors";
import { z } from "zod";
import { checkHostAvailability, runSpawnWithStdin } from "../evals/hosts.js";
import { runExecFile } from "../probes/exec.js";
import type { EvalHost } from "../schemas/eval.js";
import { writeTextFile } from "../utils/fs.js";
import { DEFAULT_REPORT_JSON, DEFAULT_REVIEWER_JSON, runVerify } from "../verify/runner.js";

const ReviewerOutputSchema = z.object({
  risks: z.array(z.string()),
  summary: z.string().min(1),
});

export interface ReviewCommandOptions {
  dir?: string;
  contract?: string;
  host?: "auto" | "codex" | "antigravity" | "claude-code";
  timeout?: string;
  lang?: "en" | "es";
  json?: boolean;
}

const REVIEW_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["risks", "summary"],
  properties: {
    risks: { type: "array", items: { type: "string" } },
    summary: { type: "string", minLength: 1 },
  },
};

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("Could not parse reviewer JSON.");
  }
}

async function selectReviewerHost(
  preferred: ReviewCommandOptions["host"]
): Promise<{ host: Exclude<EvalHost, "mock">; binaryPath: string } | null> {
  const order: Array<Exclude<EvalHost, "mock">> =
    preferred && preferred !== "auto"
      ? [preferred]
      : ["codex", "antigravity", "claude-code"];

  for (const host of order) {
    const avail = await checkHostAvailability(host);
    if (avail.available && avail.authenticated && avail.binaryPath) {
      return { host, binaryPath: avail.binaryPath };
    }
  }
  return null;
}

/**
 * Runs an isolated independent review session without author reasoning, inspecting only
 * the contract, git diff, and `.agents/evidence/report.json`.
 */
export async function reviewCommand(options: ReviewCommandOptions): Promise<void> {
  const targetDir = path.resolve(options.dir ?? process.cwd());
  const contractRel = options.contract ?? "SPEC.md";
  const contractFull = path.join(targetDir, contractRel);
  const timeoutMs = Math.max(5000, Number.parseInt(options.timeout ?? "120000", 10) || 120_000);

  if (!existsSync(contractFull)) {
    throw new Error(`Contract file not found: ${contractRel}`);
  }

  const contractText = readFileSync(contractFull, "utf8").slice(0, 4000);
  const reportFull = path.join(targetDir, DEFAULT_REPORT_JSON);
  const reportText = existsSync(reportFull)
    ? readFileSync(reportFull, "utf8").slice(0, 3500)
    : "(No .agents/evidence/report.json yet)";

  const [gitStatus, gitDiff] = await Promise.all([
    runExecFile("git", ["status", "--short"], 4000, targetDir),
    runExecFile("git", ["diff"], 6000, targetDir),
  ]);

  const selected = await selectReviewerHost(options.host ?? "auto");
  if (!selected) {
    throw new Error(
      "No authenticated headless reviewer CLI found (checked codex, antigravity, claude-code)."
    );
  }

  const prompt = [
    "You are an independent MetaSkill reviewer. You have ZERO author context.",
    "Hunt critically for defects, unmet contract requirements, missing edge cases, weak/missing tests, collateral file edits, or leaked secrets.",
    "Return ONLY JSON matching { risks: string[], summary: string }.",
    options.lang === "es" ? "Write risks and summary in Spanish." : "Write risks and summary in English.",
    "=== CONTRACT ===",
    contractText,
    "=== GIT STATUS ===",
    gitStatus.ok ? gitStatus.stdout.slice(0, 1500) || "(clean)" : "(not a git repo)",
    "=== GIT DIFF (truncated) ===",
    gitDiff.ok ? gitDiff.stdout.slice(0, 6000) || "(no unstaged diff)" : "(none)",
    "=== EVIDENCE REPORT ===",
    reportText,
  ].join("\n");

  const schemaDir = path.join(os.tmpdir(), "mtsk-review-schema");
  mkdirSync(schemaDir, { recursive: true });
  const schemaPath = path.join(schemaDir, "review-schema.json");
  writeFileSync(schemaPath, JSON.stringify(REVIEW_JSON_SCHEMA, null, 2), "utf8");

  let rawOut = "";
  if (selected.host === "codex") {
    const outPath = path.join(schemaDir, `review-${Date.now()}.json`);
    const run = await runSpawnWithStdin({
      command: selected.binaryPath,
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
        targetDir,
        "-",
      ],
      cwd: targetDir,
      stdinText: prompt,
      timeoutMs,
    });
    if (!run.ok || !existsSync(outPath)) {
      throw new Error(`Independent Codex review failed: ${run.stderr || run.stdout}`);
    }
    rawOut = readFileSync(outPath, "utf8");
  } else if (selected.host === "antigravity") {
    const run = await runSpawnWithStdin({
      command: selected.binaryPath,
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
        `--print=${prompt.slice(0, 6500)}`,
      ],
      cwd: targetDir,
      timeoutMs,
    });
    if (!run.ok) {
      throw new Error(`Independent Antigravity review failed: ${run.stderr || run.stdout}`);
    }
    const outer = JSON.parse(run.stdout.trim()) as {
      structured_output?: unknown;
      response?: string;
    };
    rawOut =
      outer.structured_output !== undefined
        ? JSON.stringify(outer.structured_output)
        : outer.response ?? run.stdout;
  } else {
    const run = await runSpawnWithStdin({
      command: selected.binaryPath,
      args: [
        "-p",
        "--bare",
        "--output-format",
        "json",
        "--permission-mode",
        "plan",
        "--json-schema",
        JSON.stringify(REVIEW_JSON_SCHEMA),
      ],
      cwd: targetDir,
      stdinText: prompt,
      timeoutMs,
    });
    if (!run.ok) {
      throw new Error(`Independent Claude review failed: ${run.stderr || run.stdout}`);
    }
    const outer = JSON.parse(run.stdout.trim()) as { result?: string };
    rawOut = outer.result ?? run.stdout;
  }

  const parsed = ReviewerOutputSchema.parse(extractJson(rawOut));
  const payload = {
    schemaVersion: "1.0.0",
    reviewedAt: new Date().toISOString(),
    reviewerHost: selected.host,
    ...parsed,
  };
  await writeTextFile(path.join(targetDir, DEFAULT_REVIEWER_JSON), `${JSON.stringify(payload, null, 2)}\n`);

  if (existsSync(reportFull)) {
    await runVerify({
      targetDir,
      contractRelPath: contractRel,
      fromReport: false,
      reviewerRisks: parsed.risks,
      lang: options.lang === "es" ? "es" : "en",
    });
  }

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log(pc.bold(`Independent Review (${selected.host})`));
  console.log(`  Summary: ${parsed.summary}`);
  if (parsed.risks.length === 0) {
    console.log(pc.green("  Risks  : None detected."));
  } else {
    console.log(pc.yellow(`  Risks (${parsed.risks.length}):`));
    for (const risk of parsed.risks) {
      console.log(`    - ${risk}`);
    }
  }
}
