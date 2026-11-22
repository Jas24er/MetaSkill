export function getClientHeaders() {
  const apiKey = process.env.SERVICE_API_KEY ?? "";
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}
