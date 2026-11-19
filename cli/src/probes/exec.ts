import { execFile } from "node:child_process";

export interface ExecResult {
  ok: boolean;
  stdout: string;
  stderr: string;
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
    execFile(
      command,
      args,
      {
        timeout: timeoutMs,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
        cwd,
      },
      (error, stdout, stderr) => {
        if (error) {
          resolve({
            ok: false,
            stdout: String(stdout ?? ""),
            stderr: String(stderr ?? ""),
          });
          return;
        }
        resolve({
          ok: true,
          stdout: String(stdout ?? ""),
          stderr: String(stderr ?? ""),
        });
      }
    );
  });
}
