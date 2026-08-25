import { afterEach, describe, expect, it, vi } from "vitest";

import { verifySupabaseAccessToken } from "../server/_core/sdk";

afterEach(() => vi.unstubAllGlobals());

describe("Dexus Supabase token verification", () => {
  it("accepts an email-confirmed Supabase user only after requesting the Auth user endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "5b2c8c60-ec98-45e3-b4a4-e5c0d10ca721",
      email: "dexus.user@example.test",
      email_confirmed_at: "2026-08-24T00:00:00.000Z",
      user_metadata: { full_name: "Dexus User" },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifySupabaseAccessToken("valid-access-token")).resolves.toEqual({
      subject: "5b2c8c60-ec98-45e3-b4a4-e5c0d10ca721",
      email: "dexus.user@example.test",
      name: "Dexus User",
    });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/auth/v1/user"), expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer valid-access-token" }),
    }));
  });

  it("rejects a token when Supabase returns an unverified email identity", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "5b2c8c60-ec98-45e3-b4a4-e5c0d10ca721",
      email: "pending@example.test",
      email_confirmed_at: null,
    }), { status: 200 })));

    await expect(verifySupabaseAccessToken("unconfirmed-token")).rejects.toMatchObject({
      message: "Verify your email before accessing Dexus.",
    });
  });

  it("rejects invalid or expired Supabase tokens", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 })));
    await expect(verifySupabaseAccessToken("expired-token")).rejects.toMatchObject({
      message: "Your Dexus session is invalid or expired.",
    });
  });
});
