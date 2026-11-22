import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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

function hasContractRequirements(specPath) {
  if (!existsSync(specPath)) return false;
  const content = readFileSync(specPath, "utf8");
  return /^##\s+(?:\d+\.\s*)?(?:contract|contrato)\b/im.test(content) && /^-\s+(?:\*\*)?REQ-[A-Za-z0-9_-]+/im.test(content);
}

const WORKSPACE_PARENTS = ["packages", "apps", "services", "libs", "crates", "modules"];

/** Package dirs one level under common workspace folders whose SPEC.md has a contract (cheap, no tree walk). */
function workspaceContractDirs(cwd) {
  const dirs = [];
  for (const parent of WORKSPACE_PARENTS) {
    let entries = [];
    try {
      entries = readdirSync(path.join(cwd, parent), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const dir = path.join(cwd, parent, entry.name);
      if (entry.isDirectory() && hasContractRequirements(path.join(dir, "SPEC.md"))) dirs.push(dir);
    }
  }
  return dirs;
}

function checkViaCli(cwd) {
  const bins = process.env.MTSK_BIN ? [process.env.MTSK_BIN] : ["mtsk"];
  for (const bin of bins) {
    try {
      execFileSync(bin, ["verify", "--from-report", "--workspaces", "--json", "--dir", cwd], {
        encoding: "utf8",
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 10000,
      });
      return { usedCli: true, ok: true };
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && (err.code === "ENOENT" || err.code === "EINVAL")) {
        // Missing binary, or a Windows .cmd shim that execFile cannot start without a shell: use the cached report.
        continue;
      }
      const stdout = String(err?.stdout ?? "").trim();
      if (stdout.startsWith("{")) {
        try {
          const parsed = JSON.parse(stdout);
          return { usedCli: true, ok: false, error: parsed.error };
        } catch {
          // Ignore malformed stdout JSON.
        }
      }
      return { usedCli: true, ok: false, error: "Contract checks failed or remain incomplete." };
    }
  }
  return { usedCli: false };
}

function checkCachedReportFallback(cwd) {
  const reportPath = path.join(cwd, ".agents", "evidence", "report.json");
  if (!existsSync(reportPath)) {
    return {
      ok: false,
      reason: "SPEC.md has an active contract, but .agents/evidence/report.json is missing. Run `mtsk verify` (or verify each requirement) before saying done.",
    };
  }
  try {
    const report = JSON.parse(readFileSync(reportPath, "utf8"));
    if (
      report.overallStatus !== "verified" ||
      (report.summary?.pending ?? 0) > 0 ||
      (report.summary?.blocked ?? 0) > 0
    ) {
      return {
        ok: false,
        reason: `Evidence report is incomplete (${report.summary?.pending ?? 0} pending, ${report.summary?.blocked ?? 0} blocked). Finish or report open requirements explicitly.`,
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "Invalid .agents/evidence/report.json; re-run `mtsk verify`." };
  }
}

/** First contract dir whose cached evidence report is missing or incomplete, with a reason. */
function firstIncompleteReport(cwd, dirs) {
  for (const dir of dirs) {
    const res = checkCachedReportFallback(dir);
    if (!res.ok) {
      const rel = path.relative(cwd, dir) || ".";
      return { ok: false, reason: rel === "." ? res.reason : `${rel}: ${res.reason}` };
    }
  }
  return { ok: true };
}

const payload = readStdinJson();
if (payload.continuationActive === true) {
  console.log("{}");
  process.exit(0);
}

const cwd = resolveWorkspaceDir(payload);
const rootHasContract = hasContractRequirements(path.join(cwd, "SPEC.md"));
const packageContractDirs = workspaceContractDirs(cwd);
if (!rootHasContract && packageContractDirs.length === 0) {
  console.log("{}");
  process.exit(0);
}

const cliRes = checkViaCli(cwd);
if (cliRes.usedCli) {
  if (cliRes.ok) {
    console.log("{}");
  } else {
    console.log(
      JSON.stringify({
        decision: "continue",
        reason:
          cliRes.error ||
          "MetaSkill Stop gate: run `mtsk verify` and close every SPEC.md requirement with evidence before stopping.",
      })
    );
  }
  process.exit(0);
}

const fallback = firstIncompleteReport(cwd, [...(rootHasContract ? [cwd] : []), ...packageContractDirs]);
console.log(
  fallback.ok ? "{}" : JSON.stringify({ decision: "continue", reason: fallback.reason })
);
