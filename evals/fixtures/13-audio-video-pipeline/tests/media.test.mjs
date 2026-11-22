import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateMediaTarget } from "../scripts/media-check.mjs";

test("validates media target brief without mutating inputs", () => {
  const brief = JSON.parse(readFileSync(new URL("../inputs/media-brief.json", import.meta.url), "utf8"));
  const res = validateMediaTarget(brief);
  assert.equal(res.ok, true, res.errors.join("; "));
});
