import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { runExecFile } from "../probes/exec.js";
import {
  parseContractFromMarkdown,
  type ContractCheck,
  type ContractDocument,
} from "../schemas/contract.js";
import {
  EvidenceReportSchema,
  renderEvidenceReportMarkdown,
  type EvidenceCheckExecution,
  type EvidenceReport,
  type EvidenceRequirementResult,
} from "../schemas/evidence.js";
import { sha256, writeTextFile } from "../utils/fs.js";
import { tokenizeCommandStrict } from "./argv.js";

export const DEFAULT_EVIDENCE_DIR = ".agents/evidence";
export const DEFAULT_REPORT_JSON = ".agents/evidence/report.json";
export const DEFAULT_REPORT_MD = ".agents/evidence/report.md";
export const DEFAULT_REVIEWER_JSON = ".agents/evidence/reviewer.json";

export interface VerifyOptions {
  targetDir: string;
  contractRelPath?: string;
  timeoutMs?: number;
  fromReport?: boolean;
  auto?: boolean;
  manualEvidence?: Record<string, string>;
  reviewerRisks?: string[];
  lang?: "en" | "es";
}

export interface VerifyResult {
  exitCode: number;
  report: EvidenceReport;
  markdown: string;
  fromCache: boolean;
  error?: string;
}

const WINDOWS_CMD_SHIMS = new Set(["npm", "npx", "pnpm", "yarn", "corepack"]);

async function execSafeArgv(
  argv: string[],
  timeoutMs: number,
  cwd: string
): Promise<{ ok: boolean; exitCode: number; durationMs: number; outputSnippet: string; timedOut: boolean }> {
  const [cmd, ...args] = argv;
  if (!cmd) {
    return { ok: false, exitCode: 1, durationMs: 0, outputSnippet: "Missing executable.", timedOut: false };
  }

  const startedAt = Date.now();
  const isWindowsShim = process.platform === "win32" && WINDOWS_CMD_SHIMS.has(cmd.toLowerCase());
  const res = isWindowsShim
    ? await runExecFile("cmd.exe", ["/d", "/c", cmd, ...args], timeoutMs, cwd)
    : await runExecFile(cmd, args, timeoutMs, cwd);
  const durationMs = Date.now() - startedAt;
  const combined = `${res.stdout}\n${res.stderr}`.trim().replace(/\s+/g, " ");
  const snippet = combined.length > 220 ? `${combined.slice(0, 217)}...` : combined;
  return {
    ok: res.ok,
    exitCode: res.ok ? 0 : typeof res.exitCode === "number" && res.exitCode !== 0 ? res.exitCode : 1,
    durationMs,
    outputSnippet: snippet,
    timedOut: res.timedOut === true,
  };
}

function resolveContainedPath(rootDir: string, userPath: string): string | null {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedTarget = path.resolve(resolvedRoot, userPath);
  const rel = path.relative(resolvedRoot, resolvedTarget);
  if (!rel || rel === "." || rel.startsWith("..") || path.isAbsolute(rel)) {
    return null;
  }
  return resolvedTarget;
}

export async function loadReviewerRisksIfPresent(targetDir: string): Promise<string[]> {
  const reviewerFile = path.join(targetDir, DEFAULT_REVIEWER_JSON);
  if (!existsSync(reviewerFile)) {
    return [];
  }
  try {
    const raw = JSON.parse(await readFile(reviewerFile, "utf8")) as { risks?: unknown };
    if (Array.isArray(raw.risks)) {
      return raw.risks.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
  } catch {
    // Ignore malformed optional reviewer file.
  }
  return [];
}

/** Loads and validates contract document from `SPEC.md` (or custom path) plus its SHA-256 hash. */
export async function loadContractDocument(
  targetDir: string,
  contractRelPath = "SPEC.md"
): Promise<{ contract: ContractDocument; contractHash: string; fullPath: string }> {
  const fullPath = path.resolve(targetDir, contractRelPath);
  if (!existsSync(fullPath)) {
    throw new Error(`Contract file not found: ${contractRelPath}`);
  }
  const raw = await readFile(fullPath, "utf8");
  const contract = parseContractFromMarkdown(raw, contractRelPath);
  const contractHash = sha256(
    JSON.stringify({
      title: contract.title,
      requirements: contract.requirements,
      outOfScope: contract.outOfScope,
    })
  );
  return { contract, contractHash, fullPath };
}

async function runSingleCheck(
  check: ContractCheck,
  reqId: string,
  options: {
    targetDir: string;
    timeoutMs: number;
    manualEvidence: Record<string, string>;
  }
): Promise<{ exec: EvidenceCheckExecution; blockedReason?: string; evidenceText: string }> {
  if (check.kind === "file") {
    const safePath = resolveContainedPath(options.targetDir, check.value);
    if (!safePath) {
      return {
        exec: {
          raw: check.raw,
          kind: "file",
          ok: false,
          outputSnippet: `Rejected path outside workspace: ${check.value}`,
        },
        blockedReason: `Path outside workspace: ${check.value}`,
        evidenceText: `Blocked: path outside workspace (\`${check.value}\`)`,
      };
    }
    if (!existsSync(safePath)) {
      return {
        exec: {
          raw: check.raw,
          kind: "file",
          ok: false,
          outputSnippet: `Missing artifact: ${check.value}`,
        },
        evidenceText: `Missing artifact \`${check.value}\``,
      };
    }
    const stats = statSync(safePath);
    if (!stats.isFile() || stats.size === 0) {
      return {
        exec: {
          raw: check.raw,
          kind: "file",
          ok: false,
          outputSnippet: `Empty or invalid artifact: ${check.value}`,
        },
        evidenceText: `Empty or non-file artifact \`${check.value}\``,
      };
    }
    return {
      exec: {
        raw: check.raw,
        kind: "file",
        ok: true,
        outputSnippet: `File present (${stats.size} bytes)`,
      },
      evidenceText: `\`${check.value}\` (${stats.size} B)`,
    };
  }

  if (check.kind === "manual") {
    const manualNote = options.manualEvidence[reqId];
    if (manualNote && manualNote.trim()) {
      return {
        exec: {
          raw: check.raw,
          kind: "manual",
          ok: true,
          outputSnippet: manualNote.trim(),
        },
        evidenceText: `Manual verified: ${manualNote.trim()}`,
      };
    }
    return {
      exec: {
        raw: check.raw,
        kind: "manual",
        ok: false,
        outputSnippet: `Pending manual check: ${check.value}`,
      },
      evidenceText: `Pending manual check (${check.value})`,
    };
  }

  // Command check
  const tokenized = tokenizeCommandStrict(check.value);
  if (!tokenized.ok) {
    return {
      exec: {
        raw: check.raw,
        kind: "command",
        ok: false,
        outputSnippet: tokenized.error,
      },
      blockedReason: tokenized.error,
      evidenceText: `Blocked unsafe command: ${tokenized.error}`,
    };
  }

  const run = await execSafeArgv(tokenized.argv, options.timeoutMs, options.targetDir);
  return {
    exec: {
      raw: check.raw,
      kind: "command",
      ok: run.ok,
      exitCode: run.exitCode,
      durationMs: run.durationMs,
      ...(run.outputSnippet ? { outputSnippet: run.outputSnippet } : {}),
    },
    evidenceText: run.ok
      ? `\`${check.value}\` OK (${run.durationMs}ms)`
      : run.timedOut
        ? `\`${check.value}\` TIMED OUT after ${Math.round(options.timeoutMs / 1000)}s (not a test failure; raise --timeout for long suites)`
        : `\`${check.value}\` FAIL (exit ${run.exitCode})${run.outputSnippet ? `: ${run.outputSnippet}` : ""}`,
  };
}

/**
 * Executes contract checks safely via `runExecFile`, writes `.agents/evidence/report.{json,md}`,
 * or fast-checks an existing matching report when `fromReport` is true.
 */
export async function runVerify(options: VerifyOptions): Promise<VerifyResult> {
  const targetDir = path.resolve(options.targetDir);
  const contractRelPath = options.contractRelPath ?? "SPEC.md";
  const timeoutMs = options.timeoutMs ?? 60_000;
  const lang = options.lang ?? "en";

  const { contract, contractHash } = await loadContractDocument(targetDir, contractRelPath);
  const reportJsonFull = path.join(targetDir, DEFAULT_REPORT_JSON);
  const reportMdFull = path.join(targetDir, DEFAULT_REPORT_MD);

  if (options.fromReport) {
    if (existsSync(reportJsonFull)) {
      try {
        const cached = EvidenceReportSchema.parse(
          JSON.parse(await readFile(reportJsonFull, "utf8"))
        );
        const freshAndComplete =
          cached.contractHash === contractHash &&
          cached.overallStatus === "verified" &&
          cached.summary.pending === 0 &&
          cached.summary.blocked === 0;

        if (freshAndComplete) {
          return {
            exitCode: 0,
            report: cached,
            markdown: renderEvidenceReportMarkdown(cached, lang),
            fromCache: true,
          };
        }
        if (!options.auto) {
          const reason =
            cached.contractHash !== contractHash
              ? "Evidence report is stale (contract changed since last mtsk verify run)."
              : "Evidence report has pending or blocked requirements.";
          return {
            exitCode: 1,
            report: cached,
            markdown: renderEvidenceReportMarkdown(cached, lang),
            fromCache: true,
            error: reason,
          };
        }
      } catch {
        if (!options.auto) {
          // Fall through to build an incomplete empty report when cached JSON is unreadable.
        }
      }
    }

    if (!options.auto) {
      const missingReport = EvidenceReportSchema.parse({
        schemaVersion: "1.0.0",
        generatedAt: new Date().toISOString(),
        contractPath: contractRelPath,
        contractHash,
        title: contract.title,
        overallStatus: "incomplete",
        requirements: contract.requirements.map((r) => ({
          id: r.id,
          description: r.description,
          status: "pending" as const,
          evidence: ["Not verified yet — run `mtsk verify`"],
          checkResults: [],
        })),
        reviewerRisks: [],
        summary: { verified: 0, pending: contract.requirements.length, blocked: 0 },
      });
      return {
        exitCode: 1,
        report: missingReport,
        markdown: renderEvidenceReportMarkdown(missingReport, lang),
        fromCache: false,
        error: "No .agents/evidence/report.json found. Run `mtsk verify` first.",
      };
    }
  }

  const manualEvidence = options.manualEvidence ?? {};
  const results: EvidenceRequirementResult[] = [];

  for (const req of contract.requirements) {
    if (req.checks.length === 0) {
      results.push({
        id: req.id,
        description: req.description,
        status: "pending",
        evidence: [req.risk ? `Risk (no check): ${req.risk}` : "No check defined in contract"],
        checkResults: [],
      });
      continue;
    }

    const checkResults: EvidenceCheckExecution[] = [];
    const evidenceItems: string[] = [];
    let hasBlocked = false;
    let allPassed = true;

    for (const chk of req.checks) {
      const outcome = await runSingleCheck(chk, req.id, {
        targetDir,
        timeoutMs,
        manualEvidence,
      });
      checkResults.push(outcome.exec);
      evidenceItems.push(outcome.evidenceText);
      if (outcome.blockedReason) {
        hasBlocked = true;
        allPassed = false;
      } else if (!outcome.exec.ok) {
        allPassed = false;
      }
    }

    const status = hasBlocked ? "blocked" : allPassed ? "verified" : "pending";
    results.push({
      id: req.id,
      description: req.description,
      status,
      evidence: evidenceItems,
      checkResults,
    });
  }

  const fileRisks = await loadReviewerRisksIfPresent(targetDir);
  const reviewerRisks = [...new Set([...(options.reviewerRisks ?? []), ...fileRisks])];

  const verifiedCount = results.filter((r) => r.status === "verified").length;
  const pendingCount = results.filter((r) => r.status === "pending").length;
  const blockedCount = results.filter((r) => r.status === "blocked").length;

  const overallStatus =
    results.length > 0 && pendingCount === 0 && blockedCount === 0 ? "verified" : "incomplete";

  const report = EvidenceReportSchema.parse({
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    contractPath: contractRelPath,
    contractHash,
    title: contract.title,
    overallStatus,
    requirements: results,
    reviewerRisks,
    summary: {
      verified: verifiedCount,
      pending: pendingCount,
      blocked: blockedCount,
    },
  });

  const markdown = renderEvidenceReportMarkdown(report, lang);
  await writeTextFile(reportJsonFull, `${JSON.stringify(report, null, 2)}\n`);
  await writeTextFile(reportMdFull, markdown);

  return {
    exitCode: overallStatus === "verified" ? 0 : 1,
    report,
    markdown,
    fromCache: false,
  };
}
