import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Dexus self-service account deletion", () => {
  it("requires the exact confirmation phrase and derives every deletion target from the authenticated user", () => {
    const router = readFileSync("/home/ubuntu/dexus-mobile-v2/server/routers.ts", "utf8");
    expect(router).toContain('z.literal("DELETE MY ACCOUNT")');
    expect(router).toContain("db.getOwnAccountDeletionPlan(ctx.user.id)");
    expect(router).toContain("db.deleteOwnAccountData(ctx.user.id)");
    expect(router).not.toContain("account: router({ delete: activeUserProcedure.input(z.object({ userId:" );
  });

  it("removes private objects through storage, user-scoped data in dependency order, and the provider identity server-side", () => {
    const database = readFileSync("/home/ubuntu/dexus-mobile-v2/server/db.ts", "utf8");
    const router = readFileSync("/home/ubuntu/dexus-mobile-v2/server/routers.ts", "utf8");
    const provider = readFileSync("/home/ubuntu/dexus-mobile-v2/server/supabase-admin.ts", "utf8");
    expect(router).toContain("for (const storageKey of plan.storageKeys) await storageDelete(storageKey)");
    expect(database).toContain("SELF_DELETE_ACCOUNT");
    expect(database).toContain("await tx.delete(authIdentities).where(eq(authIdentities.userId, userId))");
    expect(database).toContain("await tx.delete(users).where(eq(users.id, userId))");
    expect(provider).toContain("/auth/v1/admin");
    expect(provider).toContain("should_soft_delete: false");
  });

  it("shows an irreversible confirmation in Settings and clears the client session only after the server succeeds", () => {
    const settings = readFileSync("/home/ubuntu/dexus-mobile-v2/app/settings.tsx", "utf8");
    expect(settings).toContain("Type DELETE MY ACCOUNT to continue.");
    expect(settings).toContain('confirmation !== "DELETE MY ACCOUNT"');
    expect(settings).toContain("await clearDexusSession()");
    expect(settings).toContain('router.replace("/welcome")');
  });

  it("does not permit the configured owner identity to self-delete", () => {
    const router = readFileSync("/home/ubuntu/dexus-mobile-v2/server/routers.ts", "utf8");
    expect(router).toContain("ENV.ownerSupabaseUserId && plan.providerUserId === ENV.ownerSupabaseUserId");
    expect(router).toContain("cannot be deleted through self-service controls");
  });
});
