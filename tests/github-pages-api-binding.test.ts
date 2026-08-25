import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8");

describe("GitHub Pages production API binding", () => {
  it("pins the static Pages build to the verified Render API", () => {
    const appConfig = read("app.config.ts");
    const oauth = read("constants/oauth.ts");

    expect(appConfig).toContain('const githubPagesApiBaseUrl = "https://dexus-api.onrender.com";');
    expect(oauth).toContain('const GITHUB_PAGES_ORIGIN = "https://d1ranjan.github.io";');
    expect(oauth).toContain('const GITHUB_PAGES_API_BASE_URL = "https://dexus-api.onrender.com";');
    expect(oauth).toContain("isGitHubPages ? GITHUB_PAGES_API_BASE_URL : \"\"");
  });

  it("does not retain the old localhost API fallback in the production binding", () => {
    const appConfig = read("app.config.ts");
    const oauth = read("constants/oauth.ts");

    expect(appConfig).not.toContain("http://localhost:3000");
    expect(oauth).not.toContain("http://localhost:3000");
  });
});
