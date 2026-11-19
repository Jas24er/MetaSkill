import type { BinaryStatus } from "../schemas/probe.js";
import { runExecFile, type ExecResult } from "./exec.js";

/** Core CLI binaries checked deterministically by `mtsk probe`. */
export const PROBED_BINARIES = [
  "git",
  "node",
  "npm",
  "pnpm",
  "python",
  "uv",
  "ffmpeg",
  "ffprobe",
  "sox",
  "docker",
  "gh",
  "semgrep",
  "gitleaks",
  "trivy",
  "osv-scanner",
] as const;

const BINARY_PROBE_CONCURRENCY = 4;
const LOCATOR_TIMEOUT_MS = 3000;
const DIRECT_VERSION_TIMEOUT_MS = 3000;
const CMD_SCRIPT_TIMEOUT_MS = 6000;
const CMD_SCRIPT_RETRY_TIMEOUT_MS = 8000;

function getVersionArgs(name: string): string[] {
  if (name === "ffmpeg" || name === "ffprobe") {
    return ["-version"];
  }
  if (name === "gitleaks") {
    return ["version"];
  }
  return ["--version"];
}

function extractFirstLine(text: string): string | undefined {
  const line = text
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find((entry) => entry.length > 0);
  if (!line) {
    return undefined;
  }
  return line.length > 80 ? `${line.slice(0, 77)}...` : line;
}

function selectBestBinaryPath(rawStdout: string): string | undefined {
  const candidates = rawStdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (candidates.length === 0) {
    return undefined;
  }

  if (process.platform === "win32") {
    const exeMatch = candidates.find((p) => /\.(exe|com)$/i.test(p));
    if (exeMatch) {
      return exeMatch;
    }
    const cmdMatch = candidates.find((p) => /\.(cmd|bat)$/i.test(p));
    if (cmdMatch) {
      return cmdMatch;
    }
  }

  return candidates[0];
}

async function runVersionProbe(binPath: string, args: string[]): Promise<ExecResult> {
  const isWindowsBatch = process.platform === "win32" && /\.(cmd|bat)$/i.test(binPath);
  if (!isWindowsBatch) {
    return runExecFile(binPath, args, DIRECT_VERSION_TIMEOUT_MS);
  }

  const firstAttempt = await runExecFile(
    "cmd.exe",
    ["/d", "/c", binPath, ...args],
    CMD_SCRIPT_TIMEOUT_MS
  );
  const firstCombined = `${firstAttempt.stdout}${firstAttempt.stderr}`.trim();
  if (firstAttempt.ok || firstCombined.length > 0) {
    return firstAttempt;
  }

  // Retry once on transient Windows cmd.exe timeout with empty output under parallel load.
  return runExecFile(
    "cmd.exe",
    ["/d", "/c", binPath, ...args],
    CMD_SCRIPT_RETRY_TIMEOUT_MS
  );
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      const item = items[current];
      if (item !== undefined) {
        results[current] = await worker(item);
      }
    }
  }

  const workerCount = Math.min(Math.max(limit, 1), Math.max(items.length, 1));
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}

/** Probes a single CLI binary for path existence and valid version output. */
export async function probeBinary(name: string): Promise<BinaryStatus> {
  const locator = process.platform === "win32" ? "where.exe" : "which";
  const locResult = await runExecFile(locator, [name], LOCATOR_TIMEOUT_MS);
  if (!locResult.ok) {
    return { available: false };
  }

  const binPath = selectBestBinaryPath(locResult.stdout);
  if (!binPath) {
    return { available: false };
  }

  const args = getVersionArgs(name);
  const verResult = await runVersionProbe(binPath, args);
  const combinedOutput = `${verResult.stdout}\n${verResult.stderr}`;

  // Windows ships a Store app execution alias at WindowsApps\python.exe even when Python is not installed.
  if (
    process.platform === "win32" &&
    name === "python" &&
    /WindowsApps\\python\.exe$/i.test(binPath)
  ) {
    if (
      !verResult.ok ||
      /was not found/i.test(combinedOutput) ||
      !/Python \d+/i.test(combinedOutput)
    ) {
      return { available: false };
    }
  }

  if (!verResult.ok && !combinedOutput.trim()) {
    return { available: false };
  }

  const version = extractFirstLine(verResult.stdout || verResult.stderr);
  return {
    available: true,
    path: binPath,
    ...(version ? { version } : {}),
  };
}

/** Probes all standard MetaSkill binaries using bounded concurrency for cross-platform stability. */
export async function probeBinaries(): Promise<Record<string, BinaryStatus>> {
  const entries = await mapWithConcurrency(
    PROBED_BINARIES,
    BINARY_PROBE_CONCURRENCY,
    async (name) => [name, await probeBinary(name)] as const
  );
  return Object.fromEntries(entries);
}
