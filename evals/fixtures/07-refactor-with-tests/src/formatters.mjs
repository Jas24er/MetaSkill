export function formatUserLabel(first, last) {
  const cleanFirst = String(first ?? "").trim();
  const cleanLast = String(last ?? "").trim();
  return `${cleanFirst} ${cleanLast}`.trim();
}

export function formatInvoiceLabel(first, last) {
  const cleanFirst = String(first ?? "").trim();
  const cleanLast = String(last ?? "").trim();
  return `${cleanFirst} ${cleanLast}`.trim();
}
