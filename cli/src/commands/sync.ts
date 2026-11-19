import { existsSync } from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { syncCanonicalCore } from "../adapters/canonical.js";
import { syncAdapters } from "../adapters/targets.js";
import { runProbe } from "../probes/index.js";
import {
  AutonomyModeSchema,
  LanguageSchema,
  MetaSkillConfigSchema,
  PermissionModeSchema,
  PersonaSchema,
} from "../schemas/config.js";
import { loadManagedManifest, saveManagedManifest } from "../utils/fs.js";
import { loadConfigIfPresent, parseAgentsCsv, parseDomainsCsv } from "./helpers.js";

export interface SyncCommandOptions {
  dir?: string;
  agents?: string;
  domains?: string;
  persona?: string;
  lang?: string;
  autonomy?: string;
  permissions?: string;
  check?: boolean;
  force?: boolean;
}

/** Runs `mtsk sync` to refresh canonical MetaSkill files and regenerate thin IDE adapters idempotently. */
export async function syncCommand(options: SyncCommandOptions): Promise<void> {
  const targetDir = path.resolve(options.dir ?? process.cwd());
  const existingConfig = await loadConfigIfPresent(targetDir);

  if (!existingConfig) {
    throw new Error(
      `No MetaSkill configuration found at ${path.join(targetDir, ".agents", "metaskill.config.json")}. Run 'mtsk init' first.`
    );
  }

  const isCheck = Boolean(options.check);
  const force = Boolean(options.force);

  const hasOverrides = Boolean(
    options.agents ||
      options.domains ||
      options.persona ||
      options.lang ||
      options.autonomy ||
      options.permissions
  );

  const nextConfig = MetaSkillConfigSchema.parse({
    ...existingConfig,
    persona: options.persona ? PersonaSchema.parse(options.persona) : existingConfig.persona,
    language: options.lang ? LanguageSchema.parse(options.lang) : existingConfig.language,
    domains: options.domains ? parseDomainsCsv(options.domains) : existingConfig.domains,
    agents: options.agents ? parseAgentsCsv(options.agents) : existingConfig.agents,
    autonomyMode: options.autonomy
      ? AutonomyModeSchema.parse(options.autonomy)
      : existingConfig.autonomyMode,
    permissionMode: options.permissions
      ? PermissionModeSchema.parse(options.permissions)
      : existingConfig.permissionMode,
    updatedAt: hasOverrides ? new Date().toISOString() : existingConfig.updatedAt,
  });

  const probe = await runProbe(targetDir);
  const manifest = await loadManagedManifest(targetDir);

  const coreSync = await syncCanonicalCore(targetDir, nextConfig, probe, {
    manifest,
    force,
    dryRun: isCheck,
  });
  const adapterReport = await syncAdapters(targetDir, nextConfig, {
    manifest,
    force,
    dryRun: isCheck,
  });

  if (!isCheck) {
    await saveManagedManifest(targetDir, manifest);
  }

  const allResults = [...coreSync.results, ...adapterReport.results];
  const conflicts = allResults.filter((r) => r.status === "conflict");
  const changed = allResults.filter(
    (r) => r.status === "created" || r.status === "updated" || r.status === "merged"
  );

  if (isCheck) {
    const missingCanonicalSkill = !existsSync(
      path.join(targetDir, ".agents", "skills", "metaskill", "SKILL.md")
    );
    if (conflicts.length === 0 && changed.length === 0 && !missingCanonicalSkill) {
      console.log(
        pc.green("MetaSkill check passed: all adapters and canonical blocks are synchronized.")
      );
      return;
    }

    if (missingCanonicalSkill) {
      console.error(pc.yellow("Missing canonical .agents/skills/metaskill/SKILL.md."));
    }
    for (const item of changed) {
      console.error(pc.yellow(`  [DRIFT:${item.status}] ${item.relPath}`));
    }
    for (const conflict of conflicts) {
      console.error(
        pc.red(`  [CONFLICT] ${conflict.relPath}: ${conflict.reason ?? "Modified manually"}`)
      );
    }
    process.exitCode = 1;
    return;
  }

  if (conflicts.length > 0) {
    console.error(
      pc.yellow("MetaSkill sync completed with conflicts (manual edits preserved untouched):")
    );
    for (const conflict of conflicts) {
      console.error(
        pc.red(`  - ${conflict.relPath}: ${conflict.reason ?? "Modified manually"}`)
      );
    }
    console.log(`  Agents : ${nextConfig.agents.join(", ")}`);
    console.log(`  Files  : ${adapterReport.files.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  console.log(pc.green("MetaSkill adapters synchronized."));
  console.log(`  Agents : ${nextConfig.agents.join(", ")}`);
  console.log(`  Files  : ${adapterReport.files.join(", ")}`);
  if (changed.length > 0) {
    console.log(
      `  Changes: ${changed.map((c) => `${c.relPath} (${c.status})`).join(", ")}`
    );
  }
}
