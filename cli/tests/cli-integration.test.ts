import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { DoctorReport } from "../src/adapters/doctor-rules.js";
import { MetaSkillConfigSchema, ProbeProfileSchema } from "../src/schemas/index.js";
import { countFileLines } from "../src/utils/fs.js";
import { getPackageRoot } from "../src/utils/paths.js";

const tempDirs: string[] = [];

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function runCli(args: string[], extraEnv: Record<string, string> = {}): string {
  const distEntry = path.join(getPackageRoot(), "dist", "index.js");
  if (!existsSync(distEntry)) {
    throw new Error("dist/index.js missing. Run `npm run build` before `npm test`.");
  }
  return execFileSync(process.execPath, [distEntry, ...args], {
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, ...extraEnv },
  });
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("Compiled CLI integration tests (mtsk)", () => {
  it("scaffolds a lean canonical workspace and thin IDE adapters in greenfield vibecoder mode with Spanish copy", async () => {
    const dir = createTempDir("mtsk-int-green-");
    const prefsDir = createTempDir("mtsk-int-prefs-");

    const stdout = runCli(
      [
        "init",
        "--yes",
        "--dir",
        dir,
        "--persona",
        "vibecoder",
        "--domains",
        "web-fullstack,video-audio",
        "--agents",
        "cursor,claude-code,antigravity",
        "--lang",
        "es",
        "--no-git",
      ],
      { MTSK_CONFIG_DIR: prefsDir }
    );

    expect(stdout).toContain("MetaSkill Instalado");
    expect(stdout).toContain("asesoría de solo lectura");

    expect(existsSync(path.join(dir, ".agents", "skills", "metaskill", "SKILL.md"))).toBe(true);
    expect(existsSync(path.join(dir, "SPEC.md"))).toBe(true);
    expect(existsSync(path.join(dir, "PROJECT_STATE.md"))).toBe(true);
    expect(existsSync(path.join(dir, "inputs", "README.txt"))).toBe(true);
    expect(existsSync(path.join(dir, ".cursor", "rules", "metaskill-core.mdc"))).toBe(true);
    expect(existsSync(path.join(dir, ".cursor", "rules", "metaskill-web.mdc"))).toBe(true);
    expect(existsSync(path.join(dir, ".cursor", "rules", "metaskill-media.mdc"))).toBe(true);
    expect(existsSync(path.join(dir, ".cursor", "rules", "metaskill-db-appsec.mdc"))).toBe(false);
    expect(existsSync(path.join(dir, "CLAUDE.md"))).toBe(true);
    expect(existsSync(path.join(dir, ".claude", "skills", "metaskill", "SKILL.md"))).toBe(true);
    expect(existsSync(path.join(dir, ".gemini", "GEMINI.md"))).toBe(true);

    const agentsLineCount = await countFileLines(path.join(dir, "AGENTS.md"));
    expect(agentsLineCount).toBeLessThanOrEqual(75);

    const gitignore = readFileSync(path.join(dir, ".gitignore"), "utf8");
    expect(gitignore).toContain(".env");
    expect(gitignore).toContain("preview/");

    const config = MetaSkillConfigSchema.parse(
      JSON.parse(readFileSync(path.join(dir, ".agents", "metaskill.config.json"), "utf8"))
    );
    expect(config.persona).toBe("vibecoder");
    expect(config.projectMode).toBe("greenfield");
    expect(config.language).toBe("es");
    expect(config.permissionMode).toBe("read-only");
    expect(config.autonomyMode).toBe("guided");
  });

  it("performs zero filesystem writes during `init --dry-run` on an empty folder", () => {
    const dir = createTempDir("mtsk-int-dry-");
    const stdout = runCli([
      "init",
      "--yes",
      "--no-git",
      "--dry-run",
      "--lang",
      "es",
      "--dir",
      dir,
    ]);
    expect(stdout).toContain("Simulación");
    expect(readdirSync(dir)).toEqual([]);
  });

  it("preserves existing user files non-destructively in brownfield dev mode", () => {
    const dir = createTempDir("mtsk-int-brown-");
    mkdirSync(path.join(dir, "src"), { recursive: true });
    writeFileSync(path.join(dir, "src", "index.ts"), "export const app = true;\n", "utf8");
    writeFileSync(path.join(dir, "SPEC.md"), "MY EXISTING SPEC\n", "utf8");
    writeFileSync(path.join(dir, "CLAUDE.md"), "# Existing Claude Notes\n", "utf8");
    writeFileSync(path.join(dir, ".gitignore"), "custom.log\n", "utf8");

    runCli([
      "init",
      "--yes",
      "--dir",
      dir,
      "--persona",
      "dev",
      "--domains",
      "db-appsec",
      "--agents",
      "claude-code",
      "--no-git",
    ]);

    const config = MetaSkillConfigSchema.parse(
      JSON.parse(readFileSync(path.join(dir, ".agents", "metaskill.config.json"), "utf8"))
    );
    expect(config.projectMode).toBe("brownfield");
    expect(config.persona).toBe("dev");
    expect(config.permissionMode).toBe("read-only");

    expect(readFileSync(path.join(dir, "SPEC.md"), "utf8")).toBe("MY EXISTING SPEC\n");

    const claudeMd = readFileSync(path.join(dir, "CLAUDE.md"), "utf8");
    expect(claudeMd).toContain("# Existing Claude Notes");
    expect(claudeMd).toContain("<!-- METASKILL:ADAPTER:START -->");

    const gitignore = readFileSync(path.join(dir, ".gitignore"), "utf8");
    expect(gitignore).toContain("custom.log");
    expect(gitignore).toContain(".env");
  });

  it("runs `sync` idempotently with byte-identical outputs across consecutive runs", () => {
    const dir = createTempDir("mtsk-int-sync-");

    runCli([
      "init",
      "--yes",
      "--dir",
      dir,
      "--persona",
      "dev",
      "--domains",
      "web-fullstack",
      "--agents",
      "claude-code,cursor",
      "--no-git",
    ]);

    runCli(["sync", "--dir", dir]);
    const agentsAfterFirst = readFileSync(path.join(dir, "AGENTS.md"), "utf8");
    const claudeAfterFirst = readFileSync(path.join(dir, "CLAUDE.md"), "utf8");
    const cursorAfterFirst = readFileSync(path.join(dir, ".cursor/rules/metaskill-core.mdc"), "utf8");

    runCli(["sync", "--dir", dir]);
    const agentsAfterSecond = readFileSync(path.join(dir, "AGENTS.md"), "utf8");
    const claudeAfterSecond = readFileSync(path.join(dir, "CLAUDE.md"), "utf8");
    const cursorAfterSecond = readFileSync(path.join(dir, ".cursor/rules/metaskill-core.mdc"), "utf8");

    expect(agentsAfterSecond).toBe(agentsAfterFirst);
    expect(claudeAfterSecond).toBe(claudeAfterFirst);
    expect(cursorAfterSecond).toBe(cursorAfterFirst);
    expect(agentsAfterSecond.match(/METASKILL:CORE:START/g)?.length).toBe(1);
    expect(claudeAfterSecond.match(/METASKILL:ADAPTER:START/g)?.length).toBe(1);
    expect(cursorAfterSecond.match(/METASKILL:ADAPTER:START/g)?.length).toBe(1);
  });

  it("outputs valid JSON for `probe --json` and passes canonical/adapter checks with readiness scope in `doctor --json`", () => {
    const dir = createTempDir("mtsk-int-doctor-");

    runCli([
      "init",
      "--yes",
      "--dir",
      dir,
      "--persona",
      "vibecoder",
      "--domains",
      "web-fullstack,video-audio,db-appsec",
      "--agents",
      "cursor,claude-code,antigravity",
      "--no-git",
    ]);

    const probeJson = runCli(["probe", "--dir", dir, "--json"]);
    const profile = ProbeProfileSchema.parse(JSON.parse(probeJson));
    expect(profile.binaries.node?.available).toBe(true);
    expect(profile.binaries.npm?.available).toBe(true);

    // Web-fullstack depends strictly on node + npm, so doctor must exit 0 on any Node test host.
    const webDoctorJson = runCli(["doctor", "--dir", dir, "--domain", "web-fullstack", "--json"]);
    const webReport = JSON.parse(webDoctorJson) as DoctorReport;
    expect(webReport.status).not.toBe("errors");
    expect(webReport.reportScope).toBe("environment-readiness");
    expect(webReport.editorCapabilities).toHaveLength(3);
    expect(webReport.readinessNotes.length).toBeGreaterThanOrEqual(2);

    // Full multi-domain doctor may exit 1 if ffmpeg is absent on a host; stdout remains valid JSON.
    let fullDoctorStdout = "";
    try {
      fullDoctorStdout = runCli(["doctor", "--dir", dir, "--json"]);
    } catch (error) {
      const errWithStdout = error as { stdout?: Buffer | string };
      fullDoctorStdout = String(errWithStdout.stdout ?? "");
    }
    const report = JSON.parse(fullDoctorStdout) as DoctorReport;

    const canonicalAndAdapterChecks = report.checks.filter(
      (c) => c.category === "canonical" || c.category === "adapter"
    );
    expect(canonicalAndAdapterChecks.length).toBeGreaterThanOrEqual(6);
    for (const check of canonicalAndAdapterChecks) {
      expect(check.severity).toBe("pass");
    }
  });
});
