import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function readStdinJson() {
  try {
    const raw = readFileSync(0, "utf8").trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const payload = readStdinJson();
const cwd = path.resolve(payload.cwd || process.cwd());
const lines = [];

const specPath = path.join(cwd, "SPEC.md");
if (existsSync(specPath)) {
  const reqs = readFileSync(specPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => /^-\s+(?:\*\*)?REQ-/i.test(l.trim()));
  if (reqs.length > 0) {
    lines.push(`[MetaSkill] Contract active in SPEC.md (${reqs.length} requirement(s)). Run \`mtsk verify\` before closing.`);
  }
}

const reportPath = path.join(cwd, ".agents", "evidence", "report.json");
if (existsSync(reportPath)) {
  try {
    const report = JSON.parse(readFileSync(reportPath, "utf8"));
    lines.push(
      `[MetaSkill] Last evidence (${report.generatedAt ?? "unknown"}): ${report.overallStatus} (${report.summary?.verified ?? 0} verified, ${report.summary?.pending ?? 0} pending, ${report.summary?.blocked ?? 0} blocked).`
    );
  } catch {
    // Ignore malformed report.
  }
}

const statePath = path.join(cwd, "PROJECT_STATE.md");
if (existsSync(statePath)) {
  const nextLine = readFileSync(statePath, "utf8")
    .split(/\r?\n/)
    .find((l) => /Next Step|Siguiente paso/i.test(l));
  if (nextLine) {
    lines.push(`[MetaSkill] ${nextLine.replace(/^-\s*/, "").trim()}`);
  }
}

if (lines.length > 0) {
  console.log(lines.join("\n"));
}
