import path from "node:path";
import pc from "picocolors";
import { runDoctor, type DoctorCheck } from "../adapters/doctor-rules.js";
import { runProbe } from "../probes/index.js";
import { DomainIdSchema, type DomainId } from "../schemas/config.js";
import { loadConfigIfPresent } from "./helpers.js";

export interface DoctorCommandOptions {
  dir?: string;
  domain?: string;
  json?: boolean;
}

function formatCheckIcon(severity: DoctorCheck["severity"]): string {
  if (severity === "pass") {
    return pc.green("PASS");
  }
  if (severity === "warning") {
    return pc.yellow("WARN");
  }
  return pc.red("FAIL");
}

/** Runs `mtsk doctor` to verify canonical health, adapters, OS prerequisites, and hardware feasibility. */
export async function doctorCommand(options: DoctorCommandOptions): Promise<void> {
  const targetDir = path.resolve(options.dir ?? process.cwd());
  const domainFilter: DomainId | undefined = options.domain
    ? DomainIdSchema.parse(options.domain)
    : undefined;

  const [probe, config] = await Promise.all([
    runProbe(targetDir),
    loadConfigIfPresent(targetDir),
  ]);

  const report = await runDoctor(targetDir, probe, config, domainFilter);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    if (report.status === "errors") {
      process.exitCode = 1;
    }
    return;
  }

  console.log(pc.bold("MetaSkill Doctor Report"));
  console.log(`  Workspace : ${targetDir}`);
  console.log(`  Scope     : Environment Readiness (not deliverable acceptance)`);
  console.log(`  Status    : ${report.status.toUpperCase()}\n`);

  for (const check of report.checks) {
    console.log(`  [${formatCheckIcon(check.severity)}] ${check.name} — ${check.message}`);
    if (check.installHint && check.severity !== "pass") {
      console.log(`         ${pc.dim(`Hint: ${check.installHint}`)}`);
    }
  }

  if (report.editorCapabilities.length > 0) {
    console.log(pc.bold("\nConfigured Editor Guarantees"));
    for (const cap of report.editorCapabilities) {
      console.log(
        `  - ${cap.displayName}: ${cap.permissionEnforcement} (AGENTS.md auto-load: ${cap.autoLoadsCanonicalAgentsMd ? "yes" : "no"})`
      );
    }
  }

  if (report.advisories.length > 0) {
    console.log(pc.bold("\nHardware & Safety Advisories"));
    for (const note of report.advisories) {
      console.log(`  - ${note}`);
    }
  }

  if (report.readinessNotes.length > 0) {
    console.log(pc.bold("\nProject & Evidence Readiness Notes"));
    for (const note of report.readinessNotes) {
      console.log(`  - ${note}`);
    }
  }

  if (report.status === "errors") {
    process.exitCode = 1;
  }
}
