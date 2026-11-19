import { z } from "zod";
import { AgentIdSchema } from "./probe.js";

/** Curated pilot domains and custom fallback supported by MetaSkill. */
export const DomainIdSchema = z.enum([
  "web-fullstack",
  "video-audio",
  "db-appsec",
  "custom",
]);

export type DomainId = z.infer<typeof DomainIdSchema>;

/** User interaction persona controlling jargon level and safe defaults. */
export const PersonaSchema = z.enum(["vibecoder", "dev"]);

export type Persona = z.infer<typeof PersonaSchema>;

/** Execution loop strategy for generated project specifications. */
export const AutonomyModeSchema = z.enum(["guided", "autonomous-long"]);

export type AutonomyMode = z.infer<typeof AutonomyModeSchema>;

/** Adaptive language preference persisted in `.agents/metaskill.config.json`. */
export const LanguageSchema = z.enum(["auto", "en", "es"]);

export type LanguagePreference = z.infer<typeof LanguageSchema>;

/** Independent permission tier enforcing read-only-first advisory behavior. */
export const PermissionModeSchema = z.enum([
  "read-only",
  "scoped-write",
  "autonomous-green",
]);

export type PermissionMode = z.infer<typeof PermissionModeSchema>;

/** Scope controlling how far user preferences persist across runs. */
export const PersistenceScopeSchema = z.enum([
  "conversation",
  "project",
  "global",
]);

export type PersistenceScope = z.infer<typeof PersistenceScopeSchema>;

/** Project-level MetaSkill configuration persisted in `.agents/metaskill.config.json`. */
export const MetaSkillConfigSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  persona: PersonaSchema,
  language: LanguageSchema,
  domains: z.array(DomainIdSchema).min(1),
  agents: z.array(AgentIdSchema).min(1),
  autonomyMode: AutonomyModeSchema,
  permissionMode: PermissionModeSchema.default("read-only"),
  projectMode: z.enum(["greenfield", "brownfield"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type MetaSkillConfig = z.infer<typeof MetaSkillConfigSchema>;

/** Opt-in user-level defaults applied across future `mtsk init` invocations. */
export const GlobalPreferencesSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  persona: PersonaSchema.optional(),
  language: LanguageSchema.optional(),
  domains: z.array(DomainIdSchema).min(1).optional(),
  agents: z.array(AgentIdSchema).min(1).optional(),
  autonomyMode: AutonomyModeSchema.optional(),
  permissionMode: PermissionModeSchema.optional(),
  updatedAt: z.string().datetime(),
});

export type GlobalPreferences = z.infer<typeof GlobalPreferencesSchema>;
