import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  DomainIdSchema,
  MetaSkillConfigSchema,
  type DomainId,
  type MetaSkillConfig,
} from "../schemas/config.js";
import { AgentIdSchema, type AgentId } from "../schemas/probe.js";

/** Parses and validates a comma-separated CLI option against a Zod enum schema. */
export function parseCsvEnum<T extends z.ZodTypeAny>(
  raw: string,
  schema: T,
  flagName: string
): Array<z.infer<T>> {
  const items = raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (items.length === 0) {
    throw new Error(`Flag ${flagName} must include at least one value.`);
  }

  return items.map((item) => {
    const parsed = schema.safeParse(item);
    if (!parsed.success) {
      throw new Error(`Invalid value '${item}' for ${flagName}.`);
    }
    return parsed.data as z.infer<T>;
  });
}

/** Parses comma-separated DomainIds. */
export function parseDomainsCsv(raw: string): DomainId[] {
  return parseCsvEnum(raw, DomainIdSchema, "--domains");
}

/** Parses comma-separated AgentIds. */
export function parseAgentsCsv(raw: string): AgentId[] {
  return parseCsvEnum(raw, AgentIdSchema, "--agents");
}

/** Loads and validates `.agents/metaskill.config.json` when present in `targetDir`. */
export async function loadConfigIfPresent(
  targetDir: string
): Promise<MetaSkillConfig | undefined> {
  const configPath = path.join(targetDir, ".agents", "metaskill.config.json");
  if (!existsSync(configPath)) {
    return undefined;
  }
  const raw = await readFile(configPath, "utf8");
  return MetaSkillConfigSchema.parse(JSON.parse(raw));
}
