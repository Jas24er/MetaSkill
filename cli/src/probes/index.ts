import os from "node:os";
import { ProbeProfileSchema, type ProbeProfile } from "../schemas/probe.js";
import { probeBinaries } from "./binaries.js";
import { probeHardware } from "./hardware.js";
import { probeWorkspace } from "./workspace.js";

function mapPlatform(platform: NodeJS.Platform): ProbeProfile["os"]["platform"] {
  if (platform === "win32" || platform === "darwin" || platform === "linux") {
    return platform;
  }
  return "other";
}

function detectShell(): string {
  if (process.platform === "win32") {
    return process.env.ComSpec ?? "powershell";
  }
  return process.env.SHELL ?? "sh";
}

/**
 * Runs a complete deterministic probe across OS, hardware, workspace, IDEs, and binaries.
 * Output is strictly validated against `ProbeProfileSchema`.
 */
export async function runProbe(cwd: string = process.cwd()): Promise<ProbeProfile> {
  const [hardware, binaries, workspace] = await Promise.all([
    probeHardware(),
    probeBinaries(),
    probeWorkspace(cwd),
  ]);

  const profile = {
    schemaVersion: "1.0.0" as const,
    capturedAt: new Date().toISOString(),
    os: {
      platform: mapPlatform(process.platform),
      release: os.release(),
      arch: os.arch(),
      shell: detectShell(),
    },
    hardware,
    project: {
      cwd: workspace.cwd,
      isGitRepo: workspace.isGitRepo,
      mode: workspace.mode,
      existingFileCount: workspace.existingFileCount,
      detectedLanguages: workspace.detectedLanguages,
    },
    agentsDetected: workspace.agentsDetected,
    binaries,
  };

  return ProbeProfileSchema.parse(profile);
}
