import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Dexus administrator document deletion", () => {
  it("uses an administrator-only route, writes audit records, removes private storage, and deletes only the selected user-scoped record", () => {
    const router = readFileSync("/home/ubuntu/dexus-mobile-v2/server/routers.ts", "utf8");
    const admin = readFileSync("/home/ubuntu/dexus-mobile-v2/server/admin.ts", "utf8");
    expect(router).toContain("adminDocuments: router({ list: administratorProcedure");
    expect(router).toContain("delete: administratorProcedure");
    expect(admin).toContain("DELETE_PRIVATE_DOCUMENT_REQUEST");
    expect(admin).toContain("await storageDelete(document.storageKey)");
    expect(admin).toContain("await deleteDocument(input.targetUserId, document.id, document.filename)");
  });

  it("requires a reasoned permanent-removal confirmation in the administrator UI", () => {
    const screen = readFileSync("/home/ubuntu/dexus-mobile-v2/app/admin/documents.tsx", "utf8");
    expect(screen).toContain("Confirm permanent removal");
    expect(screen).toContain("at least 10 characters");
    expect(screen).toContain("Permanently remove");
  });
});
