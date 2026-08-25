import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { brainDumpSystemInstruction } from "../server/ai";

describe("Dexus Brain Dump goal regression", () => {
  it("instructs the extractor to preserve explicit goals without dates or categories", () => {
    const instruction = brainDumpSystemInstruction("Asia/Kolkata");
    expect(instruction).toContain("goal is a desired outcome");
    expect(instruction).toContain("explicitly says “goal”, “target”, “aim”, “want to”, or “working toward”");
    expect(instruction).toContain("Never leave an explicit user-stated goal unrepresented");
  });

  it("routes saved-goal questions away from a zero-item creation review", () => {
    const source = readFileSync("/home/ubuntu/dexus-mobile-v2/components/dexus/brain-dump.tsx", "utf8");
    expect(source).toContain("No new items to save");
    expect(source).toContain("Ask about saved goals");
    expect(source).toContain('router.push("/insights")');
  });
});
