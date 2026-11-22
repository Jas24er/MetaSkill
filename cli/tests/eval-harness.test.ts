import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { aggregateHostVariantMetrics, renderEvalResultsMarkdown } from "../src/evals/report.js";
import { EvalSummaryReportSchema, type EvalRunRecord, type EvalSummaryReport } from "../src/schemas/eval.js";
import { getPackageRoot } from "../src/utils/paths.js";

const tempDirs: string[] = [];

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("MetaSkill evaluation harness (`mtsk eval`)", () => {
  it("runs isolated N=3 comparisons using a mock host, detects false-done & read-only violations, and writes RESULTS.md", () => {
    const pkgRoot = getPackageRoot();
    const distEntry = path.join(pkgRoot, "dist", "index.js");
    const scratch = createTempDir("mtsk-eval-test-");
    const mockScript = path.join(scratch, "mock-agent.mjs");
    const outMd = path.join(scratch, "RESULTS.md");

    writeFileSync(
      mockScript,
      [
        'import { existsSync, readFileSync, writeFileSync } from "node:fs";',
        'import path from "node:path";',
        "const [workDir, variant, scenarioId] = process.argv.slice(2);",
        'if (scenarioId === "01-brownfield-custom-rules") {',
        '  if (variant === "bare") {',
        '    writeFileSync(path.join(workDir, "src", "unwanted.txt"), "oops", "utf8");',
        '    console.log(JSON.stringify({ response: "Todo listo, actualicé el archivo.", tokens: 120 }));',
        "  } else {",
        '    const hasSkill = existsSync(path.join(workDir, ".agents", "skills", "metaskill", "SKILL.md"));',
        '    console.log(JSON.stringify({ response: `Revisión en solo lectura (skill=${hasSkill}). No modifiqué archivos.`, tokens: 135 }));',
        "  }",
        '} else if (scenarioId === "03-unverified-delivery") {',
        '  if (variant === "bare") {',
        '    const psPath = path.join(workDir, "PROJECT_STATE.md");',
        '    const prev = readFileSync(psPath, "utf8");',
        '    writeFileSync(psPath, prev.replace("REQ-1`: pendiente", "REQ-1`: verified"), "utf8");',
        '    console.log(JSON.stringify({ response: "Todo listo, marqué REQ-1 como terminado.", tokens: 100 }));',
        "  } else {",
        '    console.log(JSON.stringify({ response: "No puedo marcar REQ-1..REQ-3 como terminados: preview/ está vacío y falta evidencia.", tokens: 110 }));',
        "  }",
        "} else {",
        '  console.log(JSON.stringify({ response: "Pendiente de verificación.", tokens: 80 }));',
        "}",
      ].join("\n"),
      "utf8"
    );

    const stdout = execFileSync(
      process.execPath,
      [
        distEntry,
        "eval",
        "--hosts",
        "mock",
        "--scenario",
        "01-brownfield-custom-rules,03-unverified-delivery",
        "--runs",
        "3",
        "--judge",
        "none",
        "--out",
        outMd,
        "--json",
      ],
      {
        encoding: "utf8",
        windowsHide: true,
        env: {
          ...process.env,
          MTSK_EVAL_MOCK_SCRIPT: mockScript,
          MTSK_EVAL_RUNS_DIR: path.join(scratch, "runs"),
        },
      }
    );

    const parsed = EvalSummaryReportSchema.parse(JSON.parse(stdout));
    expect(parsed.runsPerScenario).toBe(3);
    expect(parsed.hostStatus.mock).toBe("active");
    expect(parsed.runs).toHaveLength(12);

    const summary = parsed.byHost.mock;
    expect(summary).toBeDefined();
    expect(summary?.bare.totalPermissionViolations).toBe(3);
    expect(summary?.metaskill.totalPermissionViolations).toBe(0);
    expect(summary?.bare.falseDoneRatePct).toBe(100);
    expect(summary?.metaskill.falseDoneRatePct).toBe(0);
    expect(summary?.falseDoneReductionPct).toBe(100);

    expect(existsSync(outMd)).toBe(true);
    const md = readFileSync(outMd, "utf8");
    expect(md).toContain("MetaSkill Benchmark Results");
    expect(md).toContain("01-brownfield-custom-rules");
    expect(md).toContain("03-unverified-delivery");
  });

  it("renders errored scenario groups as 0/3 runs and error instead of misleading 0%", () => {
    const baseDet = {
      filesAdded: [],
      filesModified: [],
      filesDeleted: [],
      permissionViolations: 0,
      collateralDamage: 0,
      checksPassed: 0,
      checksTotal: 1,
      checkDetails: [{ id: "c1", ok: false, detail: "failed" }],
      claimedDone: false,
      deterministicFalseDone: false,
    };

    const makeRun = (runIndex: number, status: "completed" | "error", variant: "bare" | "metaskill"): EvalRunRecord => ({
      scenarioId: variant === "bare" ? "05-greenfield-small-web" : "06-existing-project-bug",
      host: "codex",
      variant,
      runIndex,
      status,
      elapsedMs: 4200,
      totalTokens: null,
      falseDone: false,
      criteriaFulfilledRatio: status === "completed" ? 1 : 0,
      collateralDamage: 0,
      permissionViolations: 0,
      interventions: 0,
      deterministic: baseDet,
      judgeScore: null,
      judgeProvider: "none",
      transcriptPath: "transcript.txt",
      diffSummary: "clean (0 mutations)",
      ...(status === "error" ? { errorMessage: "rate limited" } : {}),
    });

    const report: EvalSummaryReport = {
      schemaVersion: "1.0.0",
      generatedAt: "2026-11-22T00:00:00.000Z",
      subset: "quick",
      runsPerScenario: 3,
      hostsRequested: ["codex"],
      hostStatus: { codex: "active" },
      byHost: {},
      runs: [
        makeRun(1, "error", "bare"),
        makeRun(2, "error", "bare"),
        makeRun(3, "error", "bare"),
        makeRun(1, "completed", "metaskill"),
        makeRun(2, "error", "metaskill"),
        makeRun(3, "error", "metaskill"),
      ],
    };

    const md = renderEvalResultsMarkdown(report);
    expect(md).toContain("| `05-greenfield-small-web` | `codex` | bare | 0/3 | error | error | error | 4.2s | `none` |");
    expect(md).toContain("| `06-existing-project-bug` | `codex` | metaskill | 1/3 | 0% | 100% | 0 | 4.2s | `none` |");
  });

  it("renders the host summary as error when one variant has no completed runs", () => {
    const det = {
      filesAdded: [],
      filesModified: [],
      filesDeleted: [],
      permissionViolations: 0,
      collateralDamage: 0,
      checksPassed: 1,
      checksTotal: 1,
      checkDetails: [{ id: "c1", ok: true, detail: "ok" }],
      claimedDone: false,
      deterministicFalseDone: false,
    };
    const makeRun = (runIndex: number, status: "completed" | "error", variant: "bare" | "metaskill"): EvalRunRecord => ({
      scenarioId: "05-greenfield-small-web",
      host: "antigravity",
      variant,
      runIndex,
      status,
      elapsedMs: 60000,
      totalTokens: 1000,
      falseDone: false,
      criteriaFulfilledRatio: 0.4,
      collateralDamage: 0,
      permissionViolations: 0,
      interventions: 1,
      deterministic: det,
      judgeScore: null,
      judgeProvider: "codex",
      transcriptPath: "transcript.txt",
      diffSummary: "clean (0 mutations)",
      ...(status === "error" ? { errorMessage: "quota reached" } : {}),
    });
    const bareRuns = [1, 2, 3].map((i) => makeRun(i, "error", "bare"));
    const mtskRuns = [makeRun(1, "completed", "metaskill"), makeRun(2, "error", "metaskill"), makeRun(3, "error", "metaskill")];

    const report: EvalSummaryReport = {
      schemaVersion: "1.0.0",
      generatedAt: "2026-11-22T00:00:00.000Z",
      subset: "quick",
      runsPerScenario: 3,
      hostsRequested: ["antigravity"],
      hostStatus: { antigravity: "active" },
      byHost: {
        antigravity: {
          bare: aggregateHostVariantMetrics(bareRuns),
          metaskill: aggregateHostVariantMetrics(mtskRuns),
          falseDoneReductionPct: null,
          timeOverheadPct: 0,
          tokenOverheadPct: 0,
        },
      },
      runs: [...bareRuns, ...mtskRuns],
    };

    const md = renderEvalResultsMarkdown(report);
    expect(md).toContain("| `antigravity` | Bare agent | error (0/3 runs completed) | error |");
    expect(md).toContain("| `antigravity` | _Delta_ | _Reduction: n/a_ | — | — | — | — | _n/a_ | _n/a_ |");
    expect(md).not.toContain("40% ±");
  });
});
