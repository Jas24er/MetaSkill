import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { probeBinary } from "../src/probes/binaries.js";
import { runProbe } from "../src/probes/index.js";
import { probeWorkspace } from "../src/probes/workspace.js";
import { ProbeProfileSchema } from "../src/schemas/probe.js";

const tempDirs: string[] = [];

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("Deterministic environment probes", () => {
  it("classifies empty or boilerplate-only folders as greenfield", async () => {
    const dir = createTempDir("mtsk-probe-green-");
    writeFileSync(path.join(dir, "README.md"), "# Empty repo\n", "utf8");

    const ws = await probeWorkspace(dir);
    expect(ws.mode).toBe("greenfield");
    expect(ws.existingFileCount).toBe(0);
    expect(ws.isGitRepo).toBe(false);
    expect(ws.agentsDetected).toEqual([]);
  });

  it("keeps initialized greenfield scaffold classified as greenfield until real project or custom rule files exist", async () => {
    const dir = createTempDir("mtsk-probe-scaffold-");
    mkdirSync(path.join(dir, ".agents"), { recursive: true });
    mkdirSync(path.join(dir, ".cursor", "rules"), { recursive: true });
    mkdirSync(path.join(dir, "inputs"), { recursive: true });
    mkdirSync(path.join(dir, "preview"), { recursive: true });
    writeFileSync(path.join(dir, ".agents", "metaskill.config.json"), "{}", "utf8");
    writeFileSync(path.join(dir, "AGENTS.md"), "# Router\n", "utf8");
    writeFileSync(path.join(dir, "SPEC.md"), "# Spec\n", "utf8");
    writeFileSync(path.join(dir, "PROJECT_STATE.md"), "# State\n", "utf8");
    writeFileSync(path.join(dir, "inputs", "README.txt"), "read-only", "utf8");
    writeFileSync(path.join(dir, "preview", ".gitkeep"), "", "utf8");
    writeFileSync(path.join(dir, ".cursor", "rules", "metaskill-core.mdc"), "rule", "utf8");

    const greenWs = await probeWorkspace(dir);
    expect(greenWs.mode).toBe("greenfield");
    expect(greenWs.existingFileCount).toBe(0);

    // Adding a custom team rule or source file flips the workspace to brownfield
    writeFileSync(path.join(dir, ".cursor", "rules", "team-rules.mdc"), "custom", "utf8");
    const brownWs = await probeWorkspace(dir);
    expect(brownWs.mode).toBe("brownfield");
    expect(brownWs.existingFileCount).toBe(1);
  });

  it("classifies existing projects as brownfield and detects IDEs and languages", async () => {
    const dir = createTempDir("mtsk-probe-brown-");
    mkdirSync(path.join(dir, "src"), { recursive: true });
    mkdirSync(path.join(dir, ".cursor"), { recursive: true });
    mkdirSync(path.join(dir, ".claude"), { recursive: true });
    mkdirSync(path.join(dir, ".git"), { recursive: true });
    writeFileSync(path.join(dir, "src", "app.ts"), "export const x = 1;\n", "utf8");
    writeFileSync(path.join(dir, "package.json"), '{"name":"demo"}\n', "utf8");
    writeFileSync(path.join(dir, "tsconfig.json"), "{}\n", "utf8");

    const ws = await probeWorkspace(dir);
    expect(ws.mode).toBe("brownfield");
    expect(ws.isGitRepo).toBe(true);
    expect(ws.detectedLanguages).toContain("typescript");
    expect(ws.agentsDetected).toEqual(expect.arrayContaining(["cursor", "claude-code"]));
  });

  it("runs full host probe returning valid ProbeProfileSchema JSON", async () => {
    const profile = await runProbe(process.cwd());
    const parsed = ProbeProfileSchema.parse(profile);

    expect(parsed.hardware.cpuCores).toBeGreaterThanOrEqual(1);
    expect(parsed.hardware.totalRamGb).toBeGreaterThan(0);
    expect(parsed.binaries.node?.available).toBe(true);
    expect(parsed.binaries.git?.available).toBe(true);
    expect(parsed.binaries.npm?.available).toBe(true);
  });

  it("detects npm deterministically across repeated probe runs", async () => {
    for (let i = 0; i < 3; i += 1) {
      const status = await probeBinary("npm");
      expect(status.available).toBe(true);
      expect(status.version).toBeTruthy();
    }
  });
});
