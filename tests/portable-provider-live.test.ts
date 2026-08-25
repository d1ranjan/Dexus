import { describe, expect, it } from "vitest";
import { extractBrainDump } from "../server/ai";
import { storageDelete, storageGetSignedUrl, storagePut } from "../server/storage";

const providerReady = Boolean(process.env.GEMINI_API_KEY && process.env.SUPABASE_SECRET_KEY && process.env.SUPABASE_URL);

describe("portable Gemini and Supabase Storage providers", () => {
  it.runIf(providerReady)("extracts a safe structured Brain Dump through Gemini", async () => {
    const result = await extractBrainDump({
      text: "Please remind me to call Maya about the Dexus demo on 2026-12-31. This is only an automated provider test.",
      timezone: "UTC",
    });

    expect(Array.isArray(result.tasks)).toBe(true);
    expect(Array.isArray(result.goals)).toBe(true);
    expect(Array.isArray(result.people)).toBe(true);
    expect(result.tasks.some((task) => task.title.toLowerCase().includes("maya"))).toBe(true);
  }, 45_000);

  it.runIf(providerReady)("stores, privately reads, and removes a temporary Supabase document", async () => {
    const content = "Dexus portable private-storage regression";
    const stored = await storagePut(`provider-tests/${crypto.randomUUID()}.txt`, content, "text/plain");
    try {
      expect(stored.url).toMatch(/^private:\/\/dexus-documents\//);
      const signedUrl = await storageGetSignedUrl(stored.key);
      const response = await fetch(signedUrl);
      expect(response.ok).toBe(true);
      expect(await response.text()).toBe(content);
    } finally {
      await storageDelete(stored.key);
    }
  }, 45_000);
});
