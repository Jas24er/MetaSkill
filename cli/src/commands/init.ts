import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { installCanonical } from "../adapters/canonical.js";
import { syncAdapters } from "../adapters/targets.js";
import { runExecFile } from "../probes/exec.js";
import { runProbe } from "../probes/index.js";
import {
  AutonomyModeSchema,
  LanguageSchema,
  MetaSkillConfigSchema,
  PermissionModeSchema,
  PersonaSchema,
  type AutonomyMode,
  type DomainId,
  type GlobalPreferences,
  type LanguagePreference,
  type MetaSkillConfig,
  type PermissionMode,
  type Persona,
} from "../schemas/config.js";
import type { AgentId, ProbeProfile } from "../schemas/probe.js";
import { loadManagedManifest, saveManagedManifest } from "../utils/fs.js";
import { buildKickoffPrompt, getCliCopy, resolveUiLanguage } from "../utils/i18n.js";
import { loadGlobalPreferences, saveGlobalPreferences } from "../utils/preferences.js";
import { loadConfigIfPresent, parseAgentsCsv, parseDomainsCsv } from "./helpers.js";

export interface InitCommandOptions {
  dir?: string;
  persona?: string;
  domains?: string;
  agents?: string;
  autonomy?: string;
  permissions?: string;
  lang?: string;
  yes?: boolean;
  git?: boolean;
  dryRun?: boolean;
  force?: boolean;
  saveGlobal?: boolean;
}

function abortIfCancelled<T>(value: T | symbol, cancelMsg: string): T {
  if (p.isCancel(value)) {
    p.cancel(cancelMsg);
    process.exit(0);
  }
  return value;
}

function resolveProjectMode(
  probe: ProbeProfile,
  existingConfig?: MetaSkillConfig
): "greenfield" | "brownfield" {
  if (existingConfig?.projectMode === "brownfield" || probe.project.mode === "brownfield") {
    return "brownfield";
  }
  return "greenfield";
}

async function resolveInteractiveConfig(
  probe: ProbeProfile,
  options: InitCommandOptions,
  existingConfig?: MetaSkillConfig,
  globalPrefs?: GlobalPreferences
): Promise<{ config: MetaSkillConfig; initGit: boolean; saveGlobal: boolean }> {
  p.intro(pc.bgCyan(pc.black(" MetaSkill — Universal AI Project Architect ")));

  const defaultLang: LanguagePreference =
    existingConfig?.language ?? globalPrefs?.language ?? "auto";

  const language = options.lang
    ? LanguageSchema.parse(options.lang)
    : abortIfCancelled(
        await p.select<LanguagePreference>({
          message: "Choose language / Elige tu idioma:",
          initialValue: defaultLang,
          options: [
            { value: "auto", label: "Auto (match conversation language / según tu mensaje)" },
            { value: "en", label: "English" },
            { value: "es", label: "Español" },
          ],
        }),
        "MetaSkill setup cancelled."
      );

  const locale = resolveUiLanguage(language);
  const copy = getCliCopy(locale);
  const effectiveProjectMode = resolveProjectMode(probe, existingConfig);

  p.note(
    `${copy.modeLabel}: ${effectiveProjectMode.toUpperCase()} | ${copy.osLabel}: ${probe.os.platform} | ${copy.ramLabel}: ${probe.hardware.totalRamGb} GB | ${copy.gitLabel}: ${probe.project.isGitRepo ? copy.yes : copy.no}`,
    copy.detectedEnvTitle
  );

  const defaultPersona: Persona =
    existingConfig?.persona ?? globalPrefs?.persona ?? "vibecoder";

  const persona = options.persona
    ? PersonaSchema.parse(options.persona)
    : abortIfCancelled(
        await p.select<Persona>({
          message: copy.personaMessage,
          initialValue: defaultPersona,
          options: [
            {
              value: "vibecoder",
              label: copy.personaOptions.vibecoder.label,
              hint: copy.personaOptions.vibecoder.hint,
            },
            {
              value: "dev",
              label: copy.personaOptions.dev.label,
              hint: copy.personaOptions.dev.hint,
            },
          ],
        }),
        copy.cancelled
      );

  const defaultDomains: DomainId[] =
    existingConfig?.domains ?? globalPrefs?.domains ?? ["web-fullstack"];

  const domains = options.domains
    ? parseDomainsCsv(options.domains)
    : abortIfCancelled(
        await p.multiselect<DomainId>({
          message: copy.domainsMessage[persona],
          initialValues: defaultDomains,
          required: true,
          options: [
            { value: "web-fullstack", label: copy.domainOptions["web-fullstack"][persona] },
            { value: "video-audio", label: copy.domainOptions["video-audio"][persona] },
            { value: "db-appsec", label: copy.domainOptions["db-appsec"][persona] },
            { value: "custom", label: copy.domainOptions.custom[persona] },
          ],
        }),
        copy.cancelled
      );

  const detectedDefaults: AgentId[] =
    existingConfig?.agents ??
    globalPrefs?.agents ??
    (probe.agentsDetected.length > 0 ? probe.agentsDetected : ["claude-code", "cursor"]);

  const agents = options.agents
    ? parseAgentsCsv(options.agents)
    : abortIfCancelled(
        await p.multiselect<AgentId>({
          message: copy.agentsMessage[persona],
          initialValues: detectedDefaults,
          required: true,
          options: [
            { value: "claude-code", label: copy.agentLabels["claude-code"] },
            { value: "cursor", label: copy.agentLabels.cursor },
            { value: "antigravity", label: copy.agentLabels.antigravity },
            { value: "windsurf", label: copy.agentLabels.windsurf },
            { value: "codex", label: copy.agentLabels.codex },
            { value: "cline", label: copy.agentLabels.cline },
          ],
        }),
        copy.cancelled
      );

  const defaultAutonomy: AutonomyMode =
    existingConfig?.autonomyMode ?? globalPrefs?.autonomyMode ?? "guided";

  const autonomyMode = options.autonomy
    ? AutonomyModeSchema.parse(options.autonomy)
    : abortIfCancelled(
        await p.select<AutonomyMode>({
          message: copy.autonomyMessage[persona],
          initialValue: defaultAutonomy,
          options: [
            { value: "guided", label: copy.autonomyOptions.guided[persona] },
            { value: "autonomous-long", label: copy.autonomyOptions["autonomous-long"][persona] },
          ],
        }),
        copy.cancelled
      );

  const defaultPermission: PermissionMode =
    existingConfig?.permissionMode ?? globalPrefs?.permissionMode ?? "read-only";

  const permissionMode = options.permissions
    ? PermissionModeSchema.parse(options.permissions)
    : abortIfCancelled(
        await p.select<PermissionMode>({
          message: copy.permissionMessage[persona],
          initialValue: defaultPermission,
          options: [
            { value: "read-only", label: copy.permissionOptions["read-only"][persona] },
            { value: "scoped-write", label: copy.permissionOptions["scoped-write"][persona] },
            {
              value: "autonomous-green",
              label: copy.permissionOptions["autonomous-green"][persona],
            },
          ],
        }),
        copy.cancelled
      );

  let initGit = false;
  if (
    persona === "vibecoder" &&
    !probe.project.isGitRepo &&
    probe.binaries.git?.available &&
    options.git !== false &&
    !options.dryRun
  ) {
    initGit = abortIfCancelled(
      await p.confirm({
        message: copy.gitInitMessage,
        initialValue: true,
      }),
      copy.cancelled
    );
  }

  let saveGlobal = Boolean(options.saveGlobal);
  if (!options.saveGlobal && !options.dryRun) {
    saveGlobal = abortIfCancelled(
      await p.confirm({
        message: copy.saveGlobalMessage,
        initialValue: false,
      }),
      copy.cancelled
    );
  }

  const now = new Date().toISOString();
  const config = MetaSkillConfigSchema.parse({
    schemaVersion: "1.0.0",
    persona,
    language,
    domains,
    agents,
    autonomyMode,
    permissionMode,
    projectMode: effectiveProjectMode,
    createdAt: existingConfig?.createdAt ?? now,
    updatedAt: now,
  });

  return { config, initGit, saveGlobal };
}

function resolveNonInteractiveConfig(
  probe: ProbeProfile,
  options: InitCommandOptions,
  existingConfig?: MetaSkillConfig,
  globalPrefs?: GlobalPreferences
): { config: MetaSkillConfig; initGit: boolean; saveGlobal: boolean } {
  const persona = options.persona
    ? PersonaSchema.parse(options.persona)
    : existingConfig?.persona ?? globalPrefs?.persona ?? "vibecoder";

  const language = options.lang
    ? LanguageSchema.parse(options.lang)
    : existingConfig?.language ?? globalPrefs?.language ?? "auto";

  const domains = options.domains
    ? parseDomainsCsv(options.domains)
    : existingConfig?.domains ?? globalPrefs?.domains ?? (["web-fullstack"] as DomainId[]);

  const agents = options.agents
    ? parseAgentsCsv(options.agents)
    : existingConfig?.agents ??
      globalPrefs?.agents ??
      (probe.agentsDetected.length > 0
        ? probe.agentsDetected
        : (["claude-code", "cursor", "antigravity"] as AgentId[]));

  const autonomyMode = options.autonomy
    ? AutonomyModeSchema.parse(options.autonomy)
    : existingConfig?.autonomyMode ?? globalPrefs?.autonomyMode ?? "guided";

  const permissionMode = options.permissions
    ? PermissionModeSchema.parse(options.permissions)
    : existingConfig?.permissionMode ?? globalPrefs?.permissionMode ?? "read-only";

  const initGit =
    persona === "vibecoder" &&
    !probe.project.isGitRepo &&
    Boolean(probe.binaries.git?.available) &&
    options.git !== false &&
    !options.dryRun;

  const now = new Date().toISOString();
  const config = MetaSkillConfigSchema.parse({
    schemaVersion: "1.0.0",
    persona,
    language,
    domains,
    agents,
    autonomyMode,
    permissionMode,
    projectMode: resolveProjectMode(probe, existingConfig),
    createdAt: existingConfig?.createdAt ?? now,
    updatedAt: now,
  });

  return { config, initGit, saveGlobal: Boolean(options.saveGlobal) };
}

/** Runs `mtsk init` to probe the environment, install canonical MetaSkill files, and sync IDE adapters. */
export async function initCommand(options: InitCommandOptions): Promise<void> {
  const targetDir = path.resolve(options.dir ?? process.cwd());
  const dryRun = Boolean(options.dryRun);
  const force = Boolean(options.force);

  let [probe, existingConfig, globalPrefs] = await Promise.all([
    runProbe(targetDir),
    loadConfigIfPresent(targetDir),
    loadGlobalPreferences(),
  ]);

  const isInteractive = !options.yes && Boolean(process.stdin.isTTY);
  const { config, initGit, saveGlobal } = isInteractive
    ? await resolveInteractiveConfig(probe, options, existingConfig, globalPrefs)
    : resolveNonInteractiveConfig(probe, options, existingConfig, globalPrefs);

  if (initGit && !dryRun) {
    const gitInit = await runExecFile("git", ["init"], 5000, targetDir);
    if (gitInit.ok) {
      probe = await runProbe(targetDir);
    }
  }

  const manifest = await loadManagedManifest(targetDir);
  const canonicalResult = await installCanonical(targetDir, config, probe, {
    manifest,
    force,
    dryRun,
  });
  const adapterReport = await syncAdapters(targetDir, config, {
    manifest,
    force,
    dryRun,
  });

  if (!dryRun) {
    await saveManagedManifest(targetDir, manifest);
  }

  let savedGlobalPath: string | undefined;
  if (saveGlobal && !dryRun) {
    const saved = await saveGlobalPreferences({
      persona: config.persona,
      language: config.language,
      domains: config.domains,
      agents: config.agents,
      autonomyMode: config.autonomyMode,
      permissionMode: config.permissionMode,
    });
    savedGlobalPath = saved.path;
  }

  const allConflicts = [...canonicalResult.conflicts, ...adapterReport.conflicts];
  const mergedFiles = [...canonicalResult.results, ...adapterReport.results]
    .filter((r) => r.status === "merged")
    .map((r) => r.relPath);

  const locale = resolveUiLanguage(config.language);
  const copy = getCliCopy(locale);
  const kickoffPrompt = buildKickoffPrompt(config);

  if (isInteractive) {
    const summaryLines = [
      `${copy.updatedLabel.padEnd(16)}: ${canonicalResult.updated.join(", ") || "-"}`,
      `${copy.createdLabel.padEnd(16)}: ${canonicalResult.created.join(", ") || "-"}`,
      `${copy.preservedLabel.padEnd(16)}: ${canonicalResult.preserved.join(", ") || "-"}`,
      `${copy.mergedLabel.padEnd(16)}: ${mergedFiles.join(", ") || "-"}`,
      `${copy.adaptersLabel.padEnd(16)}: ${adapterReport.files.join(", ")}`,
    ];
    if (allConflicts.length > 0) {
      summaryLines.push(
        `${copy.conflictsLabel.padEnd(16)}: ${allConflicts.map((c) => c.relPath).join(", ")}`
      );
    }
    if (savedGlobalPath) {
      summaryLines.push(`${copy.globalPrefsSavedLabel.padEnd(16)}: ${savedGlobalPath}`);
    }

    p.note(summaryLines.join("\n"), dryRun ? copy.dryRunTitle : copy.summaryTitle);

    if (allConflicts.length > 0) {
      p.log.warn(copy.conflictWarning);
      for (const conflict of allConflicts) {
        p.log.warn(`  - ${conflict.relPath}: ${conflict.reason ?? "Conflict"}`);
      }
      process.exitCode = 1;
    }

    p.note(kickoffPrompt, copy.kickoffTitle);
    p.outro(pc.green(dryRun ? copy.outroDryRun : copy.outro));
    return;
  }

  console.log(pc.bold(dryRun ? copy.dryRunTitle : copy.summaryTitle));
  console.log(`  Directory   : ${targetDir}`);
  console.log(`  Persona     : ${config.persona} (${config.projectMode})`);
  console.log(`  Language    : ${config.language}`);
  console.log(`  Rhythm      : ${config.autonomyMode}`);
  console.log(`  Permissions : ${config.permissionMode}`);
  console.log(`  Domains     : ${config.domains.join(", ")}`);
  console.log(`  Adapters    : ${adapterReport.files.join(", ")}`);
  if (canonicalResult.preserved.length > 0) {
    console.log(`  Preserved   : ${canonicalResult.preserved.join(", ")}`);
  }
  if (mergedFiles.length > 0) {
    console.log(`  Merged      : ${mergedFiles.join(", ")}`);
  }
  if (savedGlobalPath) {
    console.log(`  GlobalPrefs : ${savedGlobalPath}`);
  }
  if (allConflicts.length > 0) {
    console.error(pc.yellow(`\n${copy.conflictsLabel} (${allConflicts.length}):`));
    for (const conflict of allConflicts) {
      console.error(pc.yellow(`  - ${conflict.relPath}: ${conflict.reason ?? "Conflict"}`));
    }
    process.exitCode = 1;
  }
  console.log("\n--- Kickoff Prompt ---\n" + kickoffPrompt);
}
