import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("orders table SQL migration exists", () => {
  const sql = readFileSync(new URL("../migrations/001_orders.sql", import.meta.url), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS orders/i);
});
