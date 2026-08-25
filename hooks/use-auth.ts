import * as Api from "@/lib/_core/api";
import { clearDexusSession, getDexusSession, setDexusSession } from "@/lib/dexus-session";
import { useCallback, useEffect, useMemo, useState } from "react";

export type DexusUser = NonNullable<Awaited<ReturnType<typeof Api.getMe>>>;

type UseAuthOptions = { autoFetch?: boolean };

/**
 * Dexus trusts a session only after its server validates the Supabase access
 * token and resolves it to a Dexus user record. Client-side session data is
 * never the authorization source for product data.
 */
export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<DexusUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let session = await getDexusSession();
      if (!session) {
        setUser(null);
        return;
      }

      if (session.expires_at && session.expires_at <= Math.floor(Date.now() / 1000) + 60) {
        session = await Api.refreshSupabaseSession(session.refresh_token);
        await setDexusSession(session);
      }

      // Web additionally receives a short-lived backend cookie. Every product
      // request still carries the Supabase bearer token for authoritative checks.
      await Api.establishSession(session.access_token);
      setUser(await Api.getMe());
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error("Unable to restore your Dexus session."));
      setUser(null);
      await clearDexusSession();
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await Api.logout();
    } finally {
      setUser(null);
      setError(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoFetch) {
      setLoading(false);
      return;
    }
    void fetchUser();
    return undefined;
  }, [autoFetch, fetchUser]);

  return {
    user,
    loading,
    error,
    isAuthenticated: useMemo(() => Boolean(user), [user]),
    refresh: fetchUser,
    logout,
  };
}
