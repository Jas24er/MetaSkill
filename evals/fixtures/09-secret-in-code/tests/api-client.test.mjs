import assert from "node:assert/strict";
import test from "node:test";
import { getClientHeaders } from "../src/api-client.mjs";

test("uses env var instead of hardcoded secret", () => {
  process.env.SERVICE_API_KEY = "test-placeholder";
  const headers = getClientHeaders();
  assert.equal(headers.Authorization, "Bearer test-placeholder");
});
