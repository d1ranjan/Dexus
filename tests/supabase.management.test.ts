import { describe, expect, it } from "vitest";

const managementToken = process.env.SUPABASE_MANAGEMENT_ACCESS_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL;
const productionSiteUrl = "https://d1ranjan.github.io/Dexus";
const productionCallbackUrl = `${productionSiteUrl}/auth/callback`;
const nativeCallbackPattern = "dexusdexusmobilev2://**";

function getProjectRef() {
  return new URL(supabaseUrl!).hostname.split(".")[0];
}

describe("Supabase Management API credential", () => {
  it.runIf(Boolean(managementToken))("authenticates to the project-management API", async () => {
    const response = await fetch("https://api.supabase.com/v1/projects", {
      headers: { Authorization: `Bearer ${managementToken}` },
    });

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
    expect(response.ok).toBe(true);
  });

  it.runIf(Boolean(managementToken && supabaseUrl))("uses branded Dexus Auth redirects instead of localhost", async () => {
    const response = await fetch(`https://api.supabase.com/v1/projects/${getProjectRef()}/config/auth`, {
      headers: { Authorization: `Bearer ${managementToken}` },
    });

    expect(response.ok).toBe(true);
    const config = (await response.json()) as { site_url?: string; uri_allow_list?: string };
    expect(config.site_url).toBe(productionSiteUrl);
    expect(config.uri_allow_list ?? "").toContain(productionCallbackUrl);
    expect(config.uri_allow_list ?? "").toContain(nativeCallbackPattern);
    expect(config.uri_allow_list ?? "").not.toContain("localhost");
  });
});
