import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { DoctorReport } from "../src/adapters/doctor-rules.js";
import { probeBinary } from "../src/probes/binaries.js";
import { runExecFile } from "../src/probes/exec.js";
import { getPackageRoot } from "../src/utils/paths.js";

const tempDirs: string[] = [];

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function runCli(args: string[]): string {
  const distEntry = path.join(getPackageRoot(), "dist", "index.js");
  if (!existsSync(distEntry)) {
    throw new Error("dist/index.js missing. Run `npm run build` before `npm test`.");
  }
  return execFileSync(process.execPath, [distEntry, ...args], {
    encoding: "utf8",
    windowsHide: true,
  });
}

function startNodeServer(scriptPath: string): Promise<{ url: string; stop: () => void }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Timed out waiting for pilot web server to listen."));
    }, 8000);

    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      const match = text.match(/READY\s+(http:\/\/127\.0\.0\.1:\d+)/);
      if (match && match[1]) {
        clearTimeout(timeout);
        resolve({
          url: match[1],
          stop: () => {
            child.kill();
          },
        });
      }
    });

    child.on("exit", (code) => {
      clearTimeout(timeout);
      if (code !== null && code !== 0) {
        reject(new Error(`Server exited early with code ${code}: ${stderr}`));
      }
    });
  });
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("End-to-end domain pilots (Web + Video/Audio + DB/AppSec)", () => {
  it("runs a full web pilot from Spanish init to live interactive verification and cross-editor handoff under 5 minutes", async () => {
    const startedAt = Date.now();
    const dir = createTempDir("mtsk-pilot-web-");

    runCli([
      "init",
      "--yes",
      "--no-git",
      "--dir",
      dir,
      "--lang",
      "es",
      "--persona",
      "vibecoder",
      "--domains",
      "web-fullstack",
      "--agents",
      "codex",
      "--autonomy",
      "guided",
      "--permissions",
      "read-only",
    ]);

    expect(readFileSync(path.join(dir, "SPEC.md"), "utf8")).toContain("Especificación");
    expect(readFileSync(path.join(dir, "inputs", "README.txt"), "utf8")).toContain(
      "SOLO LECTURA"
    );

    // Build a minimal zero-dependency interactive web app
    mkdirSync(path.join(dir, "src"), { recursive: true });
    const serverPath = path.join(dir, "src", "server.mjs");
    writeFileSync(
      serverPath,
      [
        'import http from "node:http";',
        "const items = [];",
        "const htmlPage = `<!doctype html><html lang='es'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Piloto MetaSkill</title></head><body><main><h1>Lista Rápida</h1><form id='f'><input name='title' required /><button type='submit'>Agregar</button></form><ul id='items'></ul></main></body></html>`;",
        "const server = http.createServer(async (req, res) => {",
        '  if (req.method === "GET" && req.url === "/") {',
        '    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });',
        "    res.end(htmlPage);",
        "    return;",
        "  }",
        '  if (req.method === "GET" && req.url === "/health") {',
        '    res.writeHead(200, { "content-type": "application/json" });',
        '    res.end(JSON.stringify({ status: "ok" }));',
        "    return;",
        "  }",
        '  if (req.method === "GET" && req.url === "/api/items") {',
        '    res.writeHead(200, { "content-type": "application/json" });',
        "    res.end(JSON.stringify({ items }));",
        "    return;",
        "  }",
        '  if (req.method === "POST" && req.url === "/api/items") {',
        '    let body = "";',
        '    for await (const chunk of req) { body += chunk.toString("utf8"); }',
        "    try {",
        "      const parsed = JSON.parse(body);",
        '      const title = typeof parsed?.title === "string" ? parsed.title.trim() : "";',
        "      if (!title) {",
        '        res.writeHead(400, { "content-type": "application/json" });',
        '        res.end(JSON.stringify({ error: "title required" }));',
        "        return;",
        "      }",
        "      const entry = { id: items.length + 1, title };",
        "      items.push(entry);",
        '      res.writeHead(201, { "content-type": "application/json" });',
        "      res.end(JSON.stringify({ item: entry }));",
        "    } catch {",
        '      res.writeHead(400, { "content-type": "application/json" });',
        '      res.end(JSON.stringify({ error: "invalid json" }));',
        "    }",
        "    return;",
        "  }",
        '  res.writeHead(404, { "content-type": "application/json" });',
        '  res.end(JSON.stringify({ error: "not found" }));',
        "});",
        'server.listen(0, "127.0.0.1", () => {',
        "  const addr = server.address();",
        "  const port = typeof addr === 'object' && addr ? addr.port : 0;",
        "  console.log(`READY http://127.0.0.1:${port}`);",
        "});",
      ].join("\n"),
      "utf8"
    );

    const server = await startNodeServer(serverPath);
    try {
      const homeRes = await fetch(`${server.url}/`);
      expect(homeRes.status).toBe(200);
      const html = await homeRes.text();
      expect(html).toContain("<form");
      expect(html).toContain("viewport");

      const healthRes = await fetch(`${server.url}/health`);
      expect(healthRes.status).toBe(200);

      const postValid = await fetch(`${server.url}/api/items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Primer entregable" }),
      });
      expect(postValid.status).toBe(201);

      const listRes = await fetch(`${server.url}/api/items`);
      expect(listRes.status).toBe(200);
      const listJson = (await listRes.json()) as { items: Array<{ title: string }> };
      expect(listJson.items.some((item) => item.title === "Primer entregable")).toBe(true);

      const postInvalid = await fetch(`${server.url}/api/items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "" }),
      });
      expect(postInvalid.status).toBe(400);
    } finally {
      server.stop();
    }

    // Record real verification evidence in preview/ and close requirements in PROJECT_STATE.md
    writeFileSync(
      path.join(dir, "preview", "web-verification.md"),
      [
        "# Web Pilot Verification",
        "- GET / -> 200 OK (responsive form HTML)",
        "- POST /api/items -> 201 Created + GET /api/items round-trip verified",
        "- Invalid empty input -> 400 Bad Request (zero 5xx errors)",
      ].join("\n"),
      "utf8"
    );

    const elapsedMs = Date.now() - startedAt;
    expect(elapsedMs).toBeLessThan(300_000);

    writeFileSync(
      path.join(dir, "PROJECT_STATE.md"),
      [
        "# Estado del Proyecto (PROJECT_STATE.md)",
        "",
        `- **Última decisión:** Piloto web interactivo verificado en ${elapsedMs} ms.`,
        "- **Última evidencia:** `preview/web-verification.md`",
        "- **Siguiente paso:** Retomar en Claude Code o Cursor para ampliar persistencia.",
        "",
        "## Cierre de Requisitos",
        "- [x] `REQ-1`: Interfaz inicial HTML — `verified` (`preview/web-verification.md`)",
        "- [x] `REQ-2`: Alta y lectura `/api/items` — `verified` (201 + 200)",
        "- [ ] `REQ-3`: Capturas visuales navegador — `pending` (Playwright no requerido en smoke)",
      ].join("\n"),
      "utf8"
    );

    // Cross-editor handoff: switch/expand to claude-code and cursor without losing state
    runCli(["sync", "--dir", dir, "--agents", "codex,claude-code,cursor"]);
    expect(existsSync(path.join(dir, "CLAUDE.md"))).toBe(true);
    expect(existsSync(path.join(dir, ".cursor/rules/metaskill-core.mdc"))).toBe(true);
    expect(readFileSync(path.join(dir, "PROJECT_STATE.md"), "utf8")).toContain(
      "REQ-1"
    );
    expect(readFileSync(path.join(dir, "preview", "web-verification.md"), "utf8")).toContain(
      "201 Created"
    );
  });

  it("validates a real video/audio multimodal pipeline while keeping inputs/ byte-for-byte immutable", async () => {
    const dir = createTempDir("mtsk-pilot-media-");

    runCli([
      "init",
      "--yes",
      "--no-git",
      "--dir",
      dir,
      "--lang",
      "es",
      "--persona",
      "dev",
      "--domains",
      "video-audio",
      "--agents",
      "codex",
    ]);

    const docJson = runCli(["doctor", "--domain", "video-audio", "--dir", dir, "--json"]);
    const report = JSON.parse(docJson) as DoctorReport;
    expect(report.reportScope).toBe("environment-readiness");

    const [ffmpeg, ffprobe] = await Promise.all([probeBinary("ffmpeg"), probeBinary("ffprobe")]);
    if (!ffmpeg.available || !ffprobe.available) {
      return;
    }

    const inputClip = path.join(dir, "inputs", "sample.mp4");
    const genRes = await runExecFile(
      "ffmpeg",
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=640x360:rate=30:duration=2",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:sample_rate=48000:duration=2",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-ar",
        "48000",
        inputClip,
      ],
      15000
    );
    expect(genRes.ok).toBe(true);
    const inputHashBefore = createHash("sha256").update(readFileSync(inputClip)).digest("hex");

    mkdirSync(path.join(dir, "build"), { recursive: true });
    const outputClip = path.join(dir, "build", "processed.mp4");
    const encodeRes = await runExecFile(
      "ffmpeg",
      [
        "-y",
        "-i",
        inputClip,
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-r",
        "30",
        "-af",
        "loudnorm=I=-14:TP=-1.0:LRA=11",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-ar",
        "48000",
        outputClip,
      ],
      15000
    );
    expect(encodeRes.ok).toBe(true);

    const probeOut = await runExecFile(
      "ffprobe",
      ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", outputClip],
      8000
    );
    expect(probeOut.ok).toBe(true);
    const mediaMeta = JSON.parse(probeOut.stdout) as {
      streams: Array<{ codec_type: string; pix_fmt?: string; sample_rate?: string }>;
    };
    const videoStream = mediaMeta.streams.find((s) => s.codec_type === "video");
    const audioStream = mediaMeta.streams.find((s) => s.codec_type === "audio");
    expect(videoStream?.pix_fmt).toBe("yuv420p");
    expect(audioStream?.sample_rate).toBe("48000");

    const lufsCheck = await runExecFile(
      "ffmpeg",
      ["-i", outputClip, "-af", "ebur128", "-f", "null", "-"],
      10000
    );
    expect(lufsCheck.ok).toBe(true);
    expect(`${lufsCheck.stdout}\n${lufsCheck.stderr}`).toMatch(/Integrated loudness/i);

    const contactSheet = path.join(dir, "preview", "contact-sheet.png");
    const sheetRes = await runExecFile(
      "ffmpeg",
      ["-y", "-i", outputClip, "-vf", "fps=3,scale=320:-1,tile=3x2", "-frames:v", "1", contactSheet],
      10000
    );
    expect(sheetRes.ok).toBe(true);
    const pngBytes = readFileSync(contactSheet);
    expect(pngBytes.length).toBeGreaterThan(100);
    expect(pngBytes.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const inputHashAfter = createHash("sha256").update(readFileSync(inputClip)).digest("hex");
    expect(inputHashAfter).toBe(inputHashBefore);
  });

  it("validates a declarative database RLS & defensive AppSec pilot with preview evidence", () => {
    const dir = createTempDir("mtsk-pilot-db-");

    runCli([
      "init",
      "--yes",
      "--no-git",
      "--dir",
      dir,
      "--lang",
      "es",
      "--persona",
      "dev",
      "--domains",
      "db-appsec",
      "--agents",
      "codex",
    ]);

    mkdirSync(path.join(dir, "migrations"), { recursive: true });
    mkdirSync(path.join(dir, "tests"), { recursive: true });
    mkdirSync(path.join(dir, "src"), { recursive: true });

    const migrationSql = [
      "CREATE TABLE IF NOT EXISTS projects (",
      "  id uuid PRIMARY KEY,",
      "  owner_id uuid NOT NULL,",
      "  title text NOT NULL",
      ");",
      "CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);",
      "ALTER TABLE projects ENABLE ROW LEVEL SECURITY;",
      "CREATE POLICY projects_select ON projects FOR SELECT USING (auth.uid() = owner_id);",
      "CREATE POLICY projects_insert ON projects FOR INSERT WITH CHECK (auth.uid() = owner_id);",
      "CREATE POLICY projects_update ON projects FOR UPDATE USING (auth.uid() = owner_id);",
      "CREATE POLICY projects_delete ON projects FOR DELETE USING (auth.uid() = owner_id);",
      "",
    ].join("\n");
    writeFileSync(path.join(dir, "migrations", "001_init.sql"), migrationSql, "utf8");
    writeFileSync(path.join(dir, ".env.example"), "DATABASE_URL=\nAUTH_SECRET=\n", "utf8");
    writeFileSync(
      path.join(dir, "src", "queries.mjs"),
      'export function getProjectByOwnerQuery() { return "SELECT id, title FROM projects WHERE owner_id = $1"; }\n',
      "utf8"
    );

    const verifyScript = path.join(dir, "tests", "verify-db-appsec.mjs");
    writeFileSync(
      verifyScript,
      [
        'import assert from "node:assert/strict";',
        'import { readFileSync } from "node:fs";',
        'const sql = readFileSync("migrations/001_init.sql", "utf8");',
        'assert.match(sql, /ENABLE ROW LEVEL SECURITY/i);',
        'assert.match(sql, /CREATE INDEX .*owner_id/i);',
        'for (const verb of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {',
        '  assert.match(sql, new RegExp(`FOR ${verb}`, "i"));',
        "}",
        'const gitignore = readFileSync(".gitignore", "utf8");',
        'assert.match(gitignore, /^\\.env$/m);',
        'const queries = readFileSync("src/queries.mjs", "utf8");',
        'assert.doesNotMatch(queries, /\\$\\{.*\\}/);',
        'console.log("DB_APPSEC_INTEGRITY_PASS");',
      ].join("\n"),
      "utf8"
    );

    const checkOut = execFileSync(process.execPath, [verifyScript], {
      cwd: dir,
      encoding: "utf8",
      windowsHide: true,
    });
    expect(checkOut).toContain("DB_APPSEC_INTEGRITY_PASS");

    writeFileSync(
      path.join(dir, "preview", "security-report.md"),
      [
        "# Security & Data Integrity Report",
        "- `REQ-DB-1`: Declarative RLS policies (`SELECT`/`INSERT`/`UPDATE`/`DELETE`) + FK index — `verified`",
        "- `REQ-SEC-1`: `.gitignore` protects `.env` and parameterized queries enforced — `verified`",
        "- `REQ-SEC-2`: External host binary scanners (`gitleaks`/`semgrep`) — `pending` (run in CI or install locally via `mtsk doctor`)",
      ].join("\n"),
      "utf8"
    );
    expect(existsSync(path.join(dir, "preview", "security-report.md"))).toBe(true);
  });
});
