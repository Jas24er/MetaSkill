export function calculateInvoiceTotal(subtotalCents: number, taxRate: number): number {
  if (!Number.isInteger(subtotalCents) || subtotalCents < 0) {
    throw new Error("subtotalCents must be a non-negative integer");
  }
  return Math.round(subtotalCents * (1 + taxRate));
}
