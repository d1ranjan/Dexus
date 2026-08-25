export type DexusCallbackParams = {
  accessToken: string | null;
  refreshToken: string | null;
  code: string | null;
  type: string | null;
  error: string | null;
};

/** Parses Supabase implicit-flow fragments and query parameters without logging credentials. */
export function parseDexusCallbackUrl(url: string): DexusCallbackParams {
  const hashIndex = url.indexOf("#");
  const beforeHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const hash = hashIndex >= 0 ? new URLSearchParams(url.slice(hashIndex + 1)) : new URLSearchParams();
  const queryStart = beforeHash.indexOf("?");
  const query = new URLSearchParams(queryStart >= 0 ? beforeHash.slice(queryStart + 1) : "");
  return {
    accessToken: hash.get("access_token") ?? query.get("access_token"),
    refreshToken: hash.get("refresh_token") ?? query.get("refresh_token"),
    code: query.get("code"),
    type: hash.get("type") ?? query.get("type"),
    error: hash.get("error_description") ?? query.get("error_description"),
  };
}
