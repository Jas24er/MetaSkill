import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runExecFile } from "../src/probes/exec.js";
import { probeWorkspace } from "../src/probes/workspace.js";
import { hasContractFile, listWorkspacePackages } from "../src/probes/workspaces.js";
import { getPackageRoot } from "../src/utils/paths.js";

const tempDirs: string[] = [];

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function write(file: string, content: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content, "utf8");
}

function runCli(args: string[], cwd?: string): { ok: boolean; stdout: string } {
  const distEntry = path.join(getPackageRoot(), "dist", "index.js");
  if (!existsSync(distEntry)) {
    throw new Error("dist/index.js missing. Run `npm run build` before `npm test`.");
  }
  try {
    const stdout = execFileSync(process.execPath, [distEntry, ...args], {
      encoding: "utf8",
      windowsHide: true,
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, stdout };
  } catch (error) {
    return { ok: false, stdout: String((error as { stdout?: string }).stdout ?? "") };
  }
}

function contract(title: string, check: string): string {
  return `# ${title}\n\n## Contract: ${title}\n- REQ-1 ${title} works.\n  Check: \`${check}\`\n`;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("large projects and monorepos", () => {
  it("lists workspace packages from npm, pnpm and go.work manifests without walking the tree", () => {
    const root = createTempDir("mtsk-ws-");
    write(path.join(root, "package.json"), JSON.stringify({ workspaces: ["packages/*"] }));
    write(path.join(root, "pnpm-workspace.yaml"), 'packages:\n  - "apps/*"\n  - "!apps/ignored"\n');
    write(path.join(root, "go.work"), "go 1.22\n\nuse (\n  ./services/api\n)\n");
    for (const rel of ["packages/a", "packages/b", "apps/web", "services/api"]) {
      mkdirSync(path.join(root, rel), { recursive: true });
    }
    mkdirSync(path.join(root, "packages", "node_modules"), { recursive: true });

    expect(listWorkspacePackages(root)).toEqual(["apps/web", "packages/a", "packages/b", "services/api"]);
  });

  it("detects languages inside workspace packages, not only at the root", async () => {
    const root = createTempDir("mtsk-ws-lang-");
    write(path.join(root, "package.json"), JSON.stringify({ workspaces: ["packages/*"] }));
    write(path.join(root, "packages", "py", "pyproject.toml"), "[project]\nname='x'\n");
    write(path.join(root, "packages", "rs", "Cargo.toml"), "[package]\nname='x'\n");

    const ws = await probeWorkspace(root);
    expect(ws.workspacePackages).toEqual(["packages/py", "packages/rs"]);
    expect(ws.detectedLanguages).toEqual(expect.arrayContaining(["javascript", "python", "rust"]));
  });

  it("verifies every workspace contract with --workspaces and combines the result", () => {
    const root = createTempDir("mtsk-ws-verify-");
    write(path.join(root, "package.json"), JSON.stringify({ workspaces: ["packages/*"] }));
    write(path.join(root, "packages", "ok", "SPEC.md"), contract("Ok", "node --version"));
    write(path.join(root, "packages", "bad", "SPEC.md"), contract("Bad", 'node -e "process.exit(3)"'));
    write(path.join(root, "packages", "none", "README.md"), "no contract\n");
    expect(hasContractFile(path.join(root, "packages", "none"))).toBe(false);

    const res = runCli(["verify", "--workspaces", "--json", "--dir", root]);
    expect(res.ok).toBe(false);
    const parsed = JSON.parse(res.stdout) as {
      report: { overallStatus: string; summary: { verified: number; pending: number; blocked: number } };
      packages: Array<{ dir: string; report: { overallStatus: string } }>;
    };
    expect(parsed.packages.map((p) => p.dir)).toEqual(["packages/bad", "packages/ok"]);
    expect(parsed.report.overallStatus).toBe("incomplete");
    expect(parsed.report.summary.verified).toBe(1);
    expect(parsed.packages.find((p) => p.dir === "packages/ok")?.report.overallStatus).toBe("verified");
    expect(existsSync(path.join(root, "packages", "ok", ".agents", "evidence", "report.json"))).toBe(true);
  });

  it("reports a check that runs past --timeout as TIMED OUT, not as a test failure", () => {
    const root = createTempDir("mtsk-timeout-");
    write(path.join(root, "SPEC.md"), contract("Slow", 'node -e "setTimeout(()=>{},20000)"'));

    const started = Date.now();
    const res = runCli(["verify", "--timeout", "2000", "--dir", root]);
    expect(res.ok).toBe(false);
    expect(Date.now() - started).toBeLessThan(15_000);
    expect(res.stdout).toContain("TIMED OUT after 2s");
    expect(res.stdout).not.toContain("FAIL (exit");
  });

  it("flags timeouts in runExecFile and keeps real exit codes", async () => {
    const slow = await runExecFile(process.execPath, ["-e", "setTimeout(()=>{},20000)"], 500);
    expect(slow.ok).toBe(false);
    expect(slow.timedOut).toBe(true);

    const failing = await runExecFile(process.execPath, ["-e", "process.exit(3)"], 5000);
    expect(failing.timedOut).toBe(false);
    expect(failing.exitCode).toBe(3);
  });

  it("keeps hardware out of AGENTS.md and leaves build/ and output/ alone in existing projects", () => {
    const root = createTempDir("mtsk-brownfield-");
    write(path.join(root, "package.json"), JSON.stringify({ name: "existing" }));
    write(path.join(root, "build", "release.mjs"), "export {};\n");

    expect(runCli(["init", "--yes", "--no-git", "--dir", root, "--agents", "codex"]).ok).toBe(true);
    const agents = readFileSync(path.join(root, "AGENTS.md"), "utf8");
    expect(agents).not.toMatch(/Host Probe|GB RAM|VRAM/);
    const gitignore = readFileSync(path.join(root, ".gitignore"), "utf8");
    expect(gitignore).toContain(".agents/probe-profile.json");
    expect(gitignore).not.toMatch(/^build\/$/m);
    expect(gitignore).not.toMatch(/^output\/$/m);
  });
});
