import type { EvalHostVariantMetrics, EvalRunRecord, EvalSummaryReport } from "../schemas/eval.js";

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const avg = mean(values);
  const variance = mean(values.map((v) => (v - avg) ** 2));
  return Math.sqrt(variance);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function aggregateHostVariantMetrics(runs: EvalRunRecord[]): EvalHostVariantMetrics {
  const completed = runs.filter((r) => r.status === "completed");
  const base = completed.length > 0 ? completed : runs;

  const falseDoneFlags = base.map((r) => (r.falseDone ? 100 : 0));
  const criteriaPcts = base.map((r) => r.criteriaFulfilledRatio * 100);
  const tokenValues = base
    .map((r) => r.totalTokens)
    .filter((t): t is number => typeof t === "number");

  return {
    falseDoneRatePct: round2(mean(falseDoneFlags)),
    falseDoneStdDevPct: round2(stdDev(falseDoneFlags)),
    criteriaFulfilledPct: round2(mean(criteriaPcts)),
    criteriaStdDevPct: round2(stdDev(criteriaPcts)),
    meanCollateralDamage: round2(mean(base.map((r) => r.collateralDamage))),
    totalPermissionViolations: base.reduce((sum, r) => sum + r.permissionViolations, 0),
    meanInterventions: round2(mean(base.map((r) => r.interventions))),
    meanElapsedMs: round2(mean(base.map((r) => r.elapsedMs))),
    meanTokens: tokenValues.length > 0 ? round2(mean(tokenValues)) : null,
  };
}

export function renderEvalResultsMarkdown(report: EvalSummaryReport): string {
  const lines: string[] = [
    "# MetaSkill Benchmark Results (`evals/RESULTS.md`)",
    "",
    `- **Generated:** \`${report.generatedAt}\``,
    `- **Subset:** \`${report.subset}\` | **Runs per scenario:** \`${report.runsPerScenario}\``,
    "",
    "## 1. Host Availability",
    "",
    "| Host | Status |",
    "| :--- | :--- |",
  ];

  for (const host of report.hostsRequested) {
    lines.push(`| \`${host}\` | ${report.hostStatus[host] ?? "unknown"} |`);
  }

  lines.push(
    "",
    "## 2. Summary by Host (Without vs. With MetaSkill)",
    "",
    "| Host | Variant | False Done % (mean ± sd) | Criteria % (mean ± sd) | Collateral Damage | Permission Violations | Interventions | Mean Time (s) | Mean Tokens |",
    "| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"
  );

  for (const [host, entry] of Object.entries(report.byHost)) {
    const b = entry.bare;
    const m = entry.metaskill;
    lines.push(
      `| \`${host}\` | Bare agent | ${b.falseDoneRatePct}% ± ${b.falseDoneStdDevPct}% | ${b.criteriaFulfilledPct}% ± ${b.criteriaStdDevPct}% | ${b.meanCollateralDamage} | ${b.totalPermissionViolations} | ${b.meanInterventions} | ${round2(b.meanElapsedMs / 1000)}s | ${b.meanTokens ?? "n/a"} |`,
      `| \`${host}\` | **MetaSkill** | **${m.falseDoneRatePct}% ± ${m.falseDoneStdDevPct}%** | **${m.criteriaFulfilledPct}% ± ${m.criteriaStdDevPct}%** | ${m.meanCollateralDamage} | ${m.totalPermissionViolations} | ${m.meanInterventions} | ${round2(m.meanElapsedMs / 1000)}s | ${m.meanTokens ?? "n/a"} |`
    );
    const reductionText =
      entry.falseDoneReductionPct !== null ? `${entry.falseDoneReductionPct}%` : "n/a";
    const timeDeltaText =
      entry.timeOverheadPct !== null ? `${entry.timeOverheadPct > 0 ? "+" : ""}${entry.timeOverheadPct}%` : "n/a";
    const tokenDeltaText =
      entry.tokenOverheadPct !== null ? `${entry.tokenOverheadPct > 0 ? "+" : ""}${entry.tokenOverheadPct}%` : "n/a";
    lines.push(
      `| \`${host}\` | _Delta_ | _Reduction: ${reductionText}_ | — | — | — | — | _${timeDeltaText}_ | _${tokenDeltaText}_ |`
    );
  }

  lines.push(
    "",
    "## 3. Per-Scenario Breakdown",
    "",
    "| Scenario | Host | Variant | Runs | False Done | Criteria % | Violations | Time (s) | Judge |",
    "| :--- | :--- | :--- | ---: | ---: | ---: | ---: | ---: | :--- |"
  );

  const grouped = new Map<string, EvalRunRecord[]>();
  for (const run of report.runs) {
    const key = `${run.scenarioId}::${run.host}::${run.variant}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(run);
    grouped.set(key, bucket);
  }

  for (const [key, group] of grouped.entries()) {
    const [scenarioId, host, variant] = key.split("::");
    const metrics = aggregateHostVariantMetrics(group);
    const judges = [...new Set(group.map((g) => g.judgeProvider))].join(",");
    lines.push(
      `| \`${scenarioId}\` | \`${host}\` | ${variant} | ${group.length} | ${metrics.falseDoneRatePct}% | ${metrics.criteriaFulfilledPct}% | ${metrics.totalPermissionViolations} | ${round2(metrics.meanElapsedMs / 1000)}s | \`${judges}\` |`
    );
  }

  lines.push("");
  return lines.join("\n");
}
