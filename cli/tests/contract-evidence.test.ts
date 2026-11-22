import { describe, expect, it } from "vitest";
import {
  EvidenceReportSchema,
  parseContractFromMarkdown,
  renderContractMarkdown,
  renderEvidenceReportMarkdown,
} from "../src/schemas/index.js";

describe("Contract & Evidence Report schemas", () => {
  it("parses English and Spanish SPEC.md Contract sections with command, file, and manual checks", () => {
    const md = [
      "# Signup Flow",
      "",
      "## Contrato: Registro",
      "- REQ-1 El usuario puede registrarse con email y contraseña.",
      "  Comprobación: `npm test -- signup` + `file: .agents/evidence/signup.png`",
      "- REQ-2 Un email repetido muestra un error claro.",
      "  Comprobación: manual: Probar caso duplicado en UI",
      "- Fuera de alcance: recuperación de contraseña.",
      "",
    ].join("\n");

    const parsed = parseContractFromMarkdown(md, "SPEC.md");
    expect(parsed.title).toBe("Registro");
    expect(parsed.requirements).toHaveLength(2);
    expect(parsed.requirements[0]?.id).toBe("REQ-1");
    expect(parsed.requirements[0]?.checks.map((c) => c.kind)).toEqual(["command", "file"]);
    expect(parsed.requirements[0]?.checks[0]?.value).toBe("npm test -- signup");
    expect(parsed.requirements[0]?.checks[1]?.value).toBe(".agents/evidence/signup.png");
    expect(parsed.requirements[1]?.checks[0]?.kind).toBe("manual");
    expect(parsed.outOfScope).toEqual(["recuperación de contraseña."]);

    const renderedEn = renderContractMarkdown(parsed, "en");
    expect(renderedEn).toContain("## Contract: Registro");
    expect(renderedEn).toContain("- REQ-1");
    expect(renderedEn).toContain("- Out of scope:");
  });

  it("validates and renders EvidenceReport Markdown tables in EN and ES", () => {
    const report = EvidenceReportSchema.parse({
      schemaVersion: "1.0.0",
      generatedAt: "2026-11-21T22:40:00.000Z",
      contractPath: "SPEC.md",
      contractHash: "abc123",
      title: "Registration Form",
      overallStatus: "incomplete",
      requirements: [
        {
          id: "REQ-1",
          description: "User registers cleanly",
          status: "verified",
          evidence: ["`npm test -- signup` OK"],
          checkResults: [
            { raw: "`npm test -- signup`", kind: "command", ok: true, exitCode: 0, durationMs: 120 },
          ],
        },
        {
          id: "REQ-2",
          description: "Duplicate email error",
          status: "pending",
          evidence: ["Missing e2e test"],
          checkResults: [{ raw: "manual: e2e", kind: "manual", ok: false }],
        },
      ],
      reviewerRisks: ["Password minimum length not enforced."],
      summary: { verified: 1, pending: 1, blocked: 0 },
    });

    const mdEs = renderEvidenceReportMarkdown(report, "es");
    expect(mdEs).toContain("## Informe de evidencia — Registration Form");
    expect(mdEs).toContain("| Requisito | Estado | Evidencia |");
    expect(mdEs).toContain("`verified`");
    expect(mdEs).toContain("`pending`");
    expect(mdEs).toContain("Password minimum length not enforced.");

    const mdEn = renderEvidenceReportMarkdown(report, "en");
    expect(mdEn).toContain("## Evidence Report — Registration Form");
    expect(mdEn).toContain("Risks detected by the reviewer:");
  });
});
