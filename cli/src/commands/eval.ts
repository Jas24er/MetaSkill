import path from "node:path";
import pc from "picocolors";
import { parseCsvEnum } from "./helpers.js";
import { EvalHostSchema, type EvalHost } from "../schemas/eval.js";
import type { JudgeChoice } from "../evals/judge.js";
import { runEvalSuite } from "../evals/runner.js";
import { getPackageRoot } from "../utils/paths.js";

export interface EvalCommandOptions {
  hosts?: string;
  subset?: "quick" | "full";
  scenario?: string;
  runs?: string;
  concurrency?: string;
  judge?: JudgeChoice;
  timeout?: string;
  model?: string;
  out?: string;
  json?: boolean;
}

/** Runs `mtsk eval` to benchmark MetaSkill vs bare agents across headless host CLIs. */
export async function evalCommand(options: EvalCommandOptions): Promise<void> {
  const pkgRoot = getPackageRoot();
  const hosts: EvalHost[] = options.hosts
    ? parseCsvEnum(options.hosts, EvalHostSchema, "--hosts")
    : ["codex", "claude-code", "antigravity"];
  const subset = options.subset === "quick" ? "quick" : "full";
  const runs = Math.max(1, Number.parseInt(options.runs ?? "3", 10) || 3);
  const concurrency = Math.max(1, Number.parseInt(options.concurrency ?? "3", 10) || 3);
  const timeoutMs = Math.max(5000, Number.parseInt(options.timeout ?? "240000", 10) || 240000);
  const judge: JudgeChoice = options.judge ?? "auto";
  const scenarioFilter = options.scenario
    ? options.scenario.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  const outMd = options.out ? path.resolve(options.out) : path.join(pkgRoot, "evals", "RESULTS.md");
  const outJson = outMd.replace(/\.md$/i, ".json").replace("RESULTS.json", "results.json");

  const report = await runEvalSuite({
    hosts,
    subset,
    scenarioFilter,
    runs,
    concurrency,
    judge,
    timeoutMs,
    model: options.model,
    outMarkdownPath: outMd,
    outJsonPath: outJson,
    pkgRoot,
    onProgress: options.json ? undefined : (msg) => console.error(pc.dim(msg)),
  });

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(pc.bold("\nMetaSkill Evaluation Complete"));
  console.log(`  Report : ${outMd}`);
  for (const host of hosts) {
    console.log(`  Host   : ${host} -> ${report.hostStatus[host]}`);
    const summary = report.byHost[host];
    if (summary) {
      console.log(
        `           False Done: bare ${summary.bare.falseDoneRatePct}% -> MetaSkill ${summary.metaskill.falseDoneRatePct}% | Time delta: ${summary.timeOverheadPct ?? "n/a"}%`
      );
    }
  }
}
