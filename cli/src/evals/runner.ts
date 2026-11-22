import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  EvalScenariosCatalogSchema,
  EvalSummaryReportSchema,
  type EvalHost,
  type EvalRunRecord,
  type EvalScenario,
  type EvalSummaryReport,
} from "../schemas/eval.js";
import { runProbe } from "../probes/index.js";
import { getPackageRoot } from "../utils/paths.js";
import { evaluateDeterministic, snapshotWorkspaceHashes } from "./deterministic.js";
import {
  checkHostAvailability,
  invokeHeadlessAgent,
  prepareScenarioWorkspace,
} from "./hosts.js";
import { judgeEvalRun, resolveJudgeProvider, type JudgeChoice } from "./judge.js";
import { aggregateHostVariantMetrics, renderEvalResultsMarkdown } from "./report.js";

export interface RunEvalSuiteOptions {
  hosts: EvalHost[];
  subset: "quick" | "full";
  scenarioFilter?: string[];
  runs: number;
  concurrency?: number;
  judge: JudgeChoice;
  timeoutMs: number;
  model?: string;
  outMarkdownPath?: string;
  outJsonPath?: string;
  runsDir?: string;
  pkgRoot?: string;
  onProgress?: (msg: string) => void;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatDiffSummary(det: {
  filesAdded: string[];
  filesModified: string[];
  filesDeleted: string[];
}): string {
  const parts: string[] = [];
  if (det.filesAdded.length > 0) parts.push(`+${det.filesAdded.join(",+")}`);
  if (det.filesModified.length > 0) parts.push(`~${det.filesModified.join(",~")}`);
  if (det.filesDeleted.length > 0) parts.push(`-${det.filesDeleted.join(",-")}`);
  return parts.length > 0 ? parts.join(" | ") : "clean (0 mutations)";
}

/** Executes the MetaSkill evaluation benchmark across hosts, scenarios, variants, and N runs. */
export async function runEvalSuite(options: RunEvalSuiteOptions): Promise<EvalSummaryReport> {
  const pkgRoot = options.pkgRoot ?? getPackageRoot();
  const catalogRaw = JSON.parse(
    readFileSync(path.join(pkgRoot, "evals", "scenarios.json"), "utf8")
  ) as unknown;
  const catalog = EvalScenariosCatalogSchema.parse(catalogRaw);

  let selected: EvalScenario[] = catalog.scenarios;
  if (options.subset === "quick") {
    selected = selected.filter((s) => s.subset === "quick");
  }
  if (options.scenarioFilter && options.scenarioFilter.length > 0) {
    const wanted = new Set(options.scenarioFilter);
    selected = selected.filter((s) => wanted.has(s.id));
  }
  if (selected.length === 0) {
    throw new Error("No evaluation scenarios matched the given filters.");
  }

  const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runsBaseDir =
    options.runsDir ??
    process.env.MTSK_EVAL_RUNS_DIR ??
    path.join(pkgRoot, "evals", ".runs");
  const artifactRoot = path.join(runsBaseDir, runStamp);
  mkdirSync(artifactRoot, { recursive: true });

  const baseProbe = await runProbe(pkgRoot);
  const hostStatus: Record<string, string> = {};
  const allRuns: EvalRunRecord[] = [];
  const byHost: EvalSummaryReport["byHost"] = {};

  const activeHosts: Array<{ host: EvalHost; binaryPath: string }> = [];
  for (const host of options.hosts) {
    const avail = await checkHostAvailability(host);
    if (!avail.available || !avail.authenticated || !avail.binaryPath) {
      hostStatus[host] = avail.reason ?? "unavailable";
      options.onProgress?.(`[${host}] skipped: ${hostStatus[host]}`);
      continue;
    }
    hostStatus[host] = "active";
    activeHosts.push({ host, binaryPath: avail.binaryPath });
  }

  await Promise.all(
    activeHosts.map(async ({ host, binaryPath }) => {
      const judgeProvider = await resolveJudgeProvider(host, options.judge);
      const hostRuns: EvalRunRecord[] = [];
      const concurrency = Math.max(1, options.concurrency ?? 3);

      interface EvalJob {
        scenario: EvalScenario;
        fixtureSnapshots: Record<string, string>;
        variant: "bare" | "metaskill";
        runIndex: number;
      }

      const jobs: EvalJob[] = [];
      for (const scenario of selected) {
        const fixtureSnapshots = snapshotWorkspaceHashes(path.join(pkgRoot, scenario.fixtureDir));
        for (const variant of ["bare", "metaskill"] as const) {
          for (let runIndex = 1; runIndex <= options.runs; runIndex += 1) {
            jobs.push({ scenario, fixtureSnapshots, variant, runIndex });
          }
        }
      }

      let nextJobIdx = 0;
      const executeJob = async (job: EvalJob): Promise<EvalRunRecord> => {
        const { scenario, fixtureSnapshots, variant, runIndex } = job;
        const withMetaSkill = variant === "metaskill";
        options.onProgress?.(
          `[${host}] ${scenario.id} (${variant}) run ${runIndex}/${options.runs}`
        );
        const workDir = path.join(
          os.tmpdir(),
          `mtsk-eval-${host}-${scenario.id}-${variant}-${runIndex}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`
        );
        mkdirSync(workDir, { recursive: true });

        try {
          const { preExistingAgentsMd } = await prepareScenarioWorkspace({
            pkgRoot,
            scenario,
            workDir,
            withMetaSkill,
            host,
            baseProbe,
          });
          const beforeRunSnapshots = snapshotWorkspaceHashes(workDir);

          const agentResult = await invokeHeadlessAgent({
            host,
            binaryPath,
            prompt: scenario.userPrompt,
            workDir,
            permissionMode: scenario.initialConfig.permissionMode,
            withMetaSkill,
            timeoutMs: options.timeoutMs,
            model: options.model,
            scenarioId: scenario.id,
          });

          const deterministic = await evaluateDeterministic({
            workDir,
            scenario,
            beforeRunSnapshots,
            fixtureSnapshots,
            preExistingAgentsMd,
            responseText: agentResult.responseText,
          });

          const judgeScore = await judgeEvalRun({
            pkgRoot,
            scenario,
            variant,
            responseText: agentResult.responseText,
            deterministic,
            judgeProvider,
          });

          const checkRatio =
            deterministic.checksTotal > 0
              ? deterministic.checksPassed / deterministic.checksTotal
              : deterministic.permissionViolations === 0
                ? 1
                : 0;

          const permissionViolations = Math.max(
            deterministic.permissionViolations,
            judgeScore?.permissionViolations ?? 0
          );
          const collateralDamage = Math.max(
            deterministic.collateralDamage,
            judgeScore?.collateralDamage ?? 0
          );
          const falseDone =
            deterministic.deterministicFalseDone || Boolean(judgeScore?.falseDone);
          const criteriaFulfilledRatio =
            judgeScore !== null
              ? deterministic.checksTotal > 0
                ? Math.min(judgeScore.criteriaFulfilledRatio, checkRatio)
                : judgeScore.criteriaFulfilledRatio
              : checkRatio;
          const interventions =
            judgeScore?.estimatedInterventions ??
            (permissionViolations + collateralDamage + (falseDone ? 1 : 0));

          const diffSummary = formatDiffSummary(deterministic);
          const runArtifactDir = path.join(
            artifactRoot,
            host,
            scenario.id,
            `${variant}-run${runIndex}`
          );
          mkdirSync(runArtifactDir, { recursive: true });
          const transcriptPath = path.join(runArtifactDir, "transcript.txt");
          writeFileSync(transcriptPath, agentResult.rawTranscript, "utf8");
          writeFileSync(path.join(runArtifactDir, "diff.txt"), `${diffSummary}\n`, "utf8");

          const record: EvalRunRecord = {
            scenarioId: scenario.id,
            host,
            variant,
            runIndex,
            status: agentResult.status,
            elapsedMs: agentResult.elapsedMs,
            totalTokens: agentResult.totalTokens,
            falseDone,
            criteriaFulfilledRatio: round2(criteriaFulfilledRatio),
            collateralDamage,
            permissionViolations,
            interventions,
            deterministic,
            judgeScore,
            judgeProvider,
            transcriptPath: path.relative(pkgRoot, transcriptPath).replaceAll("\\", "/"),
            diffSummary,
            ...(agentResult.errorMessage ? { errorMessage: agentResult.errorMessage } : {}),
          };
          writeFileSync(
            path.join(runArtifactDir, "result.json"),
            `${JSON.stringify(record, null, 2)}\n`,
            "utf8"
          );
          return record;
        } finally {
          rmSync(workDir, { recursive: true, force: true });
        }
      };

      const workers = Array.from(
        { length: Math.min(concurrency, Math.max(jobs.length, 1)) },
        async () => {
          while (nextJobIdx < jobs.length) {
            const idx = nextJobIdx;
            nextJobIdx += 1;
            const job = jobs[idx];
            if (job) {
              const record = await executeJob(job);
              hostRuns.push(record);
            }
          }
        }
      );
      await Promise.all(workers);

      hostRuns.sort((a, b) =>
        `${a.scenarioId}:${a.variant}:${a.runIndex}`.localeCompare(
          `${b.scenarioId}:${b.variant}:${b.runIndex}`
        )
      );
      allRuns.push(...hostRuns);

      const bareMetrics = aggregateHostVariantMetrics(
        hostRuns.filter((r) => r.variant === "bare")
      );
      const mtskMetrics = aggregateHostVariantMetrics(
        hostRuns.filter((r) => r.variant === "metaskill")
      );

      const falseDoneReductionPct =
        bareMetrics.falseDoneRatePct > 0
          ? round2(
              ((bareMetrics.falseDoneRatePct - mtskMetrics.falseDoneRatePct) /
                bareMetrics.falseDoneRatePct) *
                100
            )
          : null;
      const timeOverheadPct =
        bareMetrics.meanElapsedMs > 0
          ? round2(
              ((mtskMetrics.meanElapsedMs - bareMetrics.meanElapsedMs) /
                bareMetrics.meanElapsedMs) *
                100
            )
          : null;
      const tokenOverheadPct =
        bareMetrics.meanTokens && bareMetrics.meanTokens > 0 && mtskMetrics.meanTokens !== null
          ? round2(((mtskMetrics.meanTokens - bareMetrics.meanTokens) / bareMetrics.meanTokens) * 100)
          : null;

      byHost[host] = {
        bare: bareMetrics,
        metaskill: mtskMetrics,
        falseDoneReductionPct,
        timeOverheadPct,
        tokenOverheadPct,
      };
    })
  );

  allRuns.sort((a, b) =>
    `${a.host}:${a.scenarioId}:${a.variant}:${a.runIndex}`.localeCompare(
      `${b.host}:${b.scenarioId}:${b.variant}:${b.runIndex}`
    )
  );

  const report = EvalSummaryReportSchema.parse({
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    subset: options.subset,
    runsPerScenario: options.runs,
    hostsRequested: options.hosts,
    hostStatus,
    byHost,
    runs: allRuns,
  });

  if (options.outMarkdownPath) {
    mkdirSync(path.dirname(options.outMarkdownPath), { recursive: true });
    writeFileSync(options.outMarkdownPath, renderEvalResultsMarkdown(report), "utf8");
  }
  if (options.outJsonPath) {
    mkdirSync(path.dirname(options.outJsonPath), { recursive: true });
    writeFileSync(options.outJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  return report;
}
