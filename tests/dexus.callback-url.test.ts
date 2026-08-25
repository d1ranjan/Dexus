import { describe, expect, it } from "vitest";
import { parseDexusCallbackUrl } from "../lib/auth-callback";

describe("Dexus Supabase callback URL parsing", () => {
  it("handles a GitHub Pages implicit confirmation link without exposing tokens", () => {
    const params = parseDexusCallbackUrl(
      "https://d1ranjan.github.io/Dexus/auth/callback#access_token=access-value&refresh_token=refresh-value&type=signup",
    );

    expect(params).toMatchObject({
      accessToken: "access-value",
      refreshToken: "refresh-value",
      type: "signup",
      error: null,
    });
  });

  it("routes a recovery link to the password-update flow", () => {
    const params = parseDexusCallbackUrl(
      "https://d1ranjan.github.io/Dexus/auth/callback#access_token=access-value&refresh_token=refresh-value&type=recovery",
    );

    expect(params.type).toBe("recovery");
    expect(params.accessToken).toBeTruthy();
    expect(params.refreshToken).toBeTruthy();
  });

  it("retains an explicit authorization code for a safe unsupported-flow error", () => {
    const params = parseDexusCallbackUrl(
      "https://d1ranjan.github.io/Dexus/auth/callback?code=single-use-code",
    );

    expect(params).toMatchObject({ code: "single-use-code", accessToken: null, refreshToken: null });
  });
});
