export function applyDiscount(priceCents, discountPct) {
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    throw new Error("Invalid price");
  }
  // Bug: treats discountPct as raw cents instead of percentage
  return Math.max(0, priceCents - discountPct);
}
