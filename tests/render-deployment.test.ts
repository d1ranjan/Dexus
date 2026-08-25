import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getAllowedCorsOrigins } from "../server/_core/cors";
import { isAllowedDexusRedirect } from "../server/_core/oauth";

const projectFile = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8");

describe("Dexus Render deployment contract", () => {
  it("defines a portable free Node web service with a health check and no committed secret values", () => {
    const blueprint = projectFile("render.yaml");

    expect(blueprint).toContain("type: web");
    expect(blueprint).toContain("runtime: node");
    expect(blueprint).toContain("plan: free");
    expect(blueprint).toContain("buildCommand: npm install --global pnpm@9.12.0 && pnpm install --frozen-lockfile && pnpm build");
    expect(blueprint).toContain("startCommand: pnpm start");
    expect(blueprint).toContain("healthCheckPath: /api/health");
    for (const secretKey of ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_KEY", "OWNER_SUPABASE_USER_ID"]) {
      expect(blueprint).toContain(`- key: ${secretKey}\n        sync: false`);
    }
  });

  it("only permits confirmation and recovery redirects from the configured Pages origin", () => {
    const allowedOrigins = getAllowedCorsOrigins("https://d1ranjan.github.io");
    const pagesCallback = "https://d1ranjan.github.io/Dexus/auth/callback";

    expect(isAllowedDexusRedirect("https://d1ranjan.github.io", pagesCallback, allowedOrigins, "https://d1ranjan.github.io/Dexus")).toBe(pagesCallback);
    expect(isAllowedDexusRedirect("https://untrusted.example", "https://untrusted.example/auth/callback", allowedOrigins, "https://d1ranjan.github.io/Dexus")).toBeUndefined();
    expect(isAllowedDexusRedirect("https://d1ranjan.github.io", "https://d1ranjan.github.io/other/auth/callback", allowedOrigins, "https://d1ranjan.github.io/Dexus")).toBeUndefined();
  });
});
