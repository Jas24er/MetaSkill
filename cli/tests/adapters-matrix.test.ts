import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getEditorCapabilities } from "../src/adapters/capabilities.js";
import { MetaSkillConfigSchema, type AgentId } from "../src/schemas/index.js";
import { countFileLines } from "../src/utils/fs.js";
import { getPackageRoot } from "../src/utils/paths.js";

const tempDirs: string[] = [];

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function runCli(
  args: string[],
  extraEnv: Record<string, string> = {}
): { ok: boolean; stdout: string; stderr: string } {
  const distEntry = path.join(getPackageRoot(), "dist", "index.js");
  if (!existsSync(distEntry)) {
    throw new Error("dist/index.js missing. Run `npm run build` before `npm test`.");
  }
  try {
    const stdout = execFileSync(process.execPath, [distEntry, ...args], {
      encoding: "utf8",
      windowsHide: true,
      env: { ...process.env, ...extraEnv },
    });
    return { ok: true, stdout, stderr: "" };
  } catch (error) {
    const err = error as { stdout?: Buffer | string; stderr?: Buffer | string };
    return {
      ok: false,
      stdout: String(err.stdout ?? ""),
      stderr: String(err.stderr ?? ""),
    };
  }
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("Multi-editor capabilities, conflict-safe sync & preferences", () => {
  it("supports all 6 editors with honest capability metadata and <= 75 line AGENTS.md", async () => {
    const dir = createTempDir("mtsk-matrix-all6-");
    const allAgents: AgentId[] = [
      "cursor",
      "claude-code",
      "windsurf",
      "antigravity",
      "codex",
      "cline",
    ];

    const capabilities = getEditorCapabilities(allAgents);
    expect(capabilities).toHaveLength(6);
    for (const cap of capabilities) {
      expect(cap.instructionEntrypoints.length).toBeGreaterThanOrEqual(1);
      expect(cap.guarantees.length).toBeGreaterThanOrEqual(1);
      expect(cap.officialDocs.length).toBeGreaterThanOrEqual(1);
      expect(cap.verifiedClaims.length).toBeGreaterThanOrEqual(1);
      expect(cap.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    const primaryIds = capabilities.filter((c) => c.tier === "primary").map((c) => c.id);
    expect(primaryIds).toEqual(["claude-code", "antigravity", "codex"]);
    for (const primary of capabilities.filter((c) => c.tier === "primary")) {
      expect(primary.supportsHooks).toBe(true);
      expect(primary.supportsSubagents).toBe(true);
      expect(primary.supportsHeadless).toBe(true);
      expect(primary.headlessCommand).toBeTruthy();
      expect(primary.permissionEnforcement).toBe("hooks-and-sandbox");
    }

    const res = runCli([
      "init",
      "--yes",
      "--no-git",
      "--dir",
      dir,
      "--domains",
      "web-fullstack,video-audio,db-appsec",
      "--agents",
      allAgents.join(","),
    ]);
    expect(res.ok).toBe(true);

    const expectedFiles = [
      ".cursor/rules/metaskill-core.mdc",
      ".cursor/rules/metaskill-web.mdc",
      ".cursor/rules/metaskill-media.mdc",
      ".cursor/rules/metaskill-db-appsec.mdc",
      "CLAUDE.md",
      ".claude/skills/metaskill/SKILL.md",
      ".windsurf/rules/metaskill.md",
      ".gemini/GEMINI.md",
      "AGENTS.md",
      ".clinerules/metaskill.md",
    ];
    for (const rel of expectedFiles) {
      expect(existsSync(path.join(dir, rel))).toBe(true);
    }

    const cursorCore = readFileSync(path.join(dir, ".cursor/rules/metaskill-core.mdc"), "utf8");
    expect(cursorCore.startsWith("---\n")).toBe(true);
    expect(cursorCore).toContain("<!-- METASKILL:ADAPTER:START -->");

    const claudeSkill = readFileSync(path.join(dir, ".claude/skills/metaskill/SKILL.md"), "utf8");
    expect(claudeSkill.startsWith("---\n")).toBe(true);
    expect(claudeSkill).toContain("<!-- METASKILL:ADAPTER:START -->");

    const agentsLineCount = await countFileLines(path.join(dir, "AGENTS.md"));
    expect(agentsLineCount).toBeLessThanOrEqual(75);
  });

  it("preserves custom team rules across two consecutive `mtsk sync` runs on all 6 editors", () => {
    const dir = createTempDir("mtsk-matrix-team-rules-");
    const allAgents = "cursor,claude-code,windsurf,antigravity,codex,cline";

    expect(runCli(["init", "--yes", "--no-git", "--dir", dir, "--agents", allAgents]).ok).toBe(true);

    const customMarker = "CUSTOM_TEAM_RULE_DO_NOT_OVERWRITE";
    const filesToCustomize = [
      "AGENTS.md",
      ".cursor/rules/metaskill-core.mdc",
      "CLAUDE.md",
      ".claude/skills/metaskill/SKILL.md",
      ".windsurf/rules/metaskill.md",
      ".gemini/GEMINI.md",
      ".clinerules/metaskill.md",
    ];

    for (const rel of filesToCustomize) {
      const fullPath = path.join(dir, rel);
      const current = readFileSync(fullPath, "utf8");
      writeFileSync(fullPath, `${current}\n# Team Rule\n${customMarker}\n`, "utf8");
    }

    expect(runCli(["sync", "--dir", dir]).ok).toBe(true);
    expect(runCli(["sync", "--dir", dir]).ok).toBe(true);

    for (const rel of filesToCustomize) {
      const updated = readFileSync(path.join(dir, rel), "utf8");
      expect(updated).toContain(customMarker);
    }
  });

  it("detects conflicts inside managed fenced blocks without overwriting, supports --check and --force", () => {
    const dir = createTempDir("mtsk-matrix-conflict-");
    expect(
      runCli(["init", "--yes", "--no-git", "--dir", dir, "--agents", "cursor,claude-code"]).ok
    ).toBe(true);

    const cursorCorePath = path.join(dir, ".cursor/rules/metaskill-core.mdc");
    const original = readFileSync(cursorCorePath, "utf8");
    const customOutside = "# Outside custom team invariant\nNEVER_DROP_THIS_LINE";
    const manualInsideEdit = original
      .replace("Read-Only First:", "MANUAL_USER_EDIT_INSIDE_FENCE:")
      .concat(`\n${customOutside}\n`);
    writeFileSync(cursorCorePath, manualInsideEdit, "utf8");

    // Read-only --check detects the conflict without modifying the file
    const checkBefore = runCli(["sync", "--check", "--dir", dir]);
    expect(checkBefore.ok).toBe(false);
    expect(checkBefore.stderr).toContain(".cursor/rules/metaskill-core.mdc");
    expect(readFileSync(cursorCorePath, "utf8")).toBe(manualInsideEdit);

    // Normal sync reports conflict and preserves manual edits untouched
    const syncRes = runCli(["sync", "--dir", dir]);
    expect(syncRes.ok).toBe(false);
    expect(syncRes.stderr).toContain(".cursor/rules/metaskill-core.mdc");
    expect(readFileSync(cursorCorePath, "utf8")).toContain("MANUAL_USER_EDIT_INSIDE_FENCE:");
    expect(readFileSync(cursorCorePath, "utf8")).toContain("NEVER_DROP_THIS_LINE");

    // --force refreshes only the fenced block while keeping outside user content
    const forceRes = runCli(["sync", "--force", "--dir", dir]);
    expect(forceRes.ok).toBe(true);
    const afterForce = readFileSync(cursorCorePath, "utf8");
    expect(afterForce).not.toContain("MANUAL_USER_EDIT_INSIDE_FENCE:");
    expect(afterForce).toContain("NEVER_DROP_THIS_LINE");

    // Subsequent --check is clean
    expect(runCli(["sync", "--check", "--dir", dir]).ok).toBe(true);
  });

  it("protects manual edits to vendored skill files and keeps probe-profile.json out of git", () => {
    const dir = createTempDir("mtsk-matrix-vendored-");
    expect(runCli(["init", "--yes", "--no-git", "--dir", dir, "--agents", "codex"]).ok).toBe(true);

    const gitignore = readFileSync(path.join(dir, ".gitignore"), "utf8");
    expect(gitignore).toMatch(/^\.agents\/probe-profile\.json$/m);

    const playbookPath = path.join(dir, ".agents/skills/metaskill/playbooks/web-fullstack.md");
    const original = readFileSync(playbookPath, "utf8");
    const edited = `${original}\nTEAM_LOCAL_PLAYBOOK_NOTE\n`;
    writeFileSync(playbookPath, edited, "utf8");

    const checkRes = runCli(["sync", "--check", "--dir", dir]);
    expect(checkRes.ok).toBe(false);
    expect(checkRes.stderr).toContain(".agents/skills/metaskill/playbooks/web-fullstack.md");

    const syncRes = runCli(["sync", "--dir", dir]);
    expect(syncRes.ok).toBe(false);
    expect(readFileSync(playbookPath, "utf8")).toBe(edited);

    expect(runCli(["sync", "--force", "--dir", dir]).ok).toBe(true);
    expect(readFileSync(playbookPath, "utf8")).toBe(original);
    expect(runCli(["sync", "--check", "--dir", dir]).ok).toBe(true);
  });

  it("preserves language, persona, autonomy, permissionMode, agents, and greenfield mode when re-running init", () => {
    const dir = createTempDir("mtsk-matrix-reinit-");
    const isolatedPrefsDir = createTempDir("mtsk-empty-prefs-");

    const first = runCli(
      [
        "init",
        "--yes",
        "--no-git",
        "--dir",
        dir,
        "--lang",
        "es",
        "--persona",
        "vibecoder",
        "--agents",
        "codex",
        "--autonomy",
        "guided",
        "--permissions",
        "read-only",
      ],
      { MTSK_CONFIG_DIR: isolatedPrefsDir }
    );
    expect(first.ok).toBe(true);

    const specEs = readFileSync(path.join(dir, "SPEC.md"), "utf8");
    const stateEs = readFileSync(path.join(dir, "PROJECT_STATE.md"), "utf8");
    expect(specEs).toContain("Especificación del Proyecto");
    expect(stateEs).toContain("Estado del Proyecto");

    const firstConfig = MetaSkillConfigSchema.parse(
      JSON.parse(readFileSync(path.join(dir, ".agents/metaskill.config.json"), "utf8"))
    );

    // Repeat init without repeating flags
    const second = runCli(["init", "--yes", "--no-git", "--dir", dir], {
      MTSK_CONFIG_DIR: isolatedPrefsDir,
    });
    expect(second.ok).toBe(true);

    const secondConfig = MetaSkillConfigSchema.parse(
      JSON.parse(readFileSync(path.join(dir, ".agents/metaskill.config.json"), "utf8"))
    );
    expect(secondConfig.language).toBe("es");
    expect(secondConfig.persona).toBe("vibecoder");
    expect(secondConfig.autonomyMode).toBe("guided");
    expect(secondConfig.permissionMode).toBe("read-only");
    expect(secondConfig.agents).toEqual(["codex"]);
    expect(secondConfig.projectMode).toBe("greenfield");
    expect(secondConfig.createdAt).toBe(firstConfig.createdAt);
  });

  it("supports opt-in global preferences and never escalates permissionMode on style/language syncs", () => {
    const prefsDir = createTempDir("mtsk-prefs-home-");
    const projA = createTempDir("mtsk-prefs-proja-");
    const projB = createTempDir("mtsk-prefs-projb-");
    const env = { MTSK_CONFIG_DIR: prefsDir };

    expect(
      runCli(
        [
          "prefs",
          "set",
          "--persona",
          "dev",
          "--lang",
          "es",
          "--autonomy",
          "guided",
          "--permissions",
          "read-only",
          "--agents",
          "codex",
        ],
        env
      ).ok
    ).toBe(true);

    const showRes = runCli(["prefs", "show", "--json"], env);
    expect(showRes.ok).toBe(true);
    const showJson = JSON.parse(showRes.stdout) as {
      preferences: { persona: string; language: string; permissionMode: string } | null;
    };
    expect(showJson.preferences?.persona).toBe("dev");
    expect(showJson.preferences?.language).toBe("es");
    expect(showJson.preferences?.permissionMode).toBe("read-only");

    // Project A inherits global preferences
    expect(runCli(["init", "--yes", "--no-git", "--dir", projA], env).ok).toBe(true);
    const configA = MetaSkillConfigSchema.parse(
      JSON.parse(readFileSync(path.join(projA, ".agents/metaskill.config.json"), "utf8"))
    );
    expect(configA.persona).toBe("dev");
    expect(configA.language).toBe("es");
    expect(configA.permissionMode).toBe("read-only");

    // Project B overrides language explicitly while inheriting the rest
    expect(runCli(["init", "--yes", "--no-git", "--lang", "en", "--dir", projB], env).ok).toBe(
      true
    );
    const configB = MetaSkillConfigSchema.parse(
      JSON.parse(readFileSync(path.join(projB, ".agents/metaskill.config.json"), "utf8"))
    );
    expect(configB.language).toBe("en");
    expect(configB.persona).toBe("dev");
    expect(configB.permissionMode).toBe("read-only");

    // Updating persona/language/rhythm via sync does NOT escalate permissionMode
    expect(
      runCli(
        [
          "sync",
          "--dir",
          projA,
          "--persona",
          "vibecoder",
          "--lang",
          "en",
          "--autonomy",
          "autonomous-long",
        ],
        env
      ).ok
    ).toBe(true);
    const afterSyncA = MetaSkillConfigSchema.parse(
      JSON.parse(readFileSync(path.join(projA, ".agents/metaskill.config.json"), "utf8"))
    );
    expect(afterSyncA.persona).toBe("vibecoder");
    expect(afterSyncA.language).toBe("en");
    expect(afterSyncA.autonomyMode).toBe("autonomous-long");
    expect(afterSyncA.permissionMode).toBe("read-only");

    expect(runCli(["prefs", "clear"], env).ok).toBe(true);
    const clearedJson = JSON.parse(runCli(["prefs", "show", "--json"], env).stdout) as {
      preferences: unknown;
    };
    expect(clearedJson.preferences).toBeNull();
  });
});
