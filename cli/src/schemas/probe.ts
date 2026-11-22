import { z } from "zod";

/** Supported AI coding agents and IDEs targeted by MetaSkill adapters. */
export const AgentIdSchema = z.enum([
  "claude-code",
  "cursor",
  "windsurf",
  "antigravity",
  "codex",
  "cline",
]);

export type AgentId = z.infer<typeof AgentIdSchema>;

/** Detected GPU entry with optional VRAM measurement in megabytes. */
export const GpuInfoSchema = z.object({
  name: z.string(),
  vendor: z.enum(["nvidia", "amd", "apple", "intel", "unknown"]),
  vramMb: z.number().int().nonnegative().nullable(),
});

export type GpuInfo = z.infer<typeof GpuInfoSchema>;

/** Availability and metadata of a local CLI binary. */
export const BinaryStatusSchema = z.object({
  available: z.boolean(),
  path: z.string().optional(),
  version: z.string().optional(),
});

export type BinaryStatus = z.infer<typeof BinaryStatusSchema>;

/** Deterministic machine and workspace profile captured by `mtsk probe`. */
export const ProbeProfileSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  capturedAt: z.string().datetime(),
  os: z.object({
    platform: z.enum(["win32", "darwin", "linux", "other"]),
    release: z.string(),
    arch: z.string(),
    shell: z.string(),
  }),
  hardware: z.object({
    cpuModel: z.string(),
    cpuCores: z.number().int().positive(),
    totalRamGb: z.number().nonnegative(),
    freeRamGb: z.number().nonnegative(),
    gpus: z.array(GpuInfoSchema),
  }),
  project: z.object({
    cwd: z.string(),
    isGitRepo: z.boolean(),
    mode: z.enum(["greenfield", "brownfield"]),
    existingFileCount: z.number().int().nonnegative(),
    detectedLanguages: z.array(z.string()),
    /** Workspace package dirs (relative) declared by npm/pnpm/yarn/lerna/Cargo/Go manifests. */
    workspacePackages: z.array(z.string()).optional(),
  }),
  agentsDetected: z.array(AgentIdSchema),
  binaries: z.record(z.string(), BinaryStatusSchema),
});

export type ProbeProfile = z.infer<typeof ProbeProfileSchema>;
