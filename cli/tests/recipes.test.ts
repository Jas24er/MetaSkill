import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EvalScenariosCatalogSchema } from "../src/schemas/eval.js";
import { getPackageRoot } from "../src/utils/paths.js";

const REQUIRED_RECIPES = [
  "web-frontend",
  "api-backend",
  "existing-project-bug",
  "data-databases",
  "defensive-security",
  "audio-video-image",
  "llm-agents",
] as const;

describe("Phase 4 bilingual evidence recipes (`recipes/`)", () => {
  it("provides all 7 recipes in EN and ES under 60 lines with all 4 required sections and scenario coverage", () => {
    const pkgRoot = getPackageRoot();
    expect(existsSync(path.join(pkgRoot, "recipes", "README.md"))).toBe(true);
    expect(existsSync(path.join(pkgRoot, "recipes", "README.es.md"))).toBe(true);

    const catalogRaw = JSON.parse(
      readFileSync(path.join(pkgRoot, "evals", "scenarios.json"), "utf8")
    ) as unknown;
    const catalog = EvalScenariosCatalogSchema.parse(catalogRaw);
    const coveredRecipes = new Set(
      catalog.scenarios.map((s) => s.recipe).filter((r): r is string => Boolean(r))
    );

    for (const slug of REQUIRED_RECIPES) {
      const enPath = path.join(pkgRoot, "recipes", `${slug}.md`);
      const esPath = path.join(pkgRoot, "recipes", `${slug}.es.md`);
      expect(existsSync(enPath), `Missing EN recipe: ${slug}`).toBe(true);
      expect(existsSync(esPath), `Missing ES recipe: ${slug}`).toBe(true);

      const enText = readFileSync(enPath, "utf8");
      const esText = readFileSync(esPath, "utf8");

      const enLines = enText.trimEnd().split(/\r?\n/).length;
      const esLines = esText.trimEnd().split(/\r?\n/).length;
      expect(enLines, `${slug}.md exceeds 60 lines`).toBeLessThanOrEqual(60);
      expect(esLines, `${slug}.es.md exceeds 60 lines`).toBeLessThanOrEqual(60);

      expect(enText).toContain("## 1. What is checked");
      expect(enText).toContain("## 2. Tools");
      expect(enText).toContain("## 3. Evidence produced");
      expect(enText).toContain("## 4. Typical mistakes the reviewer hunts for");

      expect(esText).toContain("## 1. Qué se comprueba");
      expect(esText).toContain("## 2. Herramientas");
      expect(esText).toContain("## 3. Evidencia producida");
      expect(esText).toContain("## 4. Errores típicos que busca el revisor");

      expect(coveredRecipes.has(slug), `Recipe ${slug} lacks a paired scenario in evals/scenarios.json`).toBe(true);
    }
  });
});
