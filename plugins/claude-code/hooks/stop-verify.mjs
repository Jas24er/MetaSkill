import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
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

function hasContractRequirements(specPath) {
  if (!existsSync(specPath)) return false;
  const content = readFileSync(specPath, "utf8");
  return /^##\s+(?:\d+\.\s*)?(?:contract|contrato)\b/im.test(content) && /^-\s+(?:\*\*)?REQ-[A-Za-z0-9_-]+/im.test(content);
}

function checkViaCli(cwd) {
  const bins = process.env.MTSK_BIN ? [process.env.MTSK_BIN] : ["mtsk"];
  for (const bin of bins) {
    try {
      const stdout = execFileSync(bin, ["verify", "--from-report", "--json", "--dir", cwd], {
        encoding: "utf8",
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 10000,
      });
      return { usedCli: true, ok: true, data: JSON.parse(stdout) };
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
        continue;
      }
      const stdout = String(err?.stdout ?? "").trim();
      if (stdout.startsWith("{")) {
        try {
          return { usedCli: true, ok: false, data: JSON.parse(stdout) };
        } catch {
          // Ignore non-JSON failure output.
        }
      }
      return { usedCli: true, ok: false, error: String(err?.stderr || err?.message || "verify failed") };
    }
  }
  return { usedCli: false };
}

function checkCachedReportFallback(cwd) {
  const reportPath = path.join(cwd, ".agents", "evidence", "report.json");
  if (!existsSync(reportPath)) {
    return {
      ok: false,
      reason: "Contract in SPEC.md has not been verified yet. Run checks and generate .agents/evidence/report.json (or `mtsk verify`) before concluding.",
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
        reason: `Evidence report is incomplete (${report.summary?.pending ?? 0} pending, ${report.summary?.blocked ?? 0} blocked). Finish or report open items explicitly before stopping.`,
      };
    }
    // Sanity check hash/freshness hint if contract exists
    const specContent = readFileSync(path.join(cwd, "SPEC.md"), "utf8");
    void createHash("sha256").update(specContent).digest("hex");
    return { ok: true };
  } catch {
    return { ok: false, reason: "Invalid .agents/evidence/report.json. Re-run `mtsk verify`." };
  }
}

const payload = readStdinJson();
if (payload.stop_hook_active === true) {
  process.exit(0);
}

const cwd = path.resolve(payload.cwd || process.cwd());
const specPath = path.join(cwd, "SPEC.md");
if (!hasContractRequirements(specPath)) {
  process.exit(0);
}

const cliRes = checkViaCli(cwd);
if (cliRes.usedCli) {
  if (cliRes.ok) {
    process.exit(0);
  }
  const msg =
    cliRes.data?.error ||
    `MetaSkill Stop gate: contract in SPEC.md has unverified requirements (${cliRes.data?.report?.summary?.pending ?? "?"} pending, ${cliRes.data?.report?.summary?.blocked ?? "?"} blocked). Run \`mtsk verify\` and fix or explicitly report pending items.`;
  console.log(JSON.stringify({ decision: "block", reason: msg }));
  process.exit(2);
}

const fallback = checkCachedReportFallback(cwd);
if (fallback.ok) {
  process.exit(0);
}
console.log(JSON.stringify({ decision: "block", reason: fallback.reason }));
process.exit(2);
