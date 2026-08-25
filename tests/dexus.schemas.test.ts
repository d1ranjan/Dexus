import { describe, expect, it } from "vitest";
import { parseAIJsonObject, responseText, validateBrainDumpAnalysis } from "../server/ai";

describe("Dexus AI extraction validation", () => {
  it("accepts a reviewable structured brain dump", () => {
    const parsed = validateBrainDumpAnalysis({ tasks: [{ title: "Finish ML assignment", dueDate: "2026-08-27", dueTime: null, dateNote: null, priority: "high", tags: ["college"] }], goals: [{ title: "Learn RAG", targetDate: null, dateNote: "after exams" }], people: [{ name: "Rahul" }], followups: [{ personName: "Rahul", action: "Discuss dataset", dueDate: "2026-08-25", dateNote: null }], knowledge: [], notes: [], events: [] });
    expect(parsed.success).toBe(true);
  });

  it("rejects malformed or unsafe AI fields before any data can be saved", () => {
    const parsed = validateBrainDumpAnalysis({ tasks: [{ title: "", priority: "urgent", tags: [] }], goals: [], people: [], followups: [], knowledge: [], notes: [], events: [] });
    expect(parsed.success).toBe(false);
  });

  it("accepts a JSON object wrapped in a model code fence before validation", () => {
    expect(parseAIJsonObject("```json\n{\"tasks\": []}\n```")).toEqual({ tasks: [] });
  });

  it("safely rejects the diagnosed provider error envelope before any extraction can be stored", () => {
    expect(() => responseText({ error: { message: "Web Search cannot be used with JSON mode." }, choices: [] } as never)).toThrow("Dexus AI is temporarily unavailable");
  });
});
