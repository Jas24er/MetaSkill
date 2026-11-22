import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import pc from "picocolors";
import {
  parseContractFromMarkdown,
  renderContractMarkdown,
  type ContractDocument,
} from "../schemas/contract.js";
import { writeTextFile } from "../utils/fs.js";
import { tokenizeCommandStrict } from "../verify/argv.js";
import { loadContractDocument } from "../verify/runner.js";

export interface ContractInitOptions {
  dir?: string;
  contract?: string;
  title?: string;
  lang?: "en" | "es";
}

export interface ContractValidateOptions {
  dir?: string;
  contract?: string;
  json?: boolean;
}

/** Scaffolds or appends a `## Contract` / `## Contrato` section non-destructively. */
export async function contractInitCommand(options: ContractInitOptions): Promise<void> {
  const targetDir = path.resolve(options.dir ?? process.cwd());
  const contractRel = options.contract ?? "SPEC.md";
  const fullPath = path.join(targetDir, contractRel);
  const lang = options.lang === "es" ? "es" : "en";
  const title = options.title ?? (lang === "es" ? "Primera Entrega" : "First Deliverable");

  const starterDoc: ContractDocument = {
    schemaVersion: "1.0.0",
    title,
    requirements: [
      {
        id: "REQ-1",
        description:
          lang === "es"
            ? "Describe el primer resultado comprobable."
            : "Describe the first testable outcome.",
        checks: [
          {
            kind: "manual",
            value:
              lang === "es"
                ? "Reemplazar por comando (ej. `npm test`) o `file: ruta`"
                : "Replace with test command (e.g. `npm test`) or `file: path`",
            raw:
              lang === "es"
                ? "manual: Reemplazar por comando (ej. `npm test`) o `file: ruta`"
                : "manual: Replace with test command (e.g. `npm test`) or `file: path`",
          },
        ],
      },
    ],
    outOfScope: [
      lang === "es"
        ? "Cambios fuera de este entregable"
        : "Changes outside this deliverable",
    ],
    sourcePath: contractRel,
  };

  const sectionMd = renderContractMarkdown(starterDoc, lang);

  if (!existsSync(fullPath)) {
    const header = lang === "es" ? "# Especificación del Proyecto\n\n" : "# Project Specification\n\n";
    await writeTextFile(fullPath, `${header}${sectionMd}`);
    console.log(pc.green(`Created contract in ${contractRel}`));
    return;
  }

  const existing = await readFile(fullPath, "utf8");
  const parsed = parseContractFromMarkdown(existing, contractRel);
  if (parsed.requirements.length > 0 || /^##\s+(?:\d+\.\s*)?(contract|contrato)\b/im.test(existing)) {
    console.log(pc.yellow(`Preserved existing contract section in ${contractRel}.`));
    return;
  }

  const trimmed = existing.replace(/\s+$/, "");
  const sep = trimmed.length > 0 ? "\n\n" : "";
  await writeFile(fullPath, `${trimmed}${sep}${sectionMd}`, "utf8");
  console.log(pc.green(`Appended contract section to ${contractRel}`));
}

/** Validates that a delivery contract defines at least one testable REQ-N with safe checks. */
export async function contractValidateCommand(options: ContractValidateOptions): Promise<void> {
  const targetDir = path.resolve(options.dir ?? process.cwd());
  const contractRel = options.contract ?? "SPEC.md";

  let doc: ContractDocument;
  let contractHash: string;
  try {
    const loaded = await loadContractDocument(targetDir, contractRel);
    doc = loaded.contract;
    contractHash = loaded.contractHash;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (options.json) {
      console.log(JSON.stringify({ valid: false, errors: [msg] }, null, 2));
    } else {
      console.error(pc.red(msg));
    }
    process.exitCode = 1;
    return;
  }

  const errors: string[] = [];
  if (doc.requirements.length === 0) {
    errors.push(`No REQ-N entries found under '## Contract' / '## Contrato' in ${contractRel}.`);
  }

  const seenIds = new Set<string>();
  for (const req of doc.requirements) {
    if (seenIds.has(req.id)) {
      errors.push(`Duplicate requirement ID: ${req.id}`);
    }
    seenIds.add(req.id);

    if (req.checks.length === 0 && !req.risk) {
      errors.push(`${req.id} has neither a verification check nor an explicit Risk: note.`);
    }
    for (const check of req.checks) {
      if (check.kind === "command") {
        const tok = tokenizeCommandStrict(check.value);
        if (!tok.ok) {
          errors.push(`${req.id} command check rejected: ${tok.error}`);
        }
      }
    }
  }

  const valid = errors.length === 0;
  if (options.json) {
    console.log(
      JSON.stringify(
        {
          valid,
          contractHash,
          title: doc.title,
          requirementCount: doc.requirements.length,
          errors,
        },
        null,
        2
      )
    );
  } else if (valid) {
    console.log(
      pc.green(`Contract valid (${doc.requirements.length} requirement(s)) — ${contractRel}`)
    );
  } else {
    console.error(pc.red(`Contract validation failed (${contractRel}):`));
    for (const err of errors) {
      console.error(pc.red(`  - ${err}`));
    }
  }

  if (!valid) {
    process.exitCode = 1;
  }
}
