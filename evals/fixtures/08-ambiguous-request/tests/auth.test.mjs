import assert from "node:assert/strict";
import test from "node:test";
import { authenticateUser } from "../src/auth.mjs";

test("rejects empty credentials", async () => {
  const res = await authenticateUser("", "");
  assert.equal(res.ok, false);
});
