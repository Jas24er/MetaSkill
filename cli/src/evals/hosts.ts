import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { PermissionMode } from "../schemas/config.js";
import type { EvalHost, EvalScenario } from "../schemas/eval.js";
import type { ProbeProfile } from "../schemas/probe.js";
import { runExecFile } from "../probes/exec.js";
import { syncCanonicalCore } from "../adapters/canonical.js";
import { syncAdapters } from "../adapters/targets.js";
import { runProbe } from "../probes/index.js";
import { probeWorkspace } from "../probes/workspace.js";

export interface SpawnRunResult {
  ok: boolean;
  exitCode: number | null;
  timedOut: boolean;
  stdout: string;
  stderr: string;
  elapsedMs: number;
}

export interface HostAvailability {
  host: EvalHost;
  available: boolean;
  authenticated: boolean;
  binaryPath?: string;
  reason?: string;
}

export interface HeadlessAgentResult {
  status: "completed" | "error" | "timeout" | "unauthenticated";
  elapsedMs: number;
  responseText: string;
  rawTranscript: string;
  totalTokens: number | null;
  errorMessage?: string;
}

/** Runs a child process without shell interpolation, feeding optional stdin and closing it immediately. */
export function runSpawnWithStdin(options: {
  command: string;
  args: string[];
  cwd: string;
  stdinText?: string;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
}): Promise<SpawnRunResult> {
  const { command, args, cwd, stdinText = "", timeoutMs = 180_000, env } = options;
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      env: env ? { ...process.env, ...env } : process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill("SIGTERM");
        setTimeout(() => {
          if (!settled) child.kill("SIGKILL");
        }, 1500);
      } catch {
        // Ignore kill error on already exited child.
      }
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        ok: false,
        exitCode: null,
        timedOut,
        stdout,
        stderr: `${stderr}\n${err.message}`.trim(),
        elapsedMs: Date.now() - startedAt,
      });
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        ok: code === 0 && !timedOut,
        exitCode: code,
        timedOut,
        stdout,
        stderr,
        elapsedMs: Date.now() - startedAt,
      });
    });

    // A child that exits before reading stdin makes the write fail asynchronously with EPIPE
    // (seen on macOS). Without a listener that error would crash the whole process.
    child.stdin.on("error", () => {
      // Ignore: the exit code and output are still collected through "close".
    });
    try {
      child.stdin.end(stdinText);
    } catch {
      // Ignore broken stdin pipe if child exited immediately.
    }
  });
}

/** Resolves a host CLI executable path across PATH and known Windows install locations. */
export async function resolveHostBinary(host: EvalHost): Promise<string | undefined> {
  if (host === "mock") {
    return process.env.MTSK_EVAL_MOCK_SCRIPT;
  }

  const envKey =
    host === "claude-code"
      ? "MTSK_EVAL_CLAUDE_BIN"
      : host === "codex"
        ? "MTSK_EVAL_CODEX_BIN"
        : "MTSK_EVAL_AGY_BIN";
  const envOverride = process.env[envKey];
  if (envOverride && existsSync(envOverride)) {
    return envOverride;
  }

  const binName = host === "claude-code" ? "claude" : host === "codex" ? "codex" : "agy";
  const locator = process.platform === "win32" ? "where.exe" : "which";
  const located = await runExecFile(locator, [binName], 3000);
  if (located.ok && located.stdout.trim()) {
    const candidates = located.stdout
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const preferred =
      process.platform === "win32"
        ? candidates.find((c) => /\.(exe|cmd|bat)$/i.test(c)) ?? candidates[0]
        : candidates[0];
    if (preferred && existsSync(preferred)) {
      return preferred;
    }
  }

  if (process.platform === "win32") {
    const home = os.homedir();
    const windowsAppsCodex: string[] = [];
    if (host === "codex") {
      const codexConfig = path.join(home, ".codex", "config.toml");
      if (existsSync(codexConfig)) {
        try {
          const toml = readFileSync(codexConfig, "utf8");
          const m = toml.match(/CODEX_CLI_PATH\s*=\s*['"]([^'"]+)['"]/);
          if (m?.[1] && existsSync(m[1])) {
            return m[1];
          }
        } catch {
          // Ignore unreadable codex config.
        }
      }
      const winAppsRoot = "C:\\Program Files\\WindowsApps";
      if (existsSync(winAppsRoot)) {
        try {
          for (const entry of readdirSync(winAppsRoot)) {
            if (entry.startsWith("OpenAI.Codex_")) {
              const candidate = path.join(winAppsRoot, entry, "app", "resources", "codex.exe");
              if (existsSync(candidate)) windowsAppsCodex.push(candidate);
            }
          }
        } catch {
          // Ignore restricted WindowsApps listing if inaccessible.
        }
      }
    }
    const fallbacks: Record<Exclude<EvalHost, "mock">, string[]> = {
      "claude-code": [path.join(home, ".local", "bin", "claude.exe")],
      codex: [
        ...windowsAppsCodex,
        path.join(home, "AppData", "Roaming", "npm", "codex.cmd"),
        path.join(home, ".codex", ".sandbox-bin", "codex.exe"),
      ],
      antigravity: [path.join(home, "AppData", "Local", "agy", "bin", "agy.exe")],
    };
    for (const candidate of fallbacks[host]) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return undefined;
}

/** Verifies whether a host CLI is installed and authenticated locally without touching project files. */
export async function checkHostAvailability(host: EvalHost): Promise<HostAvailability> {
  const binPath = await resolveHostBinary(host);
  if (host === "mock") {
    return binPath && existsSync(binPath)
      ? { host, available: true, authenticated: true, binaryPath: binPath }
      : { host, available: false, authenticated: false, reason: "MTSK_EVAL_MOCK_SCRIPT not set" };
  }

  if (!binPath) {
    return { host, available: false, authenticated: false, reason: `${host} binary not found` };
  }

  if (host === "claude-code") {
    const authRes = await runExecFile(binPath, ["auth", "status"], 6000);
    try {
      const parsed = JSON.parse(authRes.stdout) as { loggedIn?: boolean };
      if (!parsed.loggedIn) {
        return {
          host,
          available: true,
          authenticated: false,
          binaryPath: binPath,
          reason: "pending-auth (Claude Code CLI installed, loggedIn: false)",
        };
      }
      return { host, available: true, authenticated: true, binaryPath: binPath };
    } catch {
      return {
        host,
        available: true,
        authenticated: authRes.ok,
        binaryPath: binPath,
        ...(authRes.ok ? {} : { reason: "pending-auth (could not confirm Claude login)" }),
      };
    }
  }

  if (host === "codex") {
    const loginRes = await runExecFile(binPath, ["login", "status"], 6000);
    const combined = `${loginRes.stdout}\n${loginRes.stderr}`;
    const authed = loginRes.ok && /logged in/i.test(combined);
    return {
      host,
      available: true,
      authenticated: authed,
      binaryPath: binPath,
      ...(authed ? {} : { reason: "pending-auth (run codex login)" }),
    };
  }

  const verRes = await runExecFile(binPath, ["--version"], 6000);
  return {
    host,
    available: verRes.ok,
    authenticated: verRes.ok,
    binaryPath: binPath,
    ...(verRes.ok ? {} : { reason: "agy --version failed" }),
  };
}

/** Copies a scenario fixture into `workDir` and optionally injects MetaSkill canonical files + adapter. */
export async function prepareScenarioWorkspace(options: {
  pkgRoot: string;
  scenario: EvalScenario;
  workDir: string;
  withMetaSkill: boolean;
  host: EvalHost;
  baseProbe?: ProbeProfile;
}): Promise<{ preExistingAgentsMd: boolean }> {
  const { pkgRoot, scenario, workDir, withMetaSkill, host, baseProbe } = options;
  const fixtureSrc = path.join(pkgRoot, scenario.fixtureDir);
  cpSync(fixtureSrc, workDir, { recursive: true });

  const preExistingAgentsMd = existsSync(path.join(workDir, "AGENTS.md"));

  if (!withMetaSkill) {
    return { preExistingAgentsMd };
  }

  const ws = await probeWorkspace(workDir);
  const probe: ProbeProfile = baseProbe
    ? {
        ...baseProbe,
        capturedAt: new Date().toISOString(),
        project: {
          cwd: ws.cwd,
          isGitRepo: ws.isGitRepo,
          mode: ws.mode,
          existingFileCount: ws.existingFileCount,
          detectedLanguages: ws.detectedLanguages,
        },
        agentsDetected: ws.agentsDetected,
      }
    : await runProbe(workDir);
  const now = new Date().toISOString();
  const targetAgent =
    host === "claude-code" ? "claude-code" : host === "antigravity" ? "antigravity" : "codex";

  const config = {
    schemaVersion: "1.0.0" as const,
    persona: scenario.initialConfig.persona,
    language: scenario.initialConfig.language,
    domains: ["custom" as const],
    agents: [targetAgent as "codex" | "claude-code" | "antigravity"],
    autonomyMode: scenario.initialConfig.autonomyMode,
    permissionMode: scenario.initialConfig.permissionMode,
    projectMode: probe.project.mode,
    createdAt: now,
    updatedAt: now,
  };

  await syncCanonicalCore(workDir, config, probe);
  await syncAdapters(workDir, config);
  return { preExistingAgentsMd };
}

function parseCodexJsonEvents(
  stdout: string,
  lastMsgPath: string
): { text: string; tokens: number | null; errorMessage?: string } {
  let text = "";
  let tokens: number | null = null;
  let errorMessage: string | undefined;
  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      const evt = JSON.parse(trimmed) as {
        type?: string;
        message?: string;
        error?: { message?: string };
        item?: { type?: string; text?: string };
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      if (evt.type === "item.completed" && evt.item?.type === "agent_message" && evt.item.text) {
        text = evt.item.text;
      }
      if (evt.type === "turn.completed" && evt.usage) {
        const inp = evt.usage.input_tokens ?? 0;
        const out = evt.usage.output_tokens ?? 0;
        tokens = (tokens ?? 0) + inp + out;
      }
      if (evt.type === "turn.failed" && evt.error?.message) {
        errorMessage = evt.error.message;
      } else if (evt.type === "error" && evt.message) {
        errorMessage = evt.message;
      }
    } catch {
      // Ignore non-JSON stdout line.
    }
  }
  if (!text && existsSync(lastMsgPath)) {
    text = readFileSync(lastMsgPath, "utf8").trim();
  }
  return { text, tokens, ...(errorMessage ? { errorMessage } : {}) };
}

function parseAgyJsonOutput(stdout: string): { text: string; tokens: number | null } {
  const trimmed = stdout.trim();
  if (!trimmed) return { text: "", tokens: null };
  try {
    const parsed = JSON.parse(trimmed) as {
      response?: string;
      usage?: { total_tokens?: number; input_tokens?: number; output_tokens?: number };
    };
    const tokens =
      typeof parsed.usage?.total_tokens === "number"
        ? parsed.usage.total_tokens
        : typeof parsed.usage?.input_tokens === "number"
          ? parsed.usage.input_tokens + (parsed.usage.output_tokens ?? 0)
          : null;
    return { text: String(parsed.response ?? "").trim(), tokens };
  } catch {
    return { text: trimmed, tokens: null };
  }
}

function parseClaudeJsonOutput(stdout: string): { text: string; tokens: number | null } {
  const trimmed = stdout.trim();
  if (!trimmed) return { text: "", tokens: null };
  try {
    const parsed = JSON.parse(trimmed) as {
      result?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const tokens =
      typeof parsed.usage?.input_tokens === "number"
        ? parsed.usage.input_tokens + (parsed.usage.output_tokens ?? 0)
        : null;
    return { text: String(parsed.result ?? "").trim(), tokens };
  } catch {
    return { text: trimmed, tokens: null };
  }
}

/** Runs a single scenario prompt against a headless host CLI inside `workDir`. */
export async function invokeHeadlessAgent(options: {
  host: EvalHost;
  binaryPath: string;
  prompt: string;
  workDir: string;
  permissionMode: PermissionMode;
  withMetaSkill: boolean;
  timeoutMs: number;
  model?: string;
  scenarioId: string;
}): Promise<HeadlessAgentResult> {
  const {
    host,
    binaryPath,
    prompt,
    workDir,
    permissionMode,
    withMetaSkill,
    timeoutMs,
    model,
    scenarioId,
  } = options;

  const fullPrompt = withMetaSkill
    ? `${prompt}\n\n(Follow project instructions in AGENTS.md / CLAUDE.md and .agents/skills/metaskill/SKILL.md. Active permission tier: ${permissionMode}.)`
    : prompt;

  if (host === "mock") {
    const run = await runSpawnWithStdin({
      command: process.execPath,
      args: [binaryPath, workDir, withMetaSkill ? "metaskill" : "bare", scenarioId, permissionMode],
      cwd: workDir,
      stdinText: fullPrompt,
      timeoutMs,
    });
    let parsed: { response?: string; tokens?: number } = {};
    try {
      parsed = JSON.parse(run.stdout.trim()) as { response?: string; tokens?: number };
    } catch {
      parsed = { response: run.stdout.trim() };
    }
    return {
      status: run.timedOut ? "timeout" : run.ok ? "completed" : "error",
      elapsedMs: run.elapsedMs,
      responseText: parsed.response ?? run.stdout.trim(),
      rawTranscript: `${run.stdout}\n${run.stderr}`.trim(),
      totalTokens: typeof parsed.tokens === "number" ? parsed.tokens : null,
      ...(run.ok ? {} : { errorMessage: run.stderr || `Exit ${run.exitCode}` }),
    };
  }

  if (host === "codex") {
    const lastMsgDir = path.join(os.tmpdir(), "mtsk-codex-out");
    mkdirSync(lastMsgDir, { recursive: true });
    const lastMsgPath = path.join(lastMsgDir, `${Date.now()}-${Math.random().toString(16).slice(2)}.txt`);
    writeFileSync(lastMsgPath, "", "utf8");

    const args = [
      "exec",
      "--ignore-user-config",
      "-c",
      'model_reasoning_effort="low"',
      ...(process.platform === "win32" ? ["-c", 'windows.sandbox="unelevated"'] : []),
      "--skip-git-repo-check",
      "--ephemeral",
      "--json",
      "--sandbox",
      "workspace-write",
      "-c",
      'approval_policy="never"',
    ];
    if (model) {
      args.push("-m", model);
    }
    args.push("-C", workDir, "-o", lastMsgPath, "-");

    const run = await runSpawnWithStdin({
      command: binaryPath,
      args,
      cwd: workDir,
      stdinText: fullPrompt,
      timeoutMs,
    });
    const parsed = parseCodexJsonEvents(run.stdout, lastMsgPath);
    return {
      status: run.timedOut ? "timeout" : run.ok ? "completed" : "error",
      elapsedMs: run.elapsedMs,
      responseText: parsed.text,
      rawTranscript: `${run.stdout}\n${run.stderr}`.trim(),
      totalTokens: parsed.tokens,
      ...(run.ok ? {} : { errorMessage: parsed.errorMessage ?? (run.stderr || `codex exited ${run.exitCode}`) }),
    };
  }

  if (host === "antigravity") {
    const args = [
      "--output-format",
      "json",
      "--sandbox",
      "--mode",
      "accept-edits",
      "--dangerously-skip-permissions",
    ];
    if (!withMetaSkill) {
      args.push("--disable-slash-commands");
    }
    const effectiveModel = model ?? "gemini-3.8-flash-low";
    if (effectiveModel) {
      args.push("--model", effectiveModel);
    }
    args.push(`--print=${fullPrompt}`);

    const run = await runSpawnWithStdin({
      command: binaryPath,
      args,
      cwd: workDir,
      timeoutMs,
    });
    const parsed = parseAgyJsonOutput(run.stdout);
    return {
      status: run.timedOut ? "timeout" : run.ok ? "completed" : "error",
      elapsedMs: run.elapsedMs,
      responseText: parsed.text,
      rawTranscript: `${run.stdout}\n${run.stderr}`.trim(),
      totalTokens: parsed.tokens,
      ...(run.ok ? {} : { errorMessage: run.stderr || `agy exited ${run.exitCode}` }),
    };
  }

  // Claude Code
  const args = [
    "-p",
    "--output-format",
    "json",
    "--permission-mode",
    permissionMode === "read-only" ? "plan" : "acceptEdits",
  ];
  if (!withMetaSkill) {
    args.push("--bare");
  }
  if (model) {
    args.push("--model", model);
  }
  const run = await runSpawnWithStdin({
    command: binaryPath,
    args,
    cwd: workDir,
    stdinText: fullPrompt,
    timeoutMs,
  });
  const parsed = parseClaudeJsonOutput(run.stdout);
  return {
    status: run.timedOut ? "timeout" : run.ok ? "completed" : "error",
    elapsedMs: run.elapsedMs,
    responseText: parsed.text,
    rawTranscript: `${run.stdout}\n${run.stderr}`.trim(),
    totalTokens: parsed.tokens,
    ...(run.ok ? {} : { errorMessage: run.stderr || `claude exited ${run.exitCode}` }),
  };
}
