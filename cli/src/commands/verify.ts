import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import pc from "picocolors";
import { runVerify } from "../verify/runner.js";

export interface VerifyCommandOptions {
  dir?: string;
  contract?: string;
  timeout?: string;
  fromReport?: boolean;
  auto?: boolean;
  evidence?: string[];
  reviewerRisks?: string;
  lang?: "en" | "es";
  json?: boolean;
}

function parseEvidenceFlags(items: string[] = []): Record<string, string> {
  const map: Record<string, string> = {};
  for (const entry of items) {
    const idx = entry.indexOf("=");
    if (idx < 1) {
      throw new Error(`Expected --evidence REQ-N="note", got '${entry}'.`);
    }
    const id = entry.slice(0, idx).trim().toUpperCase();
    const note = entry.slice(idx + 1).trim();
    if (!id || !note) {
      throw new Error(`Empty requirement ID or note in --evidence '${entry}'.`);
    }
    map[id] = note;
  }
  return map;
}

/** Runs `mtsk verify` to execute contract checks safely and write `.agents/evidence/report.{md,json}`. */
export async function verifyCommand(options: VerifyCommandOptions): Promise<void> {
  const targetDir = path.resolve(options.dir ?? process.cwd());
  const timeoutMs = Math.max(2000, Number.parseInt(options.timeout ?? "60000", 10) || 60_000);
  const manualEvidence = parseEvidenceFlags(options.evidence);

  let reviewerRisks: string[] = [];
  if (options.reviewerRisks) {
    const riskFile = path.resolve(targetDir, options.reviewerRisks);
    if (existsSync(riskFile)) {
      const raw = await readFile(riskFile, "utf8");
      try {
        const parsed = JSON.parse(raw) as { risks?: unknown } | string[];
        if (Array.isArray(parsed)) {
          reviewerRisks = parsed.filter((r): r is string => typeof r === "string");
        } else if (Array.isArray(parsed.risks)) {
          reviewerRisks = parsed.risks.filter((r): r is string => typeof r === "string");
        }
      } catch {
        reviewerRisks = raw
          .split(/\r?\n/)
          .map((l) => l.replace(/^[-*]\s*/, "").trim())
          .filter(Boolean);
      }
    }
  }

  const result = await runVerify({
    targetDir,
    contractRelPath: options.contract ?? "SPEC.md",
    timeoutMs,
    fromReport: Boolean(options.fromReport),
    auto: Boolean(options.auto),
    manualEvidence,
    reviewerRisks,
    lang: options.lang === "es" ? "es" : "en",
  });

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          exitCode: result.exitCode,
          fromCache: result.fromCache,
          ...(result.error ? { error: result.error } : {}),
          report: result.report,
        },
        null,
        2
      )
    );
    if (result.exitCode !== 0) {
      process.exitCode = result.exitCode;
    }
    return;
  }

  console.log(result.markdown);
  if (result.error) {
    console.error(pc.yellow(result.error));
  }
  if (result.exitCode !== 0) {
    process.exitCode = result.exitCode;
  }
}
