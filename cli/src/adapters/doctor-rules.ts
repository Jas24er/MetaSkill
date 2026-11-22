import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { EditorCapability } from "../schemas/capabilities.js";
import type { DomainId, MetaSkillConfig } from "../schemas/config.js";
import type { ProbeProfile } from "../schemas/probe.js";
import { countFileLines, loadManagedManifest } from "../utils/fs.js";
import { syncCanonicalCore } from "./canonical.js";
import { getEditorCapabilities } from "./capabilities.js";
import { getExpectedAdapterPaths, syncAdapters } from "./targets.js";

export type CheckSeverity = "pass" | "warning" | "error";

export interface DoctorCheck {
  category: "canonical" | "adapter" | "dependency";
  name: string;
  severity: CheckSeverity;
  message: string;
  installHint?: string;
}

export interface DoctorReport {
  reportScope: "environment-readiness";
  status: "healthy" | "warnings" | "errors";
  checks: DoctorCheck[];
  advisories: string[];
  readinessNotes: string[];
  editorCapabilities: EditorCapability[];
}

interface BinaryRequirement {
  binary: string;
  domain: string;
  required: boolean;
  reason: string;
  hints: Record<ProbeProfile["os"]["platform"], string>;
}

const BINARY_REQUIREMENTS: BinaryRequirement[] = [
  {
    binary: "node",
    domain: "core",
    required: true,
    reason: "Runs MetaSkill CLI and TypeScript web toolchains.",
    hints: {
      win32: "winget install OpenJS.NodeJS.LTS",
      darwin: "brew install node",
      linux: "Install Node.js >= 20 LTS via package manager or nvm",
      other: "Install Node.js >= 20 LTS from https://nodejs.org/",
    },
  },
  {
    binary: "git",
    domain: "core",
    required: false,
    reason: "Enables safe atomic checkpoints and rollback during autonomous loops.",
    hints: {
      win32: "winget install Git.Git",
      darwin: "brew install git",
      linux: "sudo apt install git",
      other: "Install Git from https://git-scm.com/",
    },
  },
  {
    binary: "npm",
    domain: "web-fullstack",
    required: true,
    reason: "Installs dependencies and runs Playwright/Next/Vite builds.",
    hints: {
      win32: "Included with Node.js (winget install OpenJS.NodeJS.LTS)",
      darwin: "Included with Node.js (brew install node)",
      linux: "Included with Node.js >= 20 LTS",
      other: "Included with Node.js >= 20 LTS",
    },
  },
  {
    binary: "ffmpeg",
    domain: "video-audio",
    required: true,
    reason: "Primary deterministic $0 video/audio transcoding and contact-sheet engine.",
    hints: {
      win32: "winget install Gyan.FFmpeg",
      darwin: "brew install ffmpeg",
      linux: "sudo apt install ffmpeg",
      other: "Install FFmpeg from https://ffmpeg.org/",
    },
  },
  {
    binary: "ffprobe",
    domain: "video-audio",
    required: true,
    reason: "Inspects media streams and enforces Technical QA assertions.",
    hints: {
      win32: "Bundled with Gyan.FFmpeg (winget install Gyan.FFmpeg)",
      darwin: "Bundled with Homebrew ffmpeg (brew install ffmpeg)",
      linux: "Bundled with ffmpeg (sudo apt install ffmpeg)",
      other: "Bundled with FFmpeg",
    },
  },
  {
    binary: "sox",
    domain: "video-audio",
    required: false,
    reason: "Optional audio DSP and spectral diagnostics.",
    hints: {
      win32: "choco install sox.portable (or scoop install sox)",
      darwin: "brew install sox",
      linux: "sudo apt install sox",
      other: "Install SoX from https://sox.sourceforge.net/",
    },
  },
  {
    binary: "uv",
    domain: "video-audio",
    required: false,
    reason: "Fast isolated Python environment manager for local Whisper/Manim pipelines.",
    hints: {
      win32: "winget install astral-sh.uv",
      darwin: "brew install uv",
      linux: "curl -LsSf https://astral.sh/uv/install.sh | sh",
      other: "Install uv from https://docs.astral.sh/uv/",
    },
  },
  {
    binary: "gitleaks",
    domain: "db-appsec",
    required: false,
    reason: "Scans workspace and git history for leaked credentials at $0 locally.",
    hints: {
      win32: "winget install Gitleaks.Gitleaks",
      darwin: "brew install gitleaks",
      linux: "Install gitleaks from https://github.com/gitleaks/gitleaks/releases",
      other: "Install gitleaks from https://github.com/gitleaks/gitleaks",
    },
  },
  {
    binary: "semgrep",
    domain: "db-appsec",
    required: false,
    reason: "Runs static security (SAST) checks and built-in `semgrep mcp`.",
    hints: {
      win32: "uv tool install semgrep (or pipx install semgrep)",
      darwin: "brew install semgrep",
      linux: "uv tool install semgrep (or pipx install semgrep)",
      other: "Install semgrep via uv/pipx",
    },
  },
  {
    binary: "osv-scanner",
    domain: "db-appsec",
    required: false,
    reason: "Scans lockfiles for known dependency vulnerabilities via Google OSV.",
    hints: {
      win32: "winget install Google.OSVScanner (or download release binary)",
      darwin: "brew install osv-scanner",
      linux: "Install osv-scanner from https://github.com/google/osv-scanner/releases",
      other: "Install osv-scanner from https://github.com/google/osv-scanner",
    },
  },
  {
    binary: "docker",
    domain: "db-appsec",
    required: false,
    reason: "Runs isolated local PostgreSQL and container-scoped DAST environments.",
    hints: {
      win32: "winget install Docker.DockerDesktop",
      darwin: "brew install --cask docker",
      linux: "Install Docker Engine from https://docs.docker.com/engine/install/",
      other: "Install Docker",
    },
  },
];

async function checkCanonicalHealth(
  targetDir: string,
  probe: ProbeProfile,
  config?: MetaSkillConfig
): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];

  const agentsPath = path.join(targetDir, "AGENTS.md");
  if (!existsSync(agentsPath)) {
    checks.push({
      category: "canonical",
      name: "AGENTS.md",
      severity: "error",
      message: "Missing AGENTS.md in workspace root.",
      installHint: "Run `mtsk init` to scaffold canonical files.",
    });
  } else {
    const lines = await countFileLines(agentsPath);
    if (lines > 100) {
      checks.push({
        category: "canonical",
        name: "AGENTS.md budget",
        severity: "error",
        message: `AGENTS.md is ${lines} lines (exceeds 100-line anti-context-rot limit).`,
      });
    } else {
      checks.push({
        category: "canonical",
        name: "AGENTS.md",
        severity: "pass",
        message: `Present and lean (${lines}/100 lines).`,
      });
    }
  }

  const requiredFiles = [
    ["SPEC.md", "Project specification & delivery contract"],
    [".agents/skills/metaskill/SKILL.md", "Canonical MetaSkill protocol"],
  ] as const;

  for (const [relPath, label] of requiredFiles) {
    const full = path.join(targetDir, relPath);
    checks.push(
      existsSync(full)
        ? {
            category: "canonical",
            name: relPath,
            severity: "pass",
            message: `${label} present.`,
          }
        : {
            category: "canonical",
            name: relPath,
            severity: "error",
            message: `Missing ${relPath} (${label}).`,
            installHint: "Run `mtsk init` to restore canonical workspace.",
          }
    );
  }

  const statePath = path.join(targetDir, "PROJECT_STATE.md");
  if (existsSync(statePath)) {
    checks.push({
      category: "canonical",
      name: "PROJECT_STATE.md",
      severity: "pass",
      message: "Optional continuity state file present.",
    });
  }

  const gitignorePath = path.join(targetDir, ".gitignore");
  if (!existsSync(gitignorePath)) {
    checks.push({
      category: "canonical",
      name: ".gitignore",
      severity: "error",
      message: "Missing .gitignore (secrets risk).",
      installHint: "Run `mtsk init` to generate secret-safe .gitignore.",
    });
  } else {
    const content = await readFile(gitignorePath, "utf8");
    const protectsEnv = /^\.env$/m.test(content);
    checks.push(
      protectsEnv
        ? {
            category: "canonical",
            name: ".gitignore",
            severity: "pass",
            message: "Protects .env credentials from accidental commits.",
          }
        : {
            category: "canonical",
            name: ".gitignore",
            severity: "error",
            message: ".gitignore does not exclude `.env`.",
            installHint: "Run `mtsk init` or add `.env` to .gitignore.",
          }
    );
  }

  if (config) {
    for (const adapterRel of getExpectedAdapterPaths(config)) {
      const adapterFull = path.join(targetDir, adapterRel);
      checks.push(
        existsSync(adapterFull)
          ? {
              category: "adapter",
              name: adapterRel,
              severity: "pass",
              message: "IDE adapter synced.",
            }
          : {
              category: "adapter",
              name: adapterRel,
              severity: "error",
              message: `Missing IDE adapter ${adapterRel}.`,
              installHint: "Run `mtsk sync` to regenerate IDE adapters.",
            }
      );
    }

    // Read-only conflict/drift check against managed fenced blocks.
    const manifest = await loadManagedManifest(targetDir);
    const coreCheck = await syncCanonicalCore(targetDir, config, probe, {
      manifest,
      dryRun: true,
    });
    const adapterCheck = await syncAdapters(targetDir, config, {
      manifest,
      dryRun: true,
    });
    const allManagedResults = [...coreCheck.results, ...adapterCheck.results];
    const conflicts = allManagedResults.filter((r) => r.status === "conflict");
    const drifted = allManagedResults.filter(
      (r) => r.status === "updated" || r.status === "merged"
    );

    if (conflicts.length > 0) {
      checks.push({
        category: "adapter",
        name: "adapter-conflicts",
        severity: "warning",
        message: `Unresolved fenced-block conflict(s) in: ${conflicts.map((c) => c.relPath).join(", ")}.`,
        installHint: "Run `mtsk sync --check` to inspect conflicts without overwriting edits.",
      });
    } else if (drifted.length > 0) {
      checks.push({
        category: "adapter",
        name: "adapter-drift",
        severity: "warning",
        message: `Managed adapter drift detected in: ${drifted.map((d) => d.relPath).join(", ")}.`,
        installHint: "Run `mtsk sync` to refresh fenced blocks cleanly.",
      });
    }
  }

  return checks;
}

async function buildReadinessNotes(targetDir: string): Promise<string[]> {
  const notes: string[] = [
    "Doctor checks environment readiness & workspace hygiene; deliverable acceptance requires verified task QA and preview evidence.",
  ];

  const specPath = path.join(targetDir, "SPEC.md");
  if (existsSync(specPath)) {
    const specContent = await readFile(specPath, "utf8");
    if (
      specContent.includes("_To be populated during MetaSkill Phase 1") ||
      specContent.includes("_Se completará durante") ||
      specContent.includes("Define the first testable deliverable") ||
      specContent.includes("Definir la primera entrega comprobable")
    ) {
      notes.push(
        "SPEC.md still holds the starter placeholder contract: replace REQ-1 with a real check before shipping."
      );
    }
  }

  if (!existsSync(path.join(targetDir, "PROJECT_STATE.md"))) {
    notes.push(
      "PROJECT_STATE.md is optional in minimal installs (run `mtsk init --full` when multi-session state files are needed)."
    );
  }

  const evidenceReportJson = path.join(targetDir, ".agents", "evidence", "report.json");
  if (!existsSync(evidenceReportJson)) {
    notes.push("No .agents/evidence/report.json found yet (generated when checks/verification run).");
  }

  const previewDir = path.join(targetDir, "preview");
  if (!existsSync(previewDir)) {
    notes.push("preview/ directory not created (only needed for heavy local visual/media artifacts).");
  } else {
    const entries = await readdir(previewDir);
    const evidenceFiles = entries.filter((name) => name !== ".gitkeep");
    if (evidenceFiles.length === 0) {
      notes.push(
        "preview/ contains no heavy verification artifacts yet (only .gitkeep)."
      );
    }
  }

  return notes;
}

function buildHardwareAdvisories(probe: ProbeProfile, domains: string[]): string[] {
  const advisories: string[] = [];
  const strongGpu = probe.hardware.gpus.find(
    (gpu) => gpu.vendor === "nvidia" && (gpu.vramMb ?? 0) >= 6000
  );

  if (domains.includes("video-audio")) {
    if (strongGpu && probe.hardware.totalRamGb >= 12) {
      advisories.push(
        `Hardware ready (${probe.hardware.totalRamGb} GB RAM + ${strongGpu.name}, ${strongGpu.vramMb} MB VRAM): deterministic FFmpeg/NVENC and local AI transcription models are viable at $0.`
      );
    } else {
      const constraints: string[] = [];
      if (probe.hardware.totalRamGb < 15) {
        constraints.push(`${probe.hardware.totalRamGb} GB RAM`);
      }
      if (!strongGpu) {
        constraints.push("no >=6GB NVIDIA GPU");
      }
      advisories.push(
        `Hardware advisory (${constraints.join(", ")}): deterministic FFmpeg/Remotion pipelines run fast at $0 locally, while heavy local AI models (whisper large-v3, diffusion) risk slowdowns/OOM — prefer faster-whisper small or pay-per-use transcription APIs.`
      );
    }
  }

  if (!probe.project.isGitRepo) {
    advisories.push(
      "Git repository is not initialized yet: initialize Git (`git init`) before autonomous loops so 3-Strike rollback checkpoints work safely."
    );
  }

  return advisories;
}

/**
 * Evaluates canonical workspace health, configured IDE adapters, domain tool prerequisites,
 * editor capability guarantees, and hardware feasibility advisories.
 */
export async function runDoctor(
  targetDir: string,
  probe: ProbeProfile,
  config?: MetaSkillConfig,
  domainFilter?: DomainId
): Promise<DoctorReport> {
  const activeDomains = domainFilter
    ? [domainFilter]
    : config?.domains ?? ["web-fullstack", "video-audio", "db-appsec"];

  const checks: DoctorCheck[] = await checkCanonicalHealth(targetDir, probe, config);
  const relevantDomains = new Set<string>(["core", ...activeDomains]);

  for (const req of BINARY_REQUIREMENTS) {
    if (!relevantDomains.has(req.domain)) {
      continue;
    }
    const status = probe.binaries[req.binary];
    if (status?.available) {
      checks.push({
        category: "dependency",
        name: `${req.binary} (${req.domain})`,
        severity: "pass",
        message: status.version ? `Installed (${status.version})` : "Installed",
      });
    } else {
      checks.push({
        category: "dependency",
        name: `${req.binary} (${req.domain})`,
        severity: req.required ? "error" : "warning",
        message: `${req.required ? "Missing required" : "Missing optional"} CLI — ${req.reason}`,
        installHint: req.hints[probe.os.platform],
      });
    }
  }

  const advisories = buildHardwareAdvisories(probe, activeDomains);
  const readinessNotes = await buildReadinessNotes(targetDir);
  const editorCapabilities = config
    ? getEditorCapabilities(config.agents)
    : getEditorCapabilities(probe.agentsDetected);

  const hasErrors = checks.some((c) => c.severity === "error");
  const hasWarnings = checks.some((c) => c.severity === "warning");

  return {
    reportScope: "environment-readiness",
    status: hasErrors ? "errors" : hasWarnings ? "warnings" : "healthy",
    checks,
    advisories,
    readinessNotes,
    editorCapabilities,
  };
}
