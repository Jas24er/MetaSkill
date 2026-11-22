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

function resolveWorkspaceDir(payload) {
  if (typeof payload.cwd === "string" && payload.cwd.trim()) {
    return path.resolve(payload.cwd);
  }
  if (Array.isArray(payload.workspacePaths) && typeof payload.workspacePaths[0] === "string") {
    return path.resolve(payload.workspacePaths[0]);
  }
  return process.cwd();
}

const payload = readStdinJson();
const cwd = resolveWorkspaceDir(payload);
const parts = [];

const specPath = path.join(cwd, "SPEC.md");
if (existsSync(specPath)) {
  const reqs = readFileSync(specPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => /^-\s+(?:\*\*)?REQ-/i.test(l.trim()));
  if (reqs.length > 0) {
    parts.push(`Contract active in SPEC.md (${reqs.length} requirement(s)). Run \`mtsk verify\` and save visual/browser artifacts in preview/ before closing.`);
  }
}

const reportPath = path.join(cwd, ".agents", "evidence", "report.json");
if (existsSync(reportPath)) {
  try {
    const report = JSON.parse(readFileSync(reportPath, "utf8"));
    parts.push(
      `Last evidence (${report.generatedAt ?? "unknown"}): ${report.overallStatus} (${report.summary?.verified ?? 0} verified, ${report.summary?.pending ?? 0} pending, ${report.summary?.blocked ?? 0} blocked).`
    );
  } catch {
    // Ignore malformed report.
  }
}

if (parts.length === 0) {
  console.log("{}");
} else {
  console.log(
    JSON.stringify({
      injectSteps: [
        {
          systemMessage: {
            systemMessage: `[MetaSkill] ${parts.join(" ")}`,
          },
        },
      ],
    })
  );
}
