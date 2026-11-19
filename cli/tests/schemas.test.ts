import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  EditorCapabilitySchema,
  GlobalPreferencesSchema,
  MetaSkillConfigSchema,
  PermissionModeSchema,
  ProbeProfileSchema,
  SeedRegistrySchema,
} from "../src/schemas/index.js";
import { getPackageRoot } from "../src/utils/paths.js";

describe("Schema validation & curated radar seed registry", () => {
  it("validates radar/seed-registry.json against SeedRegistrySchema", () => {
    const registryPath = path.join(getPackageRoot(), "radar", "seed-registry.json");
    const raw = JSON.parse(readFileSync(registryPath, "utf8")) as unknown;
    const registry = SeedRegistrySchema.parse(raw);

    const activeEntries = registry.entries.filter((e) => e.status === "active");
    expect(activeEntries.length).toBeGreaterThanOrEqual(10);

    const coveredDomains = new Set(activeEntries.flatMap((e) => e.domains));
    expect(coveredDomains.has("web-fullstack")).toBe(true);
    expect(coveredDomains.has("video-audio")).toBe(true);
    expect(coveredDomains.has("db-appsec")).toBe(true);

    const guards = registry.entries.filter(
      (e) => e.status === "archived" || e.status === "deprecated"
    );
    expect(guards.length).toBeGreaterThanOrEqual(2);
    for (const guard of guards) {
      expect(guard.replacedBy).toBeTruthy();
    }
  });

  it("rejects duplicate IDs, insecure HTTP URLs, and deprecated entries missing replacedBy", () => {
    const baseEntry = {
      id: "tool-a",
      name: "Tool A",
      kind: "mcp" as const,
      domains: ["web-fullstack"],
      repoUrl: "https://github.com/example/tool-a",
      packageOrCommand: "npx tool-a",
      license: "MIT",
      status: "active" as const,
      osSupport: ["windows", "macos", "linux"] as const,
      installApprovalRequired: true,
      securityNotes: "Verified test note",
      verifiedAt: "2026-11-19",
    };

    expect(() =>
      SeedRegistrySchema.parse({
        schemaVersion: "1.0.0",
        updatedAt: "2026-11-19",
        entries: [baseEntry, { ...baseEntry }],
      })
    ).toThrow(/Duplicate registry entry id/);

    expect(() =>
      SeedRegistrySchema.parse({
        schemaVersion: "1.0.0",
        updatedAt: "2026-11-19",
        entries: [{ ...baseEntry, repoUrl: "http://github.com/example/tool-a" }],
      })
    ).toThrow();

    expect(() =>
      SeedRegistrySchema.parse({
        schemaVersion: "1.0.0",
        updatedAt: "2026-11-19",
        entries: [{ ...baseEntry, status: "deprecated" as const }],
      })
    ).toThrow(/replacedBy/);
  });

  it("validates MetaSkillConfigSchema (with read-only permissionMode default), GlobalPreferencesSchema, EditorCapabilitySchema, and ProbeProfileSchema", () => {
    const now = new Date().toISOString();
    const parsedConfig = MetaSkillConfigSchema.parse({
      schemaVersion: "1.0.0",
      persona: "vibecoder",
      language: "es",
      domains: ["web-fullstack", "video-audio"],
      agents: ["cursor", "antigravity"],
      autonomyMode: "autonomous-long",
      projectMode: "greenfield",
      createdAt: now,
      updatedAt: now,
    });
    expect(parsedConfig.persona).toBe("vibecoder");
    expect(parsedConfig.permissionMode).toBe("read-only");
    expect(PermissionModeSchema.parse("scoped-write")).toBe("scoped-write");

    const globalPrefs = GlobalPreferencesSchema.parse({
      schemaVersion: "1.0.0",
      persona: "dev",
      language: "es",
      permissionMode: "read-only",
      updatedAt: now,
    });
    expect(globalPrefs.permissionMode).toBe("read-only");

    const cap = EditorCapabilitySchema.parse({
      id: "cursor",
      displayName: "Cursor",
      instructionEntrypoints: [".cursor/rules/metaskill-core.mdc"],
      autoLoadsCanonicalAgentsMd: true,
      supportsProgressiveSkills: true,
      sessionContinuityMechanism: "alwaysApply + PROJECT_STATE.md",
      permissionEnforcement: "editor-sandbox-plus-advisory",
      guarantees: ["Loads rules automatically"],
      limitations: ["Advisory when YOLO mode is active"],
    });
    expect(cap.id).toBe("cursor");

    expect(() =>
      MetaSkillConfigSchema.parse({
        schemaVersion: "1.0.0",
        persona: "invalid-role",
        language: "en",
        domains: [],
        agents: ["cursor"],
        autonomyMode: "guided",
        projectMode: "greenfield",
        createdAt: now,
        updatedAt: now,
      })
    ).toThrow();

    expect(() =>
      ProbeProfileSchema.parse({
        schemaVersion: "1.0.0",
        capturedAt: "not-a-datetime",
      })
    ).toThrow();
  });
});
