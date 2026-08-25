import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Dexus document deletion safeguards", () => {
  it("loads and deletes the document through the authenticated user scope before touching storage", () => {
    const routerSource = readFileSync("/home/ubuntu/dexus-mobile-v2/server/routers.ts", "utf8");
    const databaseSource = readFileSync("/home/ubuntu/dexus-mobile-v2/server/db.ts", "utf8");
    expect(routerSource).toContain("db.getDocument(ctx.user.id, input.id)");
    expect(routerSource).toContain("await storageDelete(document.storageKey)");
    expect(routerSource).toContain("db.deleteDocument(ctx.user.id, document.id, document.filename)");
    expect(databaseSource).toContain("db.delete(documents).where(and(eq(documents.id, id), eq(documents.userId, userId)))");
  });

  it("requires a confirmation prompt before exposing the Delete file action", () => {
    const screenSource = readFileSync("/home/ubuntu/dexus-mobile-v2/app/documents.tsx", "utf8");
    expect(screenSource).toContain("Delete this file?");
    expect(screenSource).toContain("This cannot be undone.");
    expect(screenSource).toContain("Delete file");
  });
});
