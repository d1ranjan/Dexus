import { describe, expect, it } from "vitest";
import { isTransientGeminiStatus } from "../server/gemini";

describe("Gemini retry classification", () => {
  it("retries only temporary provider and quota responses", () => {
    expect(isTransientGeminiStatus(429)).toBe(true);
    expect(isTransientGeminiStatus(500)).toBe(true);
    expect(isTransientGeminiStatus(503)).toBe(true);
    expect(isTransientGeminiStatus(400)).toBe(false);
    expect(isTransientGeminiStatus(401)).toBe(false);
    expect(isTransientGeminiStatus(404)).toBe(false);
  });
});
