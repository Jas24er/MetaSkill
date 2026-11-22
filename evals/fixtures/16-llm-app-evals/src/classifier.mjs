export function buildPrompt(userMessage) {
  return `Classify into billing, bug, or other: ${userMessage}`;
}

export function classifyTicket(userMessage) {
  const text = String(userMessage ?? "").toLowerCase();
  // Naive baseline: vulnerable to keyword injection and misses refund/crash wording
  if (text.includes("billing")) return { label: "billing", estimatedTokens: text.length / 4 };
  if (text.includes("bug")) return { label: "bug", estimatedTokens: text.length / 4 };
  return { label: "other", estimatedTokens: text.length / 4 };
}
