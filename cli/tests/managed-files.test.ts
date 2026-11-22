import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { syncManagedWholeFile, type ManagedManifest } from "../src/utils/fs.js";

const tempDirs: string[] = [];

function setup(): { dir: string; manifest: ManagedManifest } {
  const dir = mkdtempSync(path.join(os.tmpdir(), "mtsk-whole-file-"));
  tempDirs.push(dir);
  return { dir, manifest: { schemaVersion: "1.0.0", blocks: {} } };
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("syncManagedWholeFile", () => {
  const relPath = "skill/core.md";

  it("creates, then reports unchanged, and dry-run writes nothing", async () => {
    const { dir, manifest } = setup();
    const dry = await syncManagedWholeFile({ targetDir: dir, relPath, content: "v1\n", manifest, dryRun: true });
    expect(dry.status).toBe("created");
    expect(existsSync(path.join(dir, relPath))).toBe(false);
    expect(manifest.blocks).toEqual({});

    expect((await syncManagedWholeFile({ targetDir: dir, relPath, content: "v1\n", manifest })).status).toBe("created");
    expect((await syncManagedWholeFile({ targetDir: dir, relPath, content: "v1\n", manifest })).status).toBe("unchanged");
  });

  it("updates an untouched file to a new version and treats CRLF as equal", async () => {
    const { dir, manifest } = setup();
    await syncManagedWholeFile({ targetDir: dir, relPath, content: "a\nb\n", manifest });
    writeFileSync(path.join(dir, relPath), "a\r\nb\r\n", "utf8");
    expect((await syncManagedWholeFile({ targetDir: dir, relPath, content: "a\nb\n", manifest })).status).toBe("unchanged");

    const result = await syncManagedWholeFile({ targetDir: dir, relPath, content: "v2\n", manifest });
    expect(result.status).toBe("updated");
    expect(readFileSync(path.join(dir, relPath), "utf8")).toBe("v2\n");
  });

  it("preserves manual edits as a conflict unless forced", async () => {
    const { dir, manifest } = setup();
    await syncManagedWholeFile({ targetDir: dir, relPath, content: "v1\n", manifest });
    writeFileSync(path.join(dir, relPath), "edited\n", "utf8");

    const conflict = await syncManagedWholeFile({ targetDir: dir, relPath, content: "v2\n", manifest });
    expect(conflict.status).toBe("conflict");
    expect(readFileSync(path.join(dir, relPath), "utf8")).toBe("edited\n");

    const forced = await syncManagedWholeFile({ targetDir: dir, relPath, content: "v2\n", manifest, force: true });
    expect(forced.status).toBe("updated");
    expect(readFileSync(path.join(dir, relPath), "utf8")).toBe("v2\n");
  });

  it("treats an untracked existing file as a conflict unless adoption is requested", async () => {
    const { dir, manifest } = setup();
    writeFileSync(path.join(dir, "legacy.md"), "old\n", "utf8");
    const base = { targetDir: dir, relPath: "legacy.md", content: "new\n", manifest };

    expect((await syncManagedWholeFile(base)).status).toBe("conflict");
    expect((await syncManagedWholeFile({ ...base, adoptUntracked: true })).status).toBe("updated");
    expect(manifest.blocks["legacy.md"]?.markerId).toBe("FILE");
  });
});
