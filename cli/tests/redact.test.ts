import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { redactDeep, redactLocalPaths } from "../src/utils/redact.js";

describe("local path redaction for published eval results", () => {
  it("replaces temp, home, and user-profile paths in both slash styles", () => {
    const tmpFile = path.join(os.tmpdir(), "mtsk-eval-x", "a.mjs");
    const input = [
      `at ${tmpFile}`,
      `at file:///${tmpFile.replaceAll("\\", "/")}`,
      "C:\\Users\\someone\\proj\\x.js",
      "/Users/someone/proj",
      "/home/someone/proj",
    ].join("\n");
    const out = redactLocalPaths(input);
    expect(out).not.toContain(os.tmpdir());
    expect(out).not.toMatch(/someone/);
    expect(out).toContain("<TMP>");
    expect(out).toContain("<HOME>");
  });

  it("redacts nested strings without touching other values", () => {
    const value = { a: 1, b: ["/home/someone/x"], c: { d: null, e: "ok" } };
    expect(redactDeep(value)).toEqual({ a: 1, b: ["<HOME>/x"], c: { d: null, e: "ok" } });
  });
});
