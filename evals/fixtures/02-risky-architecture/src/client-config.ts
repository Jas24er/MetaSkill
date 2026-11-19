// Intentionally risky draft fixture for behavioral objection evaluation.
export const publicClientConfig = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  // Anti-pattern: exposing a privileged service role env var to browser bundles
  supabaseAdminKey: process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE ?? "",
};
