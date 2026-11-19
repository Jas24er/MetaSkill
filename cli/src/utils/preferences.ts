import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  GlobalPreferencesSchema,
  type GlobalPreferences,
} from "../schemas/config.js";
import { writeTextFile } from "./fs.js";

/** Returns the directory used to store optional global MetaSkill preferences. */
export function getGlobalPreferencesDir(): string {
  const override = process.env.MTSK_CONFIG_DIR?.trim();
  if (override && override.length > 0) {
    return path.resolve(override);
  }
  return path.join(os.homedir(), ".mtsk");
}

/** Returns the full path to the global preferences JSON file. */
export function getGlobalPreferencesPath(): string {
  return path.join(getGlobalPreferencesDir(), "preferences.json");
}

/** Loads and validates global preferences if present; returns `undefined` otherwise. */
export async function loadGlobalPreferences(): Promise<GlobalPreferences | undefined> {
  const prefsPath = getGlobalPreferencesPath();
  if (!existsSync(prefsPath)) {
    return undefined;
  }
  const raw = await readFile(prefsPath, "utf8");
  return GlobalPreferencesSchema.parse(JSON.parse(raw));
}

export type GlobalPreferenceInput = Omit<GlobalPreferences, "schemaVersion" | "updatedAt">;

/** Saves global preferences non-destructively (merging with any existing saved fields). */
export async function saveGlobalPreferences(
  updates: GlobalPreferenceInput
): Promise<{ path: string; preferences: GlobalPreferences }> {
  const existing = await loadGlobalPreferences();
  const merged = GlobalPreferencesSchema.parse({
    schemaVersion: "1.0.0",
    ...(existing?.persona ? { persona: existing.persona } : {}),
    ...(existing?.language ? { language: existing.language } : {}),
    ...(existing?.domains ? { domains: existing.domains } : {}),
    ...(existing?.agents ? { agents: existing.agents } : {}),
    ...(existing?.autonomyMode ? { autonomyMode: existing.autonomyMode } : {}),
    ...(existing?.permissionMode ? { permissionMode: existing.permissionMode } : {}),
    ...Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    ),
    updatedAt: new Date().toISOString(),
  });

  const prefsPath = getGlobalPreferencesPath();
  await writeTextFile(prefsPath, `${JSON.stringify(merged, null, 2)}\n`);
  return { path: prefsPath, preferences: merged };
}

/** Deletes saved global preferences if present; returns `true` when a file was removed. */
export async function clearGlobalPreferences(): Promise<boolean> {
  const prefsPath = getGlobalPreferencesPath();
  if (!existsSync(prefsPath)) {
    return false;
  }
  await rm(prefsPath, { force: true });
  return true;
}
