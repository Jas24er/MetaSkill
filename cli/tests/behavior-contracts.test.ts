import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EvalScenariosCatalogSchema } from "../src/schemas/eval.js";
import { getPackageRoot } from "../src/utils/paths.js";

const tempDirs: string[] = [];

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function snapshotDirectoryHashes(rootDir: string, baseDir: string = rootDir): Record<string, string> {
  const snapshot: Record<string, string> = {};
  const entries = readdirSync(rootDir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      Object.assign(snapshot, snapshotDirectoryHashes(fullPath, baseDir));
    } else if (entry.isFile()) {
      const rel = path.relative(baseDir, fullPath).replaceAll("\\", "/");
      const hash = createHash("sha256").update(readFileSync(fullPath)).digest("hex");
      snapshot[rel] = hash;
    }
  }
  return snapshot;
}

function runCliRaw(args: string[], cwd?: string): { ok: boolean; stdout: string; stderr: string } {
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

describe("MetaSkill behavioral scenarios & protocol contracts", () => {
  it("offers a read-only first step on bare invocation and respects an explicit task stage", () => {
    const dir = createTempDir("mtsk-assess-new-");
    const bare = runCliRaw([], dir);
    expect(bare.ok).toBe(true);
    expect(bare.stdout).toContain("Starting");
    const steps = new Set<string>();
    for (const stage of ["start", "develop", "release", "maintain"]) {
      const result = runCliRaw(["assess", "--stage", stage, "--lang", "es", "--json"], dir);
      expect(result.ok).toBe(true);
      const brief = JSON.parse(result.stdout);
      expect(brief.stage).toBe(stage);
      expect(brief.nextStep.length).toBeGreaterThan(0);
      steps.add(brief.nextStep);
    }
    expect(steps.size).toBe(4);
    expect(readdirSync(dir)).toEqual([]);
  });

  it("reuses custom release references on an established project without running scripts or scaffolding", () => {
    const dir = createTempDir("mtsk-assess-release-");
    mkdirSync(path.join(dir, "docs"));
    writeFileSync(path.join(dir, "docs", "release.md"), "Criteria for the release candidate.");
    writeFileSync(path.join(dir, "package.json"), JSON.stringify({
      scripts: { test: 'node -e "require(\'fs\').writeFileSync(\'executed\',\'yes\')"' },
    }));
    const before = snapshotDirectoryHashes(dir);
    const args = ["assess", "--dir", dir, "--use", "checks=npm test", "--use", "checks=Internal QA",
      "--use", "state=Delivery board?team=8", "--json"];
    const result = runCliRaw(args);
    expect(result.ok).toBe(true);
    const brief = JSON.parse(result.stdout);
    expect(brief.stage).toBe("unknown");
    expect(brief.inventory).toEqual(expect.arrayContaining([
      { capability: "release", discovered: ["docs/release.md"], declared: [] },
      { capability: "checks", discovered: ["package.json"], declared: ["npm test", "Internal QA"] },
      { capability: "state", discovered: [], declared: ["Delivery board?team=8"] },
    ]));
    const textBrief = runCliRaw(["assess", "--stage", "release", "--lang", "es", "--use", "checks=Internal QA"], dir);
    expect(textBrief.ok).toBe(true);
    expect(textBrief.stdout).toContain("Internal QA");
    expect(textBrief.stdout).toContain("docs/release.md");
    expect(textBrief.stdout).toContain("Preparación de entrega");
    expect(snapshotDirectoryHashes(dir)).toEqual(before);
    expect(readdirSync(dir).sort()).toEqual(["docs", "package.json"]);
  });

  it("rejects unknown stages, malformed references, and nonexistent project paths", () => {
    const dir = createTempDir("mtsk-assess-invalid-");
    for (const options of [["--stage", "finished"], ["--use", "checks"], ["--use", "checks= "],
      ["--use", "unknown=foo"], ["--dir", path.join(dir, "typo")]]) {
      expect(runCliRaw(["assess", ...options], dir).ok).toBe(false);
    }
    expect(readdirSync(dir)).toEqual([]);
  });

  it("validates evals/scenarios.json and confirms every fixture directory exists", () => {
    const pkgRoot = getPackageRoot();
    const catalogPath = path.join(pkgRoot, "evals", "scenarios.json");
    const raw = JSON.parse(readFileSync(catalogPath, "utf8")) as unknown;
    const catalog = EvalScenariosCatalogSchema.parse(raw);
    expect(catalog.scenarios.length).toBeGreaterThanOrEqual(16);

    const ids = catalog.scenarios.map((s) => s.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "01-brownfield-custom-rules",
        "02-professional-objection",
        "03-unverified-delivery",
        "04-natural-language-preference-switch",
      ])
    );

    for (const scenario of catalog.scenarios) {
      const fullFixtureDir = path.join(pkgRoot, scenario.fixtureDir);
      expect(existsSync(fullFixtureDir)).toBe(true);
    }
  });

  it("enforces zero filesystem mutations on read-only CLI inspections (probe, doctor, init --dry-run)", () => {
    const pkgRoot = getPackageRoot();
    const fixtureSrc = path.join(pkgRoot, "evals", "fixtures", "01-brownfield-custom-rules");
    const workDir = createTempDir("mtsk-eval-readonly-");
    cpSync(fixtureSrc, workDir, { recursive: true });

    const before = snapshotDirectoryHashes(workDir);

    const probeRes = runCliRaw(["probe", "--dir", workDir, "--json"]);
    expect(probeRes.ok).toBe(true);

    // Doctor reports errors on uninitialized workspaces, yet must leave the directory untouched.
    const doctorRes = runCliRaw(["doctor", "--dir", workDir, "--json"]);
    expect(doctorRes.stdout.trim().length).toBeGreaterThan(0);

    const dryRunRes = runCliRaw(["init", "--yes", "--no-git", "--dry-run", "--dir", workDir]);
    expect(dryRunRes.ok).toBe(true);

    const after = snapshotDirectoryHashes(workDir);
    expect(after).toEqual(before);
  });

  it("enforces read-only initial mode, 4 independent axes, and line budgets across SKILL.md and core/", () => {
    const pkgRoot = getPackageRoot();

    const skillText = readFileSync(path.join(pkgRoot, "SKILL.md"), "utf8");
    const skillLines = skillText.trimEnd().split(/\r?\n/).length;
    expect(skillLines).toBeLessThanOrEqual(95);
    expect(skillText).toMatch(/read-only/i);
    expect(skillText).not.toMatch(/mtsk probe --write/);
    expect(skillText).toContain("core/review-and-evidence.md");
    expect(skillText).toContain("core/learning-policy.md");
    expect(skillText).toContain("core/editor-guarantees.md");

    const guardrailsText = readFileSync(
      path.join(pkgRoot, "core", "autonomy-guardrails.md"),
      "utf8"
    );
    expect(guardrailsText).toContain("read-only");
    expect(guardrailsText).toContain("scoped-write");
    expect(guardrailsText).toContain("autonomous-green");
    expect(guardrailsText).toMatch(/approv.*recommendation/i);
    expect(guardrailsText).toMatch(/authoriz.*implementation/i);
    expect(guardrailsText).toMatch(/permanent rule/i);

    const antiAmnesiaText = readFileSync(
      path.join(pkgRoot, "core", "anti-amnesia-protocol.md"),
      "utf8"
    );
    expect(antiAmnesiaText).toContain("verified");
    expect(antiAmnesiaText).toContain("pending");
    expect(antiAmnesiaText).toContain("blocked");

    const reviewPath = path.join(pkgRoot, "core", "review-and-evidence.md");
    const learningPath = path.join(pkgRoot, "core", "learning-policy.md");
    const editorPath = path.join(pkgRoot, "core", "editor-guarantees.md");
    expect(existsSync(reviewPath)).toBe(true);
    expect(existsSync(learningPath)).toBe(true);
    expect(existsSync(editorPath)).toBe(true);

    const agentsTmplText = readFileSync(path.join(pkgRoot, "templates", "AGENTS.md.tmpl"), "utf8");
    const tmplLines = agentsTmplText.trimEnd().split(/\r?\n/).length;
    expect(tmplLines).toBeLessThanOrEqual(65);
    expect(agentsTmplText).toContain("{{PERMISSION_MODE}}");
  });
});
