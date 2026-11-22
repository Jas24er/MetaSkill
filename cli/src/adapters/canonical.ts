import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { MetaSkillConfig } from "../schemas/config.js";
import type { ProbeProfile } from "../schemas/probe.js";
import {
  listFilesRecursive,
  loadManagedManifest,
  saveManagedManifest,
  syncManagedFencedFile,
  syncManagedWholeFile,
  WHOLE_FILE_MARKER,
  writeIfAbsent,
  writeTextFile,
  type FencedSyncResult,
  type ManagedManifest,
} from "../utils/fs.js";
import { getCliCopy, resolveUiLanguage } from "../utils/i18n.js";
import { getPackageRoot } from "../utils/paths.js";

export interface CanonicalSyncOptions {
  manifest?: ManagedManifest;
  force?: boolean;
  dryRun?: boolean;
  full?: boolean;
}

export interface CanonicalSyncResult {
  updated: string[];
  results: FencedSyncResult[];
  conflicts: FencedSyncResult[];
}

export interface CanonicalInstallResult {
  created: string[];
  updated: string[];
  preserved: string[];
  results: FencedSyncResult[];
  conflicts: FencedSyncResult[];
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

export function formatOsSummary(probe: ProbeProfile): string {
  return `${probe.os.platform} (${probe.os.arch}, ${probe.os.release})`;
}

export function formatHardwareSummary(probe: ProbeProfile): string {
  const primaryGpu = probe.hardware.gpus[0];
  const gpuText = primaryGpu
    ? `${primaryGpu.name}${primaryGpu.vramMb !== null ? ` (${primaryGpu.vramMb} MB VRAM)` : ""}`
    : "No discrete GPU detected";
  return `${probe.hardware.cpuCores} cores, ${probe.hardware.totalRamGb} GB RAM, ${gpuText}`;
}

async function buildSpecialistRoutingRows(targetDir: string, config: MetaSkillConfig): Promise<string> {
  const rows: string[] = [];
  const playbookMap: Record<string, string> = {
    "web-fullstack": ".agents/skills/metaskill/playbooks/web-fullstack.md",
    "video-audio": ".agents/skills/metaskill/playbooks/video-audio-multimodal.md",
    "db-appsec": ".agents/skills/metaskill/playbooks/db-appsec-defensive.md",
  };

  for (const domain of config.domains) {
    const playbookPath = playbookMap[domain];
    if (playbookPath) {
      rows.push(`| Domain playbook (\`${domain}\`) | \`${playbookPath}\` |`);
    }
  }

  const skillsRoot = path.join(targetDir, ".agents", "skills");
  if (existsSync(skillsRoot)) {
    const entries = await readdir(skillsRoot, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory() || entry.name === "metaskill" || entry.name.startsWith("metaskill-")) {
        continue;
      }
      const skillFile = path.join(skillsRoot, entry.name, "SKILL.md");
      if (existsSync(skillFile)) {
        rows.push(
          `| Specialist skill (\`${entry.name}\`) | \`.agents/skills/${entry.name}/SKILL.md\` |`
        );
      }
    }
  }

  return rows.join("\n");
}

function buildTemplateVars(
  config: MetaSkillConfig,
  probe: ProbeProfile,
  specialistRouting: string
): Record<string, string> {
  return {
    PERSONA: config.persona,
    LANGUAGE: config.language,
    PROJECT_MODE: config.projectMode,
    AUTONOMY_MODE: config.autonomyMode,
    PERMISSION_MODE: config.permissionMode,
    DOMAINS: config.domains.join(", "),
    OS_SUMMARY: formatOsSummary(probe),
    HARDWARE_SUMMARY: formatHardwareSummary(probe),
    CREATED_AT: config.createdAt,
    SPECIALIST_ROUTING: specialistRouting,
  };
}

const SKILL_DEST_REL = ".agents/skills/metaskill";
const VENDORED_SKILL_DIRS = ["core", "playbooks", "radar"] as const;

/**
 * Syncs the bundled skill files into `.agents/skills/metaskill/`, replacing only files
 * that still match the version MetaSkill last wrote. Installs from before file tracking
 * (no whole-file records in the manifest) are adopted once, as earlier versions always
 * overwrote these files.
 */
async function syncVendoredSkill(
  targetDir: string,
  pkgRoot: string,
  manifest: ManagedManifest,
  force: boolean,
  dryRun: boolean
): Promise<FencedSyncResult[]> {
  const sources = ["SKILL.md"];
  for (const dir of VENDORED_SKILL_DIRS) {
    const dirFull = path.join(pkgRoot, dir);
    if (!existsSync(dirFull)) continue;
    const files = (await listFilesRecursive(dirFull)).filter(
      (file) => !file.startsWith("archive/") && !file.includes("/archive/")
    );
    sources.push(...files.map((file) => `${dir}/${file}`));
  }
  const adoptUntracked = !Object.values(manifest.blocks).some(
    (block) => block.markerId === WHOLE_FILE_MARKER
  );
  const results: FencedSyncResult[] = [];
  for (const source of sources) {
    results.push(
      await syncManagedWholeFile({
        targetDir,
        relPath: `${SKILL_DEST_REL}/${source}`,
        content: await readFile(path.join(pkgRoot, source), "utf8"),
        manifest,
        force,
        dryRun,
        adoptUntracked,
      })
    );
  }
  return results;
}

/**
 * Copies the bundled MetaSkill brain into `.agents/skills/metaskill/` and syncs
 * the canonical `<100` line `AGENTS.md` router alongside `probe-profile.json` and `metaskill.config.json`.
 */
export async function syncCanonicalCore(
  targetDir: string,
  config: MetaSkillConfig,
  probe: ProbeProfile,
  options: CanonicalSyncOptions = {}
): Promise<CanonicalSyncResult> {
  const pkgRoot = getPackageRoot();
  const ownsManifest = !options.manifest;
  const manifest = options.manifest ?? (await loadManagedManifest(targetDir));
  const force = Boolean(options.force);
  const dryRun = Boolean(options.dryRun);

  const updated: string[] = [];

  const skillResults = await syncVendoredSkill(targetDir, pkgRoot, manifest, force, dryRun);
  if (skillResults.some((r) => r.status === "created" || r.status === "updated")) {
    updated.push(".agents/skills/metaskill/");
  }

  const writeProbe =
    Boolean(options.full) || existsSync(path.join(targetDir, ".agents", "probe-profile.json"));

  if (!dryRun) {
    if (writeProbe) {
      await writeTextFile(
        path.join(targetDir, ".agents", "probe-profile.json"),
        `${JSON.stringify(probe, null, 2)}\n`
      );
    }
    await writeTextFile(
      path.join(targetDir, ".agents", "metaskill.config.json"),
      `${JSON.stringify(config, null, 2)}\n`
    );
  }
  if (writeProbe) {
    updated.push(".agents/probe-profile.json");
  }
  updated.push(".agents/metaskill.config.json");

  const agentsTmpl = await readFile(path.join(pkgRoot, "templates", "AGENTS.md.tmpl"), "utf8");
  const specialistRouting = await buildSpecialistRoutingRows(targetDir, config);
  const renderedAgents = renderTemplate(
    agentsTmpl,
    buildTemplateVars(config, probe, specialistRouting)
  );

  const agentsResult = await syncManagedFencedFile({
    targetDir,
    relPath: "AGENTS.md",
    markerId: "CORE",
    style: "html",
    blockContent: renderedAgents,
    manifest,
    force,
    dryRun,
  });

  if (agentsResult.status !== "conflict" && agentsResult.status !== "unchanged") {
    updated.push("AGENTS.md");
  }

  if (ownsManifest && !dryRun) {
    await saveManagedManifest(targetDir, manifest);
  }

  const results = [...skillResults, agentsResult];
  return {
    updated,
    results,
    conflicts: results.filter((r) => r.status === "conflict"),
  };
}

/**
 * Installs the full canonical MetaSkill structure into `targetDir` non-destructively.
 * Existing `SPEC.md`, `PROJECT_STATE.md`, and user `.gitignore` rules are preserved.
 */
export async function installCanonical(
  targetDir: string,
  config: MetaSkillConfig,
  probe: ProbeProfile,
  options: CanonicalSyncOptions = {}
): Promise<CanonicalInstallResult> {
  const pkgRoot = getPackageRoot();
  const ownsManifest = !options.manifest;
  const manifest = options.manifest ?? (await loadManagedManifest(targetDir));
  const force = Boolean(options.force);
  const dryRun = Boolean(options.dryRun);
  const full = Boolean(options.full);

  const coreSync = await syncCanonicalCore(targetDir, config, probe, {
    manifest,
    force,
    dryRun,
    full,
  });

  const created: string[] = [];
  const preserved: string[] = [];
  const updated = [...coreSync.updated];
  const results = [...coreSync.results];

  const locale = resolveUiLanguage(config.language);
  const copy = getCliCopy(locale);
  const vars = buildTemplateVars(config, probe, "");

  const specTmplName =
    locale === "es" && existsSync(path.join(pkgRoot, "templates", "SPEC.es.md.tmpl"))
      ? "SPEC.es.md.tmpl"
      : "SPEC.md.tmpl";
  const specTmpl = await readFile(path.join(pkgRoot, "templates", specTmplName), "utf8");

  const applyWriteIfAbsent = async (relPath: string, content: string, trackPreserved: boolean) => {
    const fullPath = path.join(targetDir, relPath);
    if (dryRun) {
      if (existsSync(fullPath)) {
        if (trackPreserved) {
          preserved.push(relPath);
        }
      } else {
        created.push(relPath);
      }
      return;
    }
    const wasCreated = await writeIfAbsent(fullPath, content);
    if (wasCreated) {
      created.push(relPath);
    } else if (trackPreserved) {
      preserved.push(relPath);
    }
  };

  await applyWriteIfAbsent("SPEC.md", renderTemplate(specTmpl, vars), true);
  if (full) {
    const stateTmplName =
      locale === "es" && existsSync(path.join(pkgRoot, "templates", "PROJECT_STATE.es.md.tmpl"))
        ? "PROJECT_STATE.es.md.tmpl"
        : "PROJECT_STATE.md.tmpl";
    const stateTmpl = await readFile(path.join(pkgRoot, "templates", stateTmplName), "utf8");
    await applyWriteIfAbsent("PROJECT_STATE.md", renderTemplate(stateTmpl, vars), true);
    await applyWriteIfAbsent("inputs/README.txt", copy.inputsReadme, true);
    await applyWriteIfAbsent("preview/.gitkeep", "", false);
  }

  const gitignoreRes = await syncManagedFencedFile({
    targetDir,
    relPath: ".gitignore",
    markerId: "SECURITY",
    style: "hash",
    // probe-profile.json holds absolute local paths and hardware details: keep it machine-local.
    blockContent: [
      ".env",
      ".env.*",
      "!.env.example",
      "preview/",
      "build/",
      "output/",
      ".agents/probe-profile.json",
    ].join("\n"),
    manifest,
    force,
    dryRun,
  });
  results.push(gitignoreRes);
  if (gitignoreRes.status !== "conflict" && gitignoreRes.status !== "unchanged") {
    updated.push(".gitignore");
  }

  if (ownsManifest && !dryRun) {
    await saveManagedManifest(targetDir, manifest);
  }

  const conflicts = results.filter((r) => r.status === "conflict");
  return {
    created,
    updated,
    preserved,
    results,
    conflicts,
  };
}
