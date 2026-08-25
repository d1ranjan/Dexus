import { describe, expect, it } from "vitest";

type SupabaseAuthSettings = {
  disable_signup?: boolean;
  mailer_autoconfirm?: boolean;
  external?: {
    email?: boolean;
  };
};

describe("Supabase Auth configuration", () => {
  it("accepts the configured publishable credentials and has Dexus email auth enabled", async () => {
    const projectUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
    const publishableKey = process.env.SUPABASE_KEY;

    expect(projectUrl, "SUPABASE_URL must be configured").toBeTruthy();
    expect(publishableKey, "SUPABASE_KEY must be configured").toBeTruthy();

    const response = await fetch(`${projectUrl}/auth/v1/settings`, {
      headers: { apikey: publishableKey! },
    });

    expect(response.status, "Supabase credentials must authenticate to the Auth settings endpoint").toBe(200);

    const settings = (await response.json()) as SupabaseAuthSettings;
    expect(settings.external?.email, "Email/password auth must be enabled").toBe(true);
    expect(settings.disable_signup, "New Dexus users must be allowed to register").toBe(false);
    expect(settings.mailer_autoconfirm, "Dexus registration must require email verification").toBe(false);
  });
});
