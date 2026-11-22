import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EvidenceReportSchema } from "../src/schemas/evidence.js";
import { getPackageRoot } from "../src/utils/paths.js";
import { tokenizeCommandStrict } from "../src/verify/argv.js";

const tempDirs: string[] = [];

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function runCliRaw(args: string[], cwd?: string): { ok: boolean; code: number; stdout: string; stderr: string } {
  const distEntry = path.join(getPackageRoot(), "dist", "index.js");
  try {
    const stdout = execFileSync(process.execPath, [distEntry, ...args], {
      encoding: "utf8",
      windowsHide: true,
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, code: 0, stdout, stderr: "" };
  } catch (error) {
    const err = error as { status?: number; stdout?: Buffer | string; stderr?: Buffer | string };
    return {
      ok: false,
      code: err.status ?? 1,
      stdout: String(err.stdout ?? ""),
      stderr: String(err.stderr ?? ""),
    };
  }
}

function runHookScript(
  scriptRelPath: string,
  stdinObj: Record<string, unknown>,
  cwd: string
): { ok: boolean; code: number; stdout: string; stderr: string } {
  const scriptFull = path.join(getPackageRoot(), scriptRelPath);
  try {
    const stdout = execFileSync(process.execPath, [scriptFull], {
      input: JSON.stringify(stdinObj),
      encoding: "utf8",
      windowsHide: true,
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { ok: true, code: 0, stdout, stderr: "" };
  } catch (error) {
    const err = error as { status?: number; stdout?: Buffer | string; stderr?: Buffer | string };
    return {
      ok: false,
      code: err.status ?? 1,
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

describe("Phase 3 verification (`mtsk contract`, `mtsk verify`), host hooks, and PR comments", () => {
  it("tokenizes safe commands strictly and rejects shell injection / chaining syntax", () => {
    expect(tokenizeCommandStrict('node --test "tests/my file.test.mjs"')).toEqual({
      ok: true,
      argv: ["node", "--test", "tests/my file.test.mjs"],
    });

    for (const unsafe of [
      "node -v && echo pwned",
      "node -v || true",
      "node -v; rm -rf /",
      "node -v | cat",
      "echo `whoami`",
      "echo $(whoami)",
      "node -v > out.txt",
    ]) {
      const res = tokenizeCommandStrict(unsafe);
      expect(res.ok).toBe(false);
    }
  });

  it("supports `mtsk contract init|validate` and `mtsk verify` end-to-end with `--from-report` caching", () => {
    const dir = createTempDir("mtsk-verify-e2e-");
    writeFileSync(path.join(dir, "ok.mjs"), 'console.log("CHECK_OK");\n', "utf8");
    mkdirSync(path.join(dir, "preview"), { recursive: true });
    writeFileSync(path.join(dir, "preview", "ui.png"), "PNG_DATA", "utf8");

    const initRes = runCliRaw(["contract", "init", "--dir", dir, "--title", "Signup"]);
    expect(initRes.ok).toBe(true);
    expect(existsSync(path.join(dir, "SPEC.md"))).toBe(true);

    // Replace starter contract with concrete passing command + artifact file
    writeFileSync(
      path.join(dir, "SPEC.md"),
      [
        "# Signup Spec",
        "",
        "## Contract: Signup",
        "- REQ-1 Health script passes.",
        "  Check: `node ok.mjs`",
        "- REQ-2 Preview screenshot exists.",
        "  Check: `file: preview/ui.png`",
        "- Out of scope: Password reset.",
        "",
      ].join("\n"),
      "utf8"
    );

    const valRes = runCliRaw(["contract", "validate", "--dir", dir, "--json"]);
    expect(valRes.ok).toBe(true);
    expect(JSON.parse(valRes.stdout).valid).toBe(true);

    // Before verify runs, --from-report must fail
    const cachedMissing = runCliRaw(["verify", "--dir", dir, "--from-report", "--json"]);
    expect(cachedMissing.ok).toBe(false);

    // Run full verify -> generates .agents/evidence/report.{json,md}
    const verifyRes = runCliRaw(["verify", "--dir", dir, "--json"]);
    expect(verifyRes.ok).toBe(true);
    const reportJson = EvidenceReportSchema.parse(
      JSON.parse(readFileSync(path.join(dir, ".agents", "evidence", "report.json"), "utf8"))
    );
    expect(reportJson.overallStatus).toBe("verified");
    expect(reportJson.summary).toEqual({ verified: 2, pending: 0, blocked: 0 });
    expect(existsSync(path.join(dir, ".agents", "evidence", "report.md"))).toBe(true);

    // Fast --from-report passes now
    const cachedPass = runCliRaw(["verify", "--dir", dir, "--from-report", "--json"]);
    expect(cachedPass.ok).toBe(true);

    // Mutate SPEC.md -> cached report becomes stale and --from-report fails!
    writeFileSync(
      path.join(dir, "SPEC.md"),
      [
        "# Signup Spec",
        "",
        "## Contract: Signup",
        "- REQ-1 Health script passes.",
        "  Check: `node ok.mjs`",
        "- REQ-2 Preview screenshot exists.",
        "  Check: `file: preview/ui.png`",
        "- REQ-3 Manual accessibility signoff.",
        "  Check: manual: Keyboard tab order verified",
        "",
      ].join("\n"),
      "utf8"
    );
    const cachedStale = runCliRaw(["verify", "--dir", dir, "--from-report", "--json"]);
    expect(cachedStale.ok).toBe(false);

    // Re-running verify marks REQ-3 pending (exit 1) unless --evidence is supplied
    const pendingRes = runCliRaw(["verify", "--dir", dir, "--json"]);
    expect(pendingRes.ok).toBe(false);
    expect(JSON.parse(pendingRes.stdout).report.summary.pending).toBe(1);

    const manualPass = runCliRaw([
      "verify",
      "--dir",
      dir,
      "--evidence",
      "REQ-3=Tested keyboard flow manually",
      "--json",
    ]);
    expect(manualPass.ok).toBe(true);
  });

  it("blocks unsafe commands and path-traversal file checks during `mtsk verify`", () => {
    const dir = createTempDir("mtsk-verify-unsafe-");
    writeFileSync(
      path.join(dir, "SPEC.md"),
      [
        "## Contract: Unsafe",
        "- REQ-1 Chained shell.",
        "  Check: `node -v && echo pwned`",
        "- REQ-2 Outside workspace traversal.",
        "  Check: `file: ../../etc/passwd`",
      ].join("\n"),
      "utf8"
    );

    const val = runCliRaw(["contract", "validate", "--dir", dir]);
    expect(val.ok).toBe(false);

    const ver = runCliRaw(["verify", "--dir", dir, "--json"]);
    expect(ver.ok).toBe(false);
    const report = EvidenceReportSchema.parse(JSON.parse(ver.stdout).report);
    expect(report.overallStatus).toBe("incomplete");
    expect(report.summary.blocked).toBe(2);
  });

  it("enforces contract completion in Claude Code & Antigravity Stop/SessionStart hooks without infinite loops", () => {
    const dir = createTempDir("mtsk-hooks-");
    writeFileSync(
      path.join(dir, "SPEC.md"),
      [
        "## Contract: Hooks Test",
        "- REQ-1 Passes node check.",
        "  Check: `node -e \"console.log(1)\"`",
      ].join("\n"),
      "utf8"
    );

    // 1. Missing evidence -> Claude Code Stop blocks with exit 2 + JSON block decision
    const claudeBlock = runHookScript(
      "plugins/claude-code/hooks/stop-verify.mjs",
      { cwd: dir, stop_hook_active: false },
      dir
    );
    expect(claudeBlock.code).toBe(2);
    expect(JSON.parse(claudeBlock.stdout).decision).toBe("block");

    // 2. Missing evidence -> Antigravity Stop returns decision=continue
    const agyContinue = runHookScript(
      "plugins/antigravity/hooks/stop-verify.mjs",
      { cwd: dir, continuationActive: false },
      dir
    );
    expect(agyContinue.code).toBe(0);
    expect(JSON.parse(agyContinue.stdout).decision).toBe("continue");

    // 3. Loop guards prevent infinite continuation
    const claudeLoopGuard = runHookScript(
      "plugins/claude-code/hooks/stop-verify.mjs",
      { cwd: dir, stop_hook_active: true },
      dir
    );
    expect(claudeLoopGuard.code).toBe(0);

    const agyLoopGuard = runHookScript(
      "plugins/antigravity/hooks/stop-verify.mjs",
      { cwd: dir, continuationActive: true },
      dir
    );
    expect(agyLoopGuard.code).toBe(0);
    expect(JSON.parse(agyLoopGuard.stdout)).toEqual({});

    // 4. Verified report -> both Stop hooks allow completion
    mkdirSync(path.join(dir, ".agents", "evidence"), { recursive: true });
    writeFileSync(
      path.join(dir, ".agents", "evidence", "report.json"),
      JSON.stringify({
        schemaVersion: "1.0.0",
        generatedAt: new Date().toISOString(),
        contractPath: "SPEC.md",
        contractHash: "demo",
        title: "Hooks Test",
        overallStatus: "verified",
        requirements: [],
        reviewerRisks: [],
        summary: { verified: 1, pending: 0, blocked: 0 },
      }),
      "utf8"
    );

    const claudePass = runHookScript(
      "plugins/claude-code/hooks/stop-verify.mjs",
      { cwd: dir, stop_hook_active: false },
      dir
    );
    expect(claudePass.code).toBe(0);

    const agyPass = runHookScript(
      "plugins/antigravity/hooks/stop-verify.mjs",
      { cwd: dir, continuationActive: false },
      dir
    );
    expect(agyPass.code).toBe(0);
    expect(JSON.parse(agyPass.stdout)).toEqual({});

    // 5. SessionStart hooks emit active context
    const claudeStart = runHookScript("plugins/claude-code/hooks/session-start.mjs", { cwd: dir }, dir);
    expect(claudeStart.code).toBe(0);
    expect(claudeStart.stdout).toContain("Contract active in SPEC.md");

    const agyStart = runHookScript("plugins/antigravity/hooks/session-start.mjs", { cwd: dir }, dir);
    expect(agyStart.code).toBe(0);
    expect(JSON.parse(agyStart.stdout).injectSteps[0].systemMessage.systemMessage).toContain(
      "Contract active in SPEC.md"
    );
  });

  it("generates Codex & Antigravity enforcement files via `mtsk init` and renders GitHub Action PR comments", async () => {
    const dir = createTempDir("mtsk-adapters-phase3-");
    const res = runCliRaw([
      "init",
      "--yes",
      "--no-git",
      "--dir",
      dir,
      "--agents",
      "codex,antigravity,claude-code",
    ]);
    expect(res.ok).toBe(true);
    expect(existsSync(path.join(dir, ".codex", "config.metaskill.toml"))).toBe(true);
    expect(existsSync(path.join(dir, ".codex", "hooks.metaskill.json"))).toBe(true);
    expect(existsSync(path.join(dir, ".agents", "hooks.json"))).toBe(true);
    expect(existsSync(path.join(dir, ".agents", "hooks", "stop-verify.mjs"))).toBe(true);
    expect(existsSync(path.join(dir, ".agents", "skills", "metaskill-verify", "SKILL.md"))).toBe(true);

    const actionModule = await import("../../scripts/github-action-verify.mjs");
    const comment = actionModule.buildStickyPrComment("## Evidence Report\nOK", "verified");
    expect(comment).toContain(actionModule.STICKY_MARKER);
    expect(comment).toContain("`verified`");
  });
});
