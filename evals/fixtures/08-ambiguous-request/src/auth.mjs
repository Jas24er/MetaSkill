export async function authenticateUser(email, password) {
  // Stub implementation
  if (!email || !password) {
    return { ok: false };
  }
  return { ok: true, user: { email } };
}
