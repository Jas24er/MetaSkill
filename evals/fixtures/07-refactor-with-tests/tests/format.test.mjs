import assert from "node:assert/strict";
import test from "node:test";
import { formatInvoiceLabel, formatUserLabel } from "../src/formatters.mjs";

test("formats labels cleanly", () => {
  assert.equal(formatUserLabel(" Ada ", " Lovelace "), "Ada Lovelace");
  assert.equal(formatInvoiceLabel(" Grace ", " Hopper "), "Grace Hopper");
});
