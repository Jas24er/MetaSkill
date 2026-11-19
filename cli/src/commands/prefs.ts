import pc from "picocolors";
import {
  AutonomyModeSchema,
  LanguageSchema,
  PermissionModeSchema,
  PersonaSchema,
} from "../schemas/config.js";
import {
  clearGlobalPreferences,
  getGlobalPreferencesPath,
  loadGlobalPreferences,
  saveGlobalPreferences,
} from "../utils/preferences.js";
import { parseAgentsCsv, parseDomainsCsv } from "./helpers.js";

export interface PrefsShowOptions {
  json?: boolean;
}

export interface PrefsSetOptions {
  persona?: string;
  lang?: string;
  domains?: string;
  agents?: string;
  autonomy?: string;
  permissions?: string;
}

/** Shows saved opt-in global MetaSkill defaults without modifying disk. */
export async function prefsShowCommand(options: PrefsShowOptions): Promise<void> {
  const prefsPath = getGlobalPreferencesPath();
  const prefs = await loadGlobalPreferences();

  if (options.json) {
    console.log(JSON.stringify({ path: prefsPath, preferences: prefs ?? null }, null, 2));
    return;
  }

  console.log(pc.bold("MetaSkill Global Preferences"));
  console.log(`  Location : ${prefsPath}`);
  if (!prefs) {
    console.log("  Status   : No global preferences saved (projects use local/default settings).");
    return;
  }

  console.log(`  Persona     : ${prefs.persona ?? "(unset)"}`);
  console.log(`  Language    : ${prefs.language ?? "(unset)"}`);
  console.log(`  Autonomy    : ${prefs.autonomyMode ?? "(unset)"}`);
  console.log(`  Permissions : ${prefs.permissionMode ?? "(unset)"}`);
  console.log(`  Domains     : ${prefs.domains?.join(", ") ?? "(unset)"}`);
  console.log(`  Agents      : ${prefs.agents?.join(", ") ?? "(unset)"}`);
  console.log(`  Updated     : ${prefs.updatedAt}`);
}

/** Saves explicit global default preferences for future `mtsk init` invocations. */
export async function prefsSetCommand(options: PrefsSetOptions): Promise<void> {
  const hasAny = Boolean(
    options.persona ||
      options.lang ||
      options.domains ||
      options.agents ||
      options.autonomy ||
      options.permissions
  );

  if (!hasAny) {
    throw new Error(
      "Specify at least one preference flag (--persona, --lang, --domains, --agents, --autonomy, --permissions)."
    );
  }

  const { path: prefsPath, preferences } = await saveGlobalPreferences({
    ...(options.persona ? { persona: PersonaSchema.parse(options.persona) } : {}),
    ...(options.lang ? { language: LanguageSchema.parse(options.lang) } : {}),
    ...(options.domains ? { domains: parseDomainsCsv(options.domains) } : {}),
    ...(options.agents ? { agents: parseAgentsCsv(options.agents) } : {}),
    ...(options.autonomy ? { autonomyMode: AutonomyModeSchema.parse(options.autonomy) } : {}),
    ...(options.permissions
      ? { permissionMode: PermissionModeSchema.parse(options.permissions) }
      : {}),
  });

  console.log(pc.green("MetaSkill global preferences saved."));
  console.log(`  Location : ${prefsPath}`);
  console.log(JSON.stringify(preferences, null, 2));
}

/** Removes saved global preferences if present. */
export async function prefsClearCommand(): Promise<void> {
  const prefsPath = getGlobalPreferencesPath();
  const removed = await clearGlobalPreferences();
  if (removed) {
    console.log(pc.green(`Cleared global preferences at ${prefsPath}.`));
    return;
  }
  console.log(`No global preferences file found at ${prefsPath}.`);
}
