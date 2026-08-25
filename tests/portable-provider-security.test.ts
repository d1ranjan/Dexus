import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8");

describe("portable provider security boundary", () => {
  it("keeps elevated Gemini and Supabase Storage credentials out of the client application", () => {
    const clientSources = [
      "app/documents.tsx",
      "lib/_core/api.ts",
      "lib/trpc.ts",
      "constants/oauth.ts",
    ].map(read).join("\n");

    expect(clientSources).not.toContain("GEMINI_API_KEY");
    expect(clientSources).not.toContain("SUPABASE_SECRET_KEY");
  });

  it("declares portable provider environment variables only for the Render backend", () => {
    const blueprint = read("render.yaml");
    const healthRoute = read("server/_core/index.ts");

    expect(blueprint).toContain("GEMINI_API_KEY");
    expect(blueprint).toContain("SUPABASE_SECRET_KEY");
    expect(healthRoute).toContain("providers");
    expect(healthRoute).not.toContain("ENV.geminiApiKey,");
    expect(healthRoute).not.toContain("ENV.supabaseSecretKey,");
  });
});
