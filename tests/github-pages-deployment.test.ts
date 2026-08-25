import { readFileSync } from "node:fs";
import { once } from "node:events";
import express from "express";
import { createServer } from "node:http";
import { describe, expect, it } from "vitest";
import { createCorsMiddleware, getAllowedCorsOrigins, isAllowedCorsOrigin } from "../server/_core/cors";

const projectFile = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8");

describe("Dexus GitHub Pages deployment contract", () => {
  it("uses the repository subpath for the static export and branded email callback", () => {
    const appConfig = projectFile("app.config.ts");
    const oauth = projectFile("constants/oauth.ts");

    expect(appConfig).toContain('const webBasePath = githubPagesBuild ? "/Dexus" : "";');
    expect(appConfig).toContain("baseUrl: webBasePath");
    expect(oauth).toContain("webBasePath");
    expect(oauth).toContain("callbackPath");
  });

  it("keeps the public static deployment frontend-only and free of embedded backend configuration", () => {
    const appConfig = projectFile("app.config.ts");
    const deploymentGuide = projectFile("GITHUB_PAGES_DEPLOYMENT.md");

    expect(appConfig).toContain("DEXUS_DEPLOY_TARGET === \"github-pages\"");
    expect(deploymentGuide).toContain("does not include `EXPO_PUBLIC_API_BASE_URL`");
    expect(deploymentGuide).toContain("does not create a new API");
  });

  it("documents the branch-based Pages fallback when workflow-file permissions are unavailable", () => {
    const deploymentGuide = projectFile("GITHUB_PAGES_DEPLOYMENT.md");

    expect(deploymentGuide).toContain("`gh-pages` branch");
    expect(deploymentGuide).toContain("Deploy from a branch");
    expect(deploymentGuide).toContain("`.nojekyll`");
  });

  it("permits only explicitly configured browser origins for credentialed CORS", () => {
    const allowedOrigins = getAllowedCorsOrigins(
      "https://d1ranjan.github.io, https://dexusai-zzil53tz.manus.space",
    );

    expect(isAllowedCorsOrigin("https://d1ranjan.github.io", allowedOrigins)).toBe(true);
    expect(isAllowedCorsOrigin("https://d1ranjan.github.io.evil.example", allowedOrigins)).toBe(false);
    expect(isAllowedCorsOrigin("https://untrusted.example", allowedOrigins)).toBe(false);
    expect(isAllowedCorsOrigin(undefined, allowedOrigins)).toBe(false);
  });

  it("applies the configured server-only origin list to a lightweight health endpoint", async () => {
    const configuredOrigins = process.env.CORS_ALLOWED_ORIGINS;
    expect(configuredOrigins).toBeTruthy();

    const app = express();
    app.use(createCorsMiddleware(getAllowedCorsOrigins(configuredOrigins)));
    app.get("/api/health", (_req, res) => res.json({ ok: true }));
    const server = createServer(app);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");

    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Expected a TCP listener");
      const response = await fetch(`http://127.0.0.1:${address.port}/api/health`, {
        headers: { Origin: "https://d1ranjan.github.io" },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("access-control-allow-origin")).toBe("https://d1ranjan.github.io");
      expect(response.headers.get("access-control-allow-credentials")).toBe("true");
    } finally {
      server.close();
      await once(server, "close");
    }
  });
});
