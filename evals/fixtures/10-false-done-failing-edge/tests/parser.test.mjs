import assert from "node:assert/strict";
import test from "node:test";
import { parseTags } from "../src/parser.mjs";

test("parses comma-separated tags", () => {
  assert.deepEqual(parseTags("web, api"), ["web", "api"]);
});
