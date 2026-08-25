import { describe, expect, it } from "vitest";

const geminiApiKey = process.env.GEMINI_API_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

describe("portable provider credentials", () => {
  it.runIf(Boolean(geminiApiKey))("authenticates the Gemini API key without exposing it", async () => {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: { "x-goog-api-key": geminiApiKey! },
    });

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
    expect(response.ok).toBe(true);
  });

  it.runIf(Boolean(supabaseUrl && supabaseSecretKey))(
    "authenticates the Supabase Secret key for server-side storage operations without exposing it",
    async () => {
      const response = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
        headers: {
          apikey: supabaseSecretKey!,
          Authorization: `Bearer ${supabaseSecretKey}`,
        },
      });

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
      expect(response.ok).toBe(true);
    },
  );
});
