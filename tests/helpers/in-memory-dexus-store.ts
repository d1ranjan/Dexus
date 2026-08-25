import type { BrainDumpAnalysis, SearchResult } from "../../shared/dexus";

type StoredTask = { id: number; title: string; priority: string; createdAt: Date };
type StoredGoal = { id: number; title: string; createdAt: Date };
type StoredKnowledge = { id: number; title: string; content: string; createdAt: Date };
type StoredMemory = { id: number; title: string; createdAt: Date };

export class InMemoryDexusStore {
  private nextId = 1;
  private tasks = new Map<number, StoredTask[]>();
  private goals = new Map<number, StoredGoal[]>();
  private knowledge = new Map<number, StoredKnowledge[]>();
  private timeline = new Map<number, StoredMemory[]>();

  saveApprovedBrainDump(userId: number, analysis: BrainDumpAnalysis) {
    const now = new Date();
    const get = <T>(map: Map<number, T[]>) => map.get(userId) ?? [];
    const taskRows = analysis.tasks.map((item) => ({ id: this.nextId++, title: item.title, priority: item.priority, createdAt: now }));
    const goalRows = analysis.goals.map((item) => ({ id: this.nextId++, title: item.title, createdAt: now }));
    const knowledgeRows = analysis.knowledge.map((item) => ({ id: this.nextId++, title: item.title, content: item.content, createdAt: now }));
    const memoryRows = [...taskRows, ...goalRows, ...knowledgeRows].map((item) => ({ id: item.id, title: item.title, createdAt: now }));
    this.tasks.set(userId, [...get(this.tasks), ...taskRows]);
    this.goals.set(userId, [...get(this.goals), ...goalRows]);
    this.knowledge.set(userId, [...get(this.knowledge), ...knowledgeRows]);
    this.timeline.set(userId, [...get(this.timeline), ...memoryRows]);
  }

  dashboard(userId: number) {
    return { tasks: this.tasks.get(userId) ?? [], goals: this.goals.get(userId) ?? [], knowledge: this.knowledge.get(userId) ?? [], timeline: this.timeline.get(userId) ?? [] };
  }

  search(userId: number, query: string): SearchResult[] {
    const normalized = query.toLowerCase();
    const textMatches = (value: string) => value.toLowerCase().includes(normalized);
    const results: SearchResult[] = [];
    (this.tasks.get(userId) ?? []).filter((item) => textMatches(item.title)).forEach((item) => results.push({ id: item.id, type: "task", title: item.title, subtitle: item.priority, createdAt: item.createdAt }));
    (this.goals.get(userId) ?? []).filter((item) => textMatches(item.title)).forEach((item) => results.push({ id: item.id, type: "goal", title: item.title, subtitle: "Goal", createdAt: item.createdAt }));
    (this.knowledge.get(userId) ?? []).filter((item) => textMatches(`${item.title} ${item.content}`)).forEach((item) => results.push({ id: item.id, type: "knowledge", title: item.title, subtitle: item.content, createdAt: item.createdAt }));
    return results;
  }
}
