import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export type FenceStyle = "html" | "hash";

export type FencedSyncStatus =
  | "created"
  | "updated"
  | "unchanged"
  | "merged"
  | "conflict";

export interface FencedSyncResult {
  relPath: string;
  status: FencedSyncStatus;
  reason?: string;
}

export const ManagedBlockRecordSchema = z.object({
  markerId: z.string().min(1),
  blockHash: z.string().min(1),
  updatedAt: z.string().datetime(),
});

export const ManagedManifestSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  blocks: z.record(z.string(), ManagedBlockRecordSchema),
});

export type ManagedManifest = z.infer<typeof ManagedManifestSchema>;

const MANAGED_MANIFEST_REL_PATH = path.join(".agents", ".metaskill-managed.json");

/** Computes a normalized SHA-256 hex digest using LF line endings. */
export function sha256(text: string): string {
  return createHash("sha256").update(text.replaceAll("\r\n", "\n"), "utf8").digest("hex");
}

/** Normalizes a relative path to forward slashes for cross-platform manifest keys. */
export function normalizePosixRelPath(relPath: string): string {
  return relPath.replaceAll("\\", "/");
}

/** Loads `.agents/.metaskill-managed.json` if present, or returns an empty manifest. */
export async function loadManagedManifest(targetDir: string): Promise<ManagedManifest> {
  const manifestPath = path.join(targetDir, MANAGED_MANIFEST_REL_PATH);
  if (!existsSync(manifestPath)) {
    return { schemaVersion: "1.0.0", blocks: {} };
  }
  try {
    const raw = await readFile(manifestPath, "utf8");
    return ManagedManifestSchema.parse(JSON.parse(raw));
  } catch {
    return { schemaVersion: "1.0.0", blocks: {} };
  }
}

/** Persists `.agents/.metaskill-managed.json`. */
export async function saveManagedManifest(
  targetDir: string,
  manifest: ManagedManifest
): Promise<void> {
  const manifestPath = path.join(targetDir, MANAGED_MANIFEST_REL_PATH);
  await writeTextFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

/** Ensures a directory exists recursively. */
export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

/**
 * Writes `content` to `filePath` only if it does not already exist.
 * Returns `true` when created, `false` when preserved untouched (Brownfield-safe).
 */
export async function writeIfAbsent(filePath: string, content: string): Promise<boolean> {
  if (existsSync(filePath)) {
    return false;
  }
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, content, "utf8");
  return true;
}

/** Writes `content` to `filePath`, creating parent directories automatically. */
export async function writeTextFile(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, content, "utf8");
}

function buildMarkers(markerId: string, style: FenceStyle): { start: string; end: string } {
  if (style === "hash") {
    return {
      start: `# METASKILL:${markerId}:START`,
      end: `# METASKILL:${markerId}:END`,
    };
  }
  return {
    start: `<!-- METASKILL:${markerId}:START -->`,
    end: `<!-- METASKILL:${markerId}:END -->`,
  };
}

export interface SyncManagedFencedFileOptions {
  targetDir: string;
  relPath: string;
  markerId: string;
  blockContent: string;
  style?: FenceStyle;
  frontmatter?: string;
  manifest: ManagedManifest;
  force?: boolean;
  dryRun?: boolean;
}

/**
 * Synchronizes a MetaSkill-managed fenced block while preserving all surrounding
 * user-authored content and refusing to overwrite manual edits inside managed fences
 * unless `force` is explicitly set.
 */
export async function syncManagedFencedFile(
  options: SyncManagedFencedFileOptions
): Promise<FencedSyncResult> {
  const {
    targetDir,
    relPath,
    markerId,
    blockContent,
    style = "html",
    frontmatter,
    manifest,
    force = false,
    dryRun = false,
  } = options;

  const posixRel = normalizePosixRelPath(relPath);
  const fullPath = path.join(targetDir, relPath);
  const { start, end } = buildMarkers(markerId, style);
  const desiredInner = blockContent.replaceAll("\r\n", "\n").trimEnd();
  const desiredHash = sha256(desiredInner);
  const normalizedBlock = `${start}\n${desiredInner}\n${end}`;
  const now = new Date().toISOString();

  // Case 1: File does not exist yet -> create with optional frontmatter + fenced block.
  if (!existsSync(fullPath)) {
    const header = frontmatter ? `${frontmatter.replaceAll("\r\n", "\n").trimEnd()}\n\n` : "";
    if (!dryRun) {
      await writeTextFile(fullPath, `${header}${normalizedBlock}\n`);
      manifest.blocks[posixRel] = { markerId, blockHash: desiredHash, updatedAt: now };
    }
    return { relPath: posixRel, status: "created" };
  }

  const existing = await readFile(fullPath, "utf8");
  const startIdx = existing.indexOf(start);
  const endIdx = existing.indexOf(end);

  // Case 2: Valid fenced block present -> check for manual edits inside fence.
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const rawSegment = existing.slice(startIdx + start.length, endIdx);
    const currentInner = rawSegment
      .replaceAll("\r\n", "\n")
      .replace(/^\n/, "")
      .replace(/\n$/, "");

    if (currentInner === desiredInner) {
      if (!dryRun) {
        manifest.blocks[posixRel] = { markerId, blockHash: desiredHash, updatedAt: now };
      }
      return { relPath: posixRel, status: "unchanged" };
    }

    const currentHash = sha256(currentInner);
    const recorded = manifest.blocks[posixRel];
    const matchesRecorded = recorded !== undefined && recorded.blockHash === currentHash;

    if (!matchesRecorded && !force) {
      return {
        relPath: posixRel,
        status: "conflict",
        reason:
          "Managed MetaSkill block was modified outside MetaSkill. Existing edits preserved; resolve manually or re-run with --force to update only the fenced block.",
      };
    }

    if (!dryRun) {
      const before = existing.slice(0, startIdx);
      const after = existing.slice(endIdx + end.length);
      await writeFile(fullPath, `${before}${normalizedBlock}${after}`, "utf8");
      manifest.blocks[posixRel] = { markerId, blockHash: desiredHash, updatedAt: now };
    }
    return { relPath: posixRel, status: "updated" };
  }

  // Case 3: Malformed / incomplete fence markers -> preserve untouched unless forced.
  if (startIdx !== -1 || endIdx !== -1) {
    if (!force) {
      return {
        relPath: posixRel,
        status: "conflict",
        reason:
          "Incomplete or corrupted MetaSkill fence markers detected. Preserved existing file untouched.",
      };
    }
    if (!dryRun) {
      const neutralized = existing
        .replaceAll(start, start.replace("METASKILL:", "METASKILL-ORPHANED:"))
        .replaceAll(end, end.replace("METASKILL:", "METASKILL-ORPHANED:"))
        .replace(/\s+$/, "");
      const separator = neutralized.length > 0 ? "\n\n" : "";
      await writeFile(fullPath, `${neutralized}${separator}${normalizedBlock}\n`, "utf8");
      manifest.blocks[posixRel] = { markerId, blockHash: desiredHash, updatedAt: now };
    }
    return {
      relPath: posixRel,
      status: "updated",
      reason: "Neutralized orphaned fence markers with --force and appended clean block while preserving user text.",
    };
  }

  // Case 4: Pre-existing user file with no MetaSkill markers -> preserve verbatim and append block.
  if (!dryRun) {
    const trimmed = existing.replace(/\s+$/, "");
    const separator = trimmed.length > 0 ? "\n\n" : "";
    await writeFile(fullPath, `${trimmed}${separator}${normalizedBlock}\n`, "utf8");
    manifest.blocks[posixRel] = { markerId, blockHash: desiredHash, updatedAt: now };
  }
  return {
    relPath: posixRel,
    status: "merged",
    reason: "Preserved pre-existing user content and appended MetaSkill fenced block.",
  };
}

/** Manifest marker used for files MetaSkill owns entirely (vendored skill files). */
export const WHOLE_FILE_MARKER = "FILE";

export interface SyncManagedWholeFileOptions {
  targetDir: string;
  relPath: string;
  content: string;
  manifest: ManagedManifest;
  force?: boolean;
  dryRun?: boolean;
  /** Overwrite an existing file that has no manifest record (one-time legacy migration). */
  adoptUntracked?: boolean;
}

/**
 * Synchronizes a file that MetaSkill owns entirely. A file is replaced only when it
 * still matches the last version MetaSkill wrote; manual edits become conflicts
 * unless `force` is set.
 */
export async function syncManagedWholeFile(
  options: SyncManagedWholeFileOptions
): Promise<FencedSyncResult> {
  const { targetDir, relPath, content, manifest, force = false, dryRun = false } = options;
  const posixRel = normalizePosixRelPath(relPath);
  const fullPath = path.join(targetDir, relPath);
  const desiredHash = sha256(content);
  const record = () => {
    manifest.blocks[posixRel] = {
      markerId: WHOLE_FILE_MARKER,
      blockHash: desiredHash,
      updatedAt: new Date().toISOString(),
    };
  };

  if (!existsSync(fullPath)) {
    if (!dryRun) {
      await writeTextFile(fullPath, content);
      record();
    }
    return { relPath: posixRel, status: "created" };
  }

  const currentHash = sha256(await readFile(fullPath, "utf8"));
  if (currentHash === desiredHash) {
    if (!dryRun) record();
    return { relPath: posixRel, status: "unchanged" };
  }

  const recorded = manifest.blocks[posixRel];
  const ownedByMetaSkill = recorded
    ? recorded.blockHash === currentHash
    : Boolean(options.adoptUntracked);
  if (!ownedByMetaSkill && !force) {
    return {
      relPath: posixRel,
      status: "conflict",
      reason:
        "MetaSkill-managed file was modified manually. Existing edits preserved; resolve manually or re-run with --force to replace it.",
    };
  }

  if (!dryRun) {
    await writeTextFile(fullPath, content);
    record();
  }
  return { relPath: posixRel, status: "updated" };
}

/** Lists files under `dirPath` recursively as POSIX paths relative to `dirPath`. */
export async function listFilesRecursive(dirPath: string, prefix = ""): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(path.join(dirPath, entry.name), rel)));
    } else if (entry.isFile()) {
      files.push(rel);
    }
  }
  return files;
}

/**
 * Idempotently inserts or replaces a MetaSkill-managed fenced block in `filePath`
 * while preserving all surrounding user-authored content verbatim.
 */
export async function upsertFencedBlock(
  filePath: string,
  markerId: string,
  blockContent: string,
  style: FenceStyle = "html"
): Promise<void> {
  const { start, end } = buildMarkers(markerId, style);
  const normalizedBlock = `${start}\n${blockContent.trimEnd()}\n${end}`;

  if (!existsSync(filePath)) {
    await writeTextFile(filePath, `${normalizedBlock}\n`);
    return;
  }

  const existing = await readFile(filePath, "utf8");
  const startIdx = existing.indexOf(start);
  const endIdx = existing.indexOf(end);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = existing.slice(0, startIdx);
    const after = existing.slice(endIdx + end.length);
    const updated = `${before}${normalizedBlock}${after}`;
    await writeFile(filePath, updated, "utf8");
    return;
  }

  const trimmed = existing.replace(/\s+$/, "");
  const separator = trimmed.length > 0 ? "\n\n" : "";
  await writeFile(filePath, `${trimmed}${separator}${normalizedBlock}\n`, "utf8");
}

/** Counts non-trailing-newline lines in a text file. */
export async function countFileLines(filePath: string): Promise<number> {
  const content = await readFile(filePath, "utf8");
  const trimmed = content.trimEnd();
  if (trimmed.length === 0) {
    return 0;
  }
  return trimmed.split(/\r?\n/).length;
}
