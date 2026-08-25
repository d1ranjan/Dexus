import { describe, expect, it } from "vitest";
import { InMemoryDexusStore } from "./helpers/in-memory-dexus-store";

describe("Dexus in-memory workflow contract (not a live database test)", () => {
  it("saves approved extraction results, makes them retrievable, and keeps separate users isolated", () => {
    const store = new InMemoryDexusStore();
    store.saveApprovedBrainDump(101, { tasks: [{ title: "Finish ML assignment", priority: "high", tags: [] }], goals: [{ title: "Learn RAG" }], people: [], followups: [], knowledge: [{ title: "Transformers", content: "Transformers use self-attention.", tags: [] }], notes: [], events: [] });
    expect(store.dashboard(101).tasks.map((item) => item.title)).toEqual(["Finish ML assignment"]);
    expect(store.dashboard(101).goals.map((item) => item.title)).toEqual(["Learn RAG"]);
    expect(store.search(101, "Transformer").map((item) => item.type)).toEqual(["knowledge"]);
    expect(store.dashboard(202).tasks).toEqual([]);
    expect(store.search(202, "assignment")).toEqual([]);
  });
});
