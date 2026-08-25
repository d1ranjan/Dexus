import { describe, expect, it } from "vitest";

const repository = "d1ranjan/Dexus";
const token = process.env.GITHUB_DEXUS_REPO_TOKEN;

describe("Dexus GitHub repository token", () => {
  it("authenticates to the scoped repository without exposing the token", async () => {
    expect(token).toBeTruthy();

    const response = await fetch(`https://api.github.com/repos/${repository}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
    expect(response.ok).toBe(true);
    const payload = (await response.json()) as { full_name?: string };
    expect(payload.full_name).toBe(repository);
  });
});
