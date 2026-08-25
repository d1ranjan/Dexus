import "react-native-url-polyfill/auto";

import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { createClient, type SupportedStorage } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

import { SUPABASE_SESSION_KEY } from "@/constants/oauth";

type DexusExtra = {
  supabaseUrl?: string;
  supabasePublishableKey?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as DexusExtra;
const supabaseUrl = extra.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabasePublishableKey =
  extra.supabasePublishableKey ?? process.env.EXPO_PUBLIC_SUPABASE_KEY ?? "";

const nativeStorage: SupportedStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

const webStorage: SupportedStorage = {
  getItem: (key) => (typeof window === "undefined" ? null : window.localStorage.getItem(key)),
  setItem: (key, value) => {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  },
};

/**
 * Supabase’s publishable key is intentionally used here. Service-role keys
 * remain server-only and are not needed for Dexus’s email/password flow.
 */
export const supabase = createClient(
  supabaseUrl || "https://invalid-dexus-supabase-url.supabase.co",
  supabasePublishableKey || "invalid-dexus-supabase-publishable-key",
  {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: Platform.OS === "web" ? webStorage : nativeStorage,
      storageKey: SUPABASE_SESSION_KEY,
    },
  },
);

if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
