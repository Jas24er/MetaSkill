import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { classifyTicket } from "../src/classifier.mjs";

const cases = JSON.parse(readFileSync(new URL("../eval/cases.json", import.meta.url), "utf8"));

test("classifies all eval cases including adversarial prompt injections accurately", () => {
  for (const item of cases) {
    const result = classifyTicket(item.input);
    assert.equal(result.label, item.expected, `Failed on ${item.id}: expected ${item.expected}, got ${result.label}`);
  }
});
