export function computeSubtotal(items) {
  return items.reduce((sum, item) => sum + Math.max(0, item.qty) * item.priceCents, 0);
}
