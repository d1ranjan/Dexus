import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SESSION_STORAGE_KEY = "dexus-auth-session-v1";

export type DexusStoredSession = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
};

function isSession(value: unknown): value is DexusStoredSession {
  return typeof value === "object" && value !== null &&
    typeof (value as DexusStoredSession).access_token === "string" &&
    typeof (value as DexusStoredSession).refresh_token === "string";
}

export async function getDexusSession(): Promise<DexusStoredSession | null> {
  try {
    const raw = Platform.OS === "web" ? window.localStorage.getItem(SESSION_STORAGE_KEY) : await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session: unknown = JSON.parse(raw);
    return isSession(session) ? session : null;
  } catch {
    return null;
  }
}

export async function setDexusSession(session: DexusStoredSession) {
  const serialized = JSON.stringify(session);
  if (Platform.OS === "web") {
    window.localStorage.setItem(SESSION_STORAGE_KEY, serialized);
    return;
  }
  await SecureStore.setItemAsync(SESSION_STORAGE_KEY, serialized);
}

export async function clearDexusSession() {
  if (Platform.OS === "web") {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
}

export async function getDexusAccessToken() {
  return (await getDexusSession())?.access_token ?? null;
}
