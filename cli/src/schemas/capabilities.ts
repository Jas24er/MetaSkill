import { z } from "zod";
import { AgentIdSchema } from "./probe.js";

/** Distinguishes technical host-editor sandboxing from instruction-level guardrails. */
export const PermissionEnforcementSchema = z.enum([
  "editor-sandbox-plus-advisory",
  "advisory-only",
]);

export type PermissionEnforcement = z.infer<typeof PermissionEnforcementSchema>;

/** Honest capability and enforcement declaration for a supported AI coding editor. */
export const EditorCapabilitySchema = z.object({
  id: AgentIdSchema,
  displayName: z.string().min(1),
  instructionEntrypoints: z.array(z.string().min(1)).min(1),
  autoLoadsCanonicalAgentsMd: z.boolean(),
  supportsProgressiveSkills: z.boolean(),
  sessionContinuityMechanism: z.string().min(1),
  permissionEnforcement: PermissionEnforcementSchema,
  guarantees: z.array(z.string().min(1)).min(1),
  limitations: z.array(z.string().min(1)).min(1),
});

export type EditorCapability = z.infer<typeof EditorCapabilitySchema>;
