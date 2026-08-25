import * as Linking from "expo-linking";
import Constants from "expo-constants";
import * as ReactNative from "react-native";

// Keep this in sync with app.config.ts. The custom scheme is registered in the
// native builds and is used only for Supabase confirmation/recovery callbacks.
const bundleId = "com.app.dexusmobilev2";
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `dexus${timestamp}`;
const GITHUB_PAGES_ORIGIN = "https://d1ranjan.github.io";
const GITHUB_PAGES_API_BASE_URL = "https://dexus-api.onrender.com";
const expoExtra = (Constants.expoConfig?.extra ?? {}) as {
  apiBaseUrl?: string;
  webBasePath?: string;
};

const isGitHubPages = ReactNative.Platform.OS === "web"
  && typeof window !== "undefined"
  && window.location.origin === GITHUB_PAGES_ORIGIN;

const env = {
  // Expo embeds app.config.ts extra values into the browser bundle. This keeps
  // the API route deterministic even when the preview host format changes.
  apiBaseUrl: expoExtra.apiBaseUrl
    ?? process.env.EXPO_PUBLIC_API_BASE_URL
    ?? (isGitHubPages ? GITHUB_PAGES_API_BASE_URL : ""),
  webBasePath: expoExtra.webBasePath ?? (isGitHubPages ? "/Dexus" : ""),
  deepLinkScheme: schemeFromBundleId,
};

export const API_BASE_URL = env.apiBaseUrl;

/**
 * Get the API base URL, deriving from current hostname if not set.
 * Metro runs on 8081, API server runs on 3000.
 * URL pattern: https://PORT-sandboxid.region.domain
 */
export function getApiBaseUrl(): string {
  // If API_BASE_URL is set, use it
  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/$/, "");
  }

  // On web, derive from current hostname by replacing port 8081 with 3000
  if (ReactNative.Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const { protocol, hostname } = window.location;
    // Pattern: 8081-sandboxid.region.domain -> 3000-sandboxid.region.domain
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) {
      return `${protocol}//${apiHostname}`;
    }
  }

  // Fallback to empty (will use relative URL)
  return "";
}

export const USER_INFO_KEY = "dexus-user-info";
export const SUPABASE_SESSION_KEY = "dexus-supabase-session";
export const DEXUS_AUTH_CALLBACK_PATH = "auth/callback";

/**
 * Exact callback used for verification and password-recovery emails. It is
 * Supabase allow-listable and routes directly into a branded Dexus screen.
 */
export function getSupabaseRedirectUrl() {
  // Expo Go uses an exp:// development URL and cannot register Dexus’s custom
  // scheme for email links. Web preview therefore has an explicit HTTPS route;
  // native confirmation/recovery links are supported in development or release
  // builds where app.config.ts registers the Dexus scheme with the OS.
  if (ReactNative.Platform.OS === "web" && typeof window !== "undefined") {
    const basePath = env.webBasePath.replace(/^\/+|\/+$/g, "");
    const callbackPath = [basePath, DEXUS_AUTH_CALLBACK_PATH].filter(Boolean).join("/");
    return `${window.location.origin}/${callbackPath}`;
  }
  return Linking.createURL(DEXUS_AUTH_CALLBACK_PATH, {
    scheme: env.deepLinkScheme,
  });
}
