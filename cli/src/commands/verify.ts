import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import pc from "picocolors";
import { listWorkspacePackages, hasContractFile } from "../probes/workspaces.js";
import { runVerify, type VerifyResult } from "../verify/runner.js";

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
  workspaces?: boolean;
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

/** Verifies each workspace contract in its own directory and prints one combined result. */
async function verifyWorkspaces(
  root: string,
  dirs: string[],
  runIn: (dir: string) => Promise<VerifyResult>,
  json: boolean
): Promise<void> {
  const packages: Array<{ dir: string; result: VerifyResult }> = [];
  for (const dir of dirs) {
    packages.push({ dir, result: await runIn(path.join(root, dir)) });
  }

  const summary = { verified: 0, pending: 0, blocked: 0 };
  for (const { result } of packages) {
    summary.verified += result.report.summary.verified;
    summary.pending += result.report.summary.pending;
    summary.blocked += result.report.summary.blocked;
  }
  const exitCode = Math.max(0, ...packages.map((p) => p.result.exitCode));
  const overallStatus =
    exitCode === 0 && summary.pending === 0 && summary.blocked === 0 ? "verified" : "incomplete";
  const errors = packages.filter((p) => p.result.error).map((p) => `${p.dir}: ${p.result.error}`);

  if (json) {
    console.log(
      JSON.stringify(
        {
          exitCode,
          fromCache: packages.every((p) => p.result.fromCache),
          ...(errors.length > 0 ? { error: errors.join(" | ") } : {}),
          report: { overallStatus, summary },
          packages: packages.map((p) => ({
            dir: p.dir,
            exitCode: p.result.exitCode,
            ...(p.result.error ? { error: p.result.error } : {}),
            report: p.result.report,
          })),
        },
        null,
        2
      )
    );
  } else {
    console.log(
      `Workspace status: **${overallStatus}** (${summary.verified} verified, ${summary.pending} pending, ${summary.blocked} blocked) across ${packages.length} contract(s)\n`
    );
    for (const { dir, result } of packages) {
      console.log(`### ${dir === "." ? "(root)" : dir}\n\n${result.markdown}\n`);
      if (result.error) console.error(pc.yellow(`${dir}: ${result.error}`));
    }
  }
  if (exitCode !== 0) {
    process.exitCode = exitCode;
  }
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

  const contractRelPath = options.contract ?? "SPEC.md";
  const runIn = (dir: string) =>
    runVerify({
      targetDir: dir,
      contractRelPath,
      timeoutMs,
      fromReport: Boolean(options.fromReport),
      auto: Boolean(options.auto),
      manualEvidence,
      reviewerRisks,
      lang: options.lang === "es" ? "es" : "en",
    });

  if (options.workspaces) {
    const packageDirs = listWorkspacePackages(targetDir).filter((rel) =>
      hasContractFile(path.join(targetDir, rel), contractRelPath)
    );
    if (packageDirs.length > 0) {
      const dirs = [...(hasContractFile(targetDir, contractRelPath) ? ["."] : []), ...packageDirs];
      await verifyWorkspaces(targetDir, dirs, runIn, Boolean(options.json));
      return;
    }
  }

  const result = await runIn(targetDir);

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
