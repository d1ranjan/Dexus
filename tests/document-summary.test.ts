import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { documentSummaryNeedsRegeneration, parseDocumentSummary } from "../server/ai";
import { displayDocumentSummary, hasReadableDocumentText } from "../server/document-text";

describe("Dexus document summary normalization", () => {
  it("converts Gemini’s structured response into a useful stored summary", () => {
    const summary = parseDocumentSummary(JSON.stringify({
      summary: "The syllabus describes a distributed-systems course and its evaluation.",
      deadlines: ["Project proposal due Friday"],
      tasks: ["Submit the project proposal"],
      knowledge: ["The course includes a final project"],
    }));

    expect(summary).toContain("distributed-systems course");
    expect(summary).toContain("Deadlines: Project proposal due Friday");
    expect(summary).toContain("Actions: Submit the project proposal");
  });

  it("recognizes the earlier empty-object summary defect as regenerable", () => {
    expect(documentSummaryNeedsRegeneration("{}")).toBe(true);
    expect(documentSummaryNeedsRegeneration(null)).toBe(true);
    expect(documentSummaryNeedsRegeneration("Useful summary")).toBe(false);
  });

  it("rejects an empty or malformed Gemini object rather than storing it as a summary", () => {
    expect(() => parseDocumentSummary("{}")).toThrow("could not validate the document summary");
    expect(() => parseDocumentSummary("not JSON")).toThrow();
  });

  it("does not treat PDF page markers as extractable document content", () => {
    expect(hasReadableDocumentText("\n\n-- 1 of 3 --\n\n\n\n-- 2 of 3 --\n\n\n\n-- 3 of 3 --\n")).toBe(false);
    expect(hasReadableDocumentText("The syllabus says the project proposal is due Friday and requires a one-page outline.")).toBe(true);
  });

  it("unwraps a legacy JSON summary for display without rewriting the stored document", () => {
    expect(displayDocumentSummary('{"summary":"A readable legacy summary","tasks":[]}')).toBe("A readable legacy summary");
    expect(displayDocumentSummary("{}")).toBe("{}");
  });

  it("keeps regeneration bound to the authenticated owner and updates through the user-scoped helper", () => {
    const routerSource = readFileSync("/home/ubuntu/dexus-mobile-v2/server/routers.ts", "utf8");
    const databaseSource = readFileSync("/home/ubuntu/dexus-mobile-v2/server/db.ts", "utf8");
    expect(routerSource).toContain("db.getDocument(ctx.user.id, input.id)");
    expect(routerSource).toContain("db.updateDocumentSummary(ctx.user.id, input.id, summary)");
    expect(databaseSource).toContain("eq(documents.userId, userId)");
  });
});
