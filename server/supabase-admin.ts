import { ENV } from "./_core/env";

function authAdminBaseUrl() {
  if (!ENV.supabaseUrl || !ENV.supabaseSecretKey) {
    throw new Error("Secure account deletion is temporarily unavailable.");
  }
  return `${ENV.supabaseUrl.replace(/\/+$/, "")}/auth/v1/admin`;
}

export async function deleteSupabaseAuthUser(userId: string): Promise<void> {
  const response = await fetch(`${authAdminBaseUrl()}/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: {
      apikey: ENV.supabaseSecretKey,
      Authorization: `Bearer ${ENV.supabaseSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ should_soft_delete: false }),
  });
  if (!response.ok) {
    throw new Error("Dexus removed your workspace data, but could not complete provider account removal. Please contact support before signing in again.");
  }
}
