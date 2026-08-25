import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { extractBrainDump } from "../server/ai";

const providerReady = Boolean(process.env.GEMINI_API_KEY);

describe("Dexus Brain Dump goal extraction", () => {
  it.runIf(providerReady)("detects explicit long-term goals separately from actions", async () => {
    const result = await extractBrainDump({
      text: "My goals are to earn a 9.0 GPA this semester and build a strong software engineering portfolio by December 2026. This week I need to choose two portfolio projects.",
      timezone: "Asia/Kolkata",
    });

    expect(result.goals.length).toBeGreaterThanOrEqual(2);
    expect(result.goals.some((goal) => goal.title.toLowerCase().includes("gpa"))).toBe(true);
    expect(result.goals.some((goal) => goal.title.toLowerCase().includes("portfolio"))).toBe(true);
    expect(result.tasks.some((task) => task.title.toLowerCase().includes("portfolio projects"))).toBe(true);
  }, 45_000);

  it("explains that a zero-item review cannot answer questions about goals saved earlier", () => {
    const source = readFileSync("/home/ubuntu/dexus-mobile-v2/components/dexus/brain-dump.tsx", "utf8");
    expect(source).toContain("No new items to save");
    expect(source).toContain("Ask about saved goals");
    expect(source).toContain('router.push("/insights")');
  });
});
