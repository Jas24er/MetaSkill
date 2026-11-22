import { z } from "zod";
import { AgentIdSchema } from "./probe.js";

/** Distinguishes lifecycle-hook + sandbox enforcement from advisory-only rules. */
export const PermissionEnforcementSchema = z.enum([
  "hooks-and-sandbox",
  "editor-sandbox-plus-advisory",
  "advisory-only",
]);

export type PermissionEnforcement = z.infer<typeof PermissionEnforcementSchema>;

/** Individual host capability claim backed by an official source URL and verification date. */
export const VerifiedClaimSchema = z.object({
  claim: z.string().min(1),
  sourceUrl: z.string().url(),
  verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type VerifiedClaim = z.infer<typeof VerifiedClaimSchema>;

/** Honest, source-backed capability and enforcement declaration for a supported AI coding host. */
export const EditorCapabilitySchema = z.object({
  id: AgentIdSchema,
  displayName: z.string().min(1),
  tier: z.enum(["primary", "paused"]),
  verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  officialDocs: z.array(z.string().url()).min(1),
  instructionEntrypoints: z.array(z.string().min(1)).min(1),
  autoLoadsCanonicalAgentsMd: z.boolean(),
  supportsProgressiveSkills: z.boolean(),
  supportsHooks: z.boolean(),
  supportsSubagents: z.boolean(),
  supportsHeadless: z.boolean(),
  headlessCommand: z.string().min(1).optional(),
  sessionContinuityMechanism: z.string().min(1),
  permissionEnforcement: PermissionEnforcementSchema,
  guarantees: z.array(z.string().min(1)).min(1),
  limitations: z.array(z.string().min(1)).min(1),
  verifiedClaims: z.array(VerifiedClaimSchema).min(1),
});

export type EditorCapability = z.infer<typeof EditorCapabilitySchema>;
