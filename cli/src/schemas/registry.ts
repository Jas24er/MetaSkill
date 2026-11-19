import { z } from "zod";

/** Operating systems supported by a radar registry entry. */
export const OsSupportSchema = z.enum(["windows", "macos", "linux"]);

/** Single verified MCP server, Agent Skill, or CLI tool entry. */
export const SeedRegistryEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(["mcp", "skill", "cli"]),
  domains: z.array(z.string()).min(1),
  repoUrl: z
    .string()
    .url()
    .refine((url) => url.startsWith("https://"), {
      message: "repoUrl must start with https://",
    }),
  packageOrCommand: z.string().min(1),
  license: z.string().min(1),
  status: z.enum(["active", "deprecated", "archived"]),
  osSupport: z.array(OsSupportSchema).min(1),
  installApprovalRequired: z.boolean(),
  securityNotes: z.string().min(1),
  minNodeVersion: z.string().optional(),
  replacedBy: z.string().optional(),
  verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "verifiedAt must be formatted as YYYY-MM-DD",
  }),
});

export type SeedRegistryEntry = z.infer<typeof SeedRegistryEntrySchema>;

/**
 * Validated curated seed registry used by Phase 3 Radar.
 * Guarantees unique entry IDs and valid active replacements for deprecated/archived tools.
 */
export const SeedRegistrySchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    entries: z.array(SeedRegistryEntrySchema).min(1),
  })
  .superRefine((registry, ctx) => {
    const byId = new Map<string, SeedRegistryEntry>();

    for (const [index, entry] of registry.entries.entries()) {
      if (byId.has(entry.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entries", index, "id"],
          message: `Duplicate registry entry id: ${entry.id}`,
        });
      } else {
        byId.set(entry.id, entry);
      }
    }

    for (const [index, entry] of registry.entries.entries()) {
      if (entry.status === "deprecated" || entry.status === "archived") {
        if (!entry.replacedBy || entry.replacedBy.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["entries", index, "replacedBy"],
            message: `${entry.status} entry '${entry.id}' must define replacedBy`,
          });
          continue;
        }

        const replacement = byId.get(entry.replacedBy);
        if (!replacement || replacement.status !== "active") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["entries", index, "replacedBy"],
            message: `replacedBy '${entry.replacedBy}' on '${entry.id}' must point to an active entry`,
          });
        }
      }
    }
  });

export type SeedRegistry = z.infer<typeof SeedRegistrySchema>;
