import path from "node:path";
import pc from "picocolors";
import { runProbe } from "../probes/index.js";
import type { ProbeProfile } from "../schemas/probe.js";
import { writeTextFile } from "../utils/fs.js";

export interface ProbeCommandOptions {
  dir?: string;
  json?: boolean;
  write?: boolean;
}

function formatProbeSummary(profile: ProbeProfile): string {
  const lines: string[] = [];
  lines.push(pc.bold("MetaSkill Environment Probe"));
  lines.push(`  Workspace : ${profile.project.cwd} (${pc.cyan(profile.project.mode)})`);
  lines.push(`  Git Repo  : ${profile.project.isGitRepo ? pc.green("yes") : pc.yellow("no")}`);
  lines.push(
    `  OS        : ${profile.os.platform} ${profile.os.release} (${profile.os.arch})`
  );
  lines.push(
    `  CPU / RAM : ${profile.hardware.cpuCores} cores (${profile.hardware.cpuModel}), ${profile.hardware.totalRamGb} GB total (${profile.hardware.freeRamGb} GB free)`
  );

  if (profile.hardware.gpus.length === 0) {
    lines.push(`  GPU       : ${pc.dim("none detected")}`);
  } else {
    for (const gpu of profile.hardware.gpus) {
      const vram = gpu.vramMb !== null ? ` — ${gpu.vramMb} MB VRAM` : "";
      lines.push(`  GPU       : ${gpu.name} [${gpu.vendor}]${vram}`);
    }
  }

  lines.push(
    `  IDEs      : ${
      profile.agentsDetected.length > 0
        ? profile.agentsDetected.join(", ")
        : pc.dim("none detected in workspace")
    }`
  );

  const installed: string[] = [];
  const missing: string[] = [];
  for (const [name, status] of Object.entries(profile.binaries)) {
    if (status.available) {
      installed.push(name);
    } else {
      missing.push(name);
    }
  }

  lines.push(`  CLIs OK   : ${pc.green(installed.join(", ") || "none")}`);
  lines.push(`  CLIs Miss : ${pc.yellow(missing.join(", ") || "none")}`);
  return lines.join("\n");
}

/** Runs `mtsk probe` to output machine, IDE, and CLI diagnostics. */
export async function probeCommand(options: ProbeCommandOptions): Promise<void> {
  const targetDir = path.resolve(options.dir ?? process.cwd());
  const profile = await runProbe(targetDir);

  if (options.write) {
    await writeTextFile(
      path.join(targetDir, ".agents", "probe-profile.json"),
      `${JSON.stringify(profile, null, 2)}\n`
    );
  }

  if (options.json) {
    console.log(JSON.stringify(profile, null, 2));
    return;
  }

  console.log(formatProbeSummary(profile));
  if (options.write) {
    console.log(pc.dim("\nSaved profile to .agents/probe-profile.json"));
  }
}
