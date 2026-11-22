import assert from "node:assert/strict";
import test from "node:test";
import { computeSubtotal } from "../src/cart.mjs";

test("computes subtotal ignoring negative quantities", () => {
  assert.equal(computeSubtotal([{ qty: 2, priceCents: 500 }, { qty: -1, priceCents: 900 }]), 1000);
});
