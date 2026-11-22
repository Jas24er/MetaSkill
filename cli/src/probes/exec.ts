import { execFile } from "node:child_process";

export interface ExecResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  /** Process exit code when it exited on its own; `null` when it was killed or never started. */
  exitCode?: number | null;
  /** True when the process was stopped because it ran past `timeoutMs`. */
  timedOut?: boolean;
}

/** Stops a timed-out child and, on Windows, its whole process tree (`cmd.exe` shims leave grandchildren behind). */
function killProcessTree(pid: number | undefined, kill: () => void): void {
  if (process.platform === "win32" && typeof pid === "number") {
    execFile("taskkill", ["/pid", String(pid), "/T", "/F"], { windowsHide: true }, () => {
      kill();
    });
    return;
  }
  kill();
}

/**
 * Executes a binary directly without shell interpolation and enforces a hard timeout.
 * Never throws; returns `{ ok: false }` on non-zero exit, missing binary, or timeout.
 */
export function runExecFile(
  command: string,
  args: string[],
  timeoutMs = 2000,
  cwd?: string
): Promise<ExecResult> {
  return new Promise((resolve) => {
    let timedOut = false;
    const child = execFile(
      command,
      args,
      {
        windowsHide: true,
        maxBuffer: 1024 * 1024,
        cwd,
      },
      (error, stdout, stderr) => {
        clearTimeout(timer);
        if (error) {
          const code = (error as NodeJS.ErrnoException & { code?: unknown }).code;
          resolve({
            ok: false,
            stdout: String(stdout ?? ""),
            stderr: String(stderr ?? ""),
            exitCode: !timedOut && typeof code === "number" ? code : null,
            timedOut,
          });
          return;
        }
        resolve({
          ok: true,
          stdout: String(stdout ?? ""),
          stderr: String(stderr ?? ""),
          exitCode: 0,
          timedOut: false,
        });
      }
    );
    const timer = setTimeout(() => {
      timedOut = true;
      killProcessTree(child.pid, () => {
        child.kill("SIGKILL");
      });
    }, timeoutMs);
  });
}
