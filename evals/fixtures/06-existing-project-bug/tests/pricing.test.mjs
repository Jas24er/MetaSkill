import assert from "node:assert/strict";
import test from "node:test";
import { applyDiscount } from "../src/pricing.mjs";

test("applies 20% discount to 1000 cents", () => {
  assert.equal(applyDiscount(1000, 20), 800);
});
