import assert from "node:assert/strict";
import test from "node:test";
import { startServer } from "../src/server.mjs";

test("returns 404 for unknown route", async () => {
  const server = await startServer(0);
  try {
    const addr = server.address();
    const res = await fetch(`http://127.0.0.1:${addr.port}/missing`);
    assert.equal(res.status, 404);
  } finally {
    server.close();
  }
});
