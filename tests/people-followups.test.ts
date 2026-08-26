import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { countOpenFollowups, sortPeopleByOpenFollowups } from "../lib/people-followups";

describe("People follow-up prioritization", () => {
  const people = [{ id: 1, name: "Alex" }, { id: 2, name: "Bea" }, { id: 3, name: "Chen" }];

  it("puts people with more open follow-ups first, then sorts alphabetically", () => {
    const followups = [{ personId: 2, status: "open" as const }, { personId: 2, status: "open" as const }, { personId: 1, status: "open" as const }, { personId: 3, status: "completed" as const }];
    expect(countOpenFollowups(followups)).toEqual({ 1: 1, 2: 2 });
    expect(sortPeopleByOpenFollowups(people, followups).map((person) => person.name)).toEqual(["Bea", "Alex", "Chen"]);
  });

  it("does not treat completed or snoozed follow-ups as pending", () => {
    const followups = [{ personId: 3, status: "completed" as const }, { personId: 1, status: "snoozed" as const }];
    expect(sortPeopleByOpenFollowups(people, followups).map((person) => person.name)).toEqual(["Alex", "Bea", "Chen"]);
  });

  it("uses the protected user-scoped follow-up API rather than storing follow-ups in the client", () => {
    const screen = readFileSync("/home/ubuntu/dexus-mobile-v2/app/people.tsx", "utf8");
    const router = readFileSync("/home/ubuntu/dexus-mobile-v2/server/routers.ts", "utf8");
    const database = readFileSync("/home/ubuntu/dexus-mobile-v2/server/db.ts", "utf8");
    expect(screen).toContain("createFollowup.mutateAsync({ personId: followupPerson.id");
    expect(router).toContain("followups: router({ list: activeUserProcedure");
    expect(database).toContain("createFollowup(userId: number");
    expect(database).toContain("eq(followups.userId, userId)");
  });
});
