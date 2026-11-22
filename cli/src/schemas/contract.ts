import { z } from "zod";

export const ContractCheckKindSchema = z.enum(["command", "file", "manual"]);
export type ContractCheckKind = z.infer<typeof ContractCheckKindSchema>;

export const ContractCheckSchema = z.object({
  kind: ContractCheckKindSchema,
  value: z.string().min(1),
  raw: z.string().min(1),
});
export type ContractCheck = z.infer<typeof ContractCheckSchema>;

export const ContractRequirementSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  checks: z.array(ContractCheckSchema),
  risk: z.string().min(1).optional(),
});
export type ContractRequirement = z.infer<typeof ContractRequirementSchema>;

export const ContractDocumentSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  title: z.string().min(1),
  requirements: z.array(ContractRequirementSchema),
  outOfScope: z.array(z.string()),
  sourcePath: z.string().min(1),
});
export type ContractDocument = z.infer<typeof ContractDocumentSchema>;

function classifySingleCheck(token: string): ContractCheck {
  const cleaned = token.trim().replace(/^`|`$/g, "").trim();
  const lower = cleaned.toLowerCase();

  if (lower.startsWith("file:")) {
    const val = cleaned.slice(5).trim().replace(/^`|`$/g, "").trim();
    return { kind: "file", value: val, raw: token.trim() };
  }
  if (lower.startsWith("manual:")) {
    const val = cleaned.slice(7).trim();
    return { kind: "manual", value: val || "manual verification", raw: token.trim() };
  }
  if (lower.startsWith("run:")) {
    const val = cleaned.slice(4).trim().replace(/^`|`$/g, "").trim();
    return { kind: "command", value: val, raw: token.trim() };
  }

  // Heuristic for prose like "captura `evidence/signup.png`" or "screenshot `preview/ui.png`"
  const fileMatch = token.match(
    /(?:captura|screenshot|artifact|archivo|file|evidence|image|video|audio)\s+`([^`]+)`/i
  );
  if (fileMatch?.[1]) {
    return { kind: "file", value: fileMatch[1].trim(), raw: token.trim() };
  }

  // If raw token was a backticked path with no spaces and common artifact extension/prefix
  const rawTrimmed = token.trim();
  if (
    /^`[^`\s]+`$/.test(rawTrimmed) &&
    (/^(\.?\/)?(preview|\.agents\/evidence|evidence|output)\//.test(cleaned) ||
      /\.(png|jpe?g|webp|gif|mp4|webm|wav|mp3|pdf)$/i.test(cleaned))
  ) {
    return { kind: "file", value: cleaned, raw: rawTrimmed };
  }

  return { kind: "command", value: cleaned, raw: rawTrimmed };
}

function parseChecksLine(rawLine: string): ContractCheck[] {
  const parts = rawLine
    .split(/\s+\+\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.map(classifySingleCheck);
}

/**
 * Extracts a structured delivery contract from a Markdown file (`SPEC.md` or team contract file).
 * Recognizes `## Contract` / `## Contrato` sections with `- REQ-N ...` entries and `Check:` / `Comprobación:` lines.
 */
export function parseContractFromMarkdown(
  markdown: string,
  sourcePath: string
): ContractDocument {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  let title = "Delivery Contract";

  const h1 = lines.find((l) => /^#\s+/.test(l));
  if (h1) {
    title = h1.replace(/^#\s+/, "").trim();
  }

  let inContractSection = false;
  let foundNamedContractHeading = false;
  const sectionLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(?:\d+\.\s*)?(.*)$/);
    if (headingMatch?.[1]) {
      const headingText = headingMatch[1].trim();
      if (/^(contract|contrato)\b/i.test(headingText)) {
        inContractSection = true;
        foundNamedContractHeading = true;
        const suffix = headingText.replace(/^(contract|contrato)\s*[:\-–—]?\s*/i, "").trim();
        if (suffix) {
          title = suffix;
        }
        continue;
      }
      if (inContractSection) {
        break;
      }
    }
    if (inContractSection) {
      sectionLines.push(line);
    }
  }

  const scanLines = foundNamedContractHeading ? sectionLines : lines;
  const requirements: ContractRequirement[] = [];
  const outOfScope: string[] = [];
  let currentReq: ContractRequirement | null = null;

  for (const rawLine of scanLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const outMatch = trimmed.match(/^-\s+(?:out of scope|fuera de alcance)\s*:\s*(.+)$/i);
    if (outMatch?.[1]) {
      if (currentReq) {
        requirements.push(currentReq);
        currentReq = null;
      }
      outOfScope.push(outMatch[1].trim());
      continue;
    }

    const reqMatch = trimmed.match(
      /^-\s+(?:\*\*)?(REQ-[A-Za-z0-9_-]+)(?:\*\*)?\s*[:\-–—]?\s*(.+)$/i
    );
    if (reqMatch?.[1] && reqMatch[2]) {
      if (currentReq) {
        requirements.push(currentReq);
      }
      let desc = reqMatch[2].trim();
      const inlineChecks: ContractCheck[] = [];
      const inlineCheckMatch = desc.match(/\((?:check|comprobaci[oó]n)\s*:\s*([^)]+)\)\s*$/i);
      if (inlineCheckMatch?.[1]) {
        inlineChecks.push(...parseChecksLine(inlineCheckMatch[1]));
        desc = desc.slice(0, inlineCheckMatch.index).trim();
      }
      currentReq = {
        id: reqMatch[1].toUpperCase(),
        description: desc,
        checks: inlineChecks,
      };
      continue;
    }

    if (currentReq) {
      const checkLineMatch = trimmed.match(
        /^(?:-\s+)?(?:\*\*)?(?:check|checks|comprobaci[oó]n|comprobaciones|verificaci[oó]n)(?:\*\*)?\s*:\s*(.+)$/i
      );
      if (checkLineMatch?.[1]) {
        currentReq.checks.push(...parseChecksLine(checkLineMatch[1]));
        continue;
      }
      const riskLineMatch = trimmed.match(
        /^(?:-\s+)?(?:\*\*)?(?:risk|riesgo)(?:\*\*)?\s*:\s*(.+)$/i
      );
      if (riskLineMatch?.[1]) {
        currentReq.risk = riskLineMatch[1].trim();
      }
    }
  }

  if (currentReq) {
    requirements.push(currentReq);
  }

  return ContractDocumentSchema.parse({
    schemaVersion: "1.0.0",
    title,
    requirements,
    outOfScope,
    sourcePath,
  });
}

/** Renders a structured contract section in English or Spanish Markdown. */
export function renderContractMarkdown(doc: ContractDocument, lang: "en" | "es" = "en"): string {
  const isEs = lang === "es";
  const heading = isEs ? `## Contrato: ${doc.title}` : `## Contract: ${doc.title}`;
  const checkLabel = isEs ? "Comprobación" : "Check";
  const riskLabel = isEs ? "Riesgo" : "Risk";
  const outLabel = isEs ? "Fuera de alcance" : "Out of scope";

  const lines: string[] = [heading];
  for (const req of doc.requirements) {
    lines.push(`- ${req.id} ${req.description}`);
    if (req.checks.length > 0) {
      lines.push(`  ${checkLabel}: ${req.checks.map((c) => c.raw).join(" + ")}`);
    }
    if (req.risk) {
      lines.push(`  ${riskLabel}: ${req.risk}`);
    }
  }
  if (doc.outOfScope.length > 0) {
    lines.push(`- ${outLabel}: ${doc.outOfScope.join("; ")}`);
  }
  lines.push("");
  return lines.join("\n");
}
