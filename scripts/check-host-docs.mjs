#!/usr/bin/env node
// Weekly host capabilities audit: verifies that every official documentation URL
// declared in the capability matrix is reachable and that primary hosts were
// re-verified within the last 30 days. Requires `npm run build` first.
import { EDITOR_CAPABILITIES } from "../dist/adapters/capabilities.js";

const TIMEOUT_MS = 15_000;
const MAX_AGE_DAYS = 30;
const USER_AGENT = "MetaSkill-host-capabilities-check/1.0 (+https://github.com/Jas24er/MetaSkill)";

async function fetchStatus(url, method) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    return res.status;
  } catch (err) {
    return `error: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    clearTimeout(timer);
  }
}

async function checkUrl(url) {
  let status = await fetchStatus(url, "HEAD");
  if (typeof status !== "number" || [403, 405, 501].includes(status)) {
    status = await fetchStatus(url, "GET");
  }
  const ok = typeof status === "number" && status >= 200 && status < 400;
  return { url, status, ok };
}

const urlOwners = new Map();
const warnings = [];
const now = Date.now();

for (const cap of Object.values(EDITOR_CAPABILITIES)) {
  const urls = new Set([...cap.officialDocs, ...cap.verifiedClaims.map((c) => c.sourceUrl)]);
  for (const url of urls) {
    const owners = urlOwners.get(url) ?? [];
    owners.push(cap);
    urlOwners.set(url, owners);
  }
  if (cap.tier === "primary") {
    const ageDays = Math.floor((now - Date.parse(cap.verifiedAt)) / 86_400_000);
    if (ageDays > MAX_AGE_DAYS) {
      warnings.push(`${cap.displayName}: verifiedAt ${cap.verifiedAt} is ${ageDays} days old (> ${MAX_AGE_DAYS}). Re-verify the capability matrix.`);
    }
  }
}

const results = await Promise.all([...urlOwners.keys()].map((url) => checkUrl(url)));

let primaryFailures = 0;
console.log("| Status | Host(s) | URL |");
console.log("| :--- | :--- | :--- |");
for (const r of results) {
  const owners = urlOwners.get(r.url) ?? [];
  const isPrimary = owners.some((o) => o.tier === "primary");
  if (!r.ok && isPrimary) primaryFailures += 1;
  const label = r.ok ? `OK ${r.status}` : `${isPrimary ? "FAIL" : "WARN"} ${r.status}`;
  console.log(`| ${label} | ${owners.map((o) => o.id).join(", ")} | ${r.url} |`);
}

for (const w of warnings) console.warn(`WARNING: ${w}`);

const failed = results.filter((r) => !r.ok).length;
console.log(`\nChecked ${results.length} URLs: ${results.length - failed} reachable, ${failed} unreachable (${primaryFailures} on primary hosts).`);
process.exit(primaryFailures > 0 ? 1 : 0);
