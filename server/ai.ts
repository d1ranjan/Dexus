import { z } from "zod";
import type { BrainDumpAnalysis } from "../shared/dexus";
import { generateGeminiText } from "./gemini";

const prioritySchema = z.enum(["low", "medium", "high"]);
const brainDumpSchema = z.object({
  tasks: z.array(z.object({ title: z.string().min(1).max(255), description: z.string().max(2000).optional(), dueDate: z.string().date().nullable().optional(), dueTime: z.string().max(20).nullable().optional(), dateNote: z.string().max(120).nullable().optional(), priority: prioritySchema, category: z.string().max(80).optional(), tags: z.array(z.string().max(40)).max(8).default([]) })).default([]),
  goals: z.array(z.object({ title: z.string().min(1).max(255), description: z.string().max(2000).optional(), category: z.string().max(80).optional(), targetDate: z.string().date().nullable().optional(), dateNote: z.string().max(120).nullable().optional() })).default([]),
  people: z.array(z.object({ name: z.string().min(1).max(160), context: z.string().max(1000).optional(), notes: z.string().max(1500).optional() })).default([]),
  followups: z.array(z.object({ personName: z.string().min(1).max(160), action: z.string().min(1).max(255), dueDate: z.string().date().nullable().optional(), dateNote: z.string().max(120).nullable().optional() })).default([]),
  knowledge: z.array(z.object({ title: z.string().min(1).max(255), content: z.string().min(1).max(6000), category: z.string().max(80).optional(), tags: z.array(z.string().max(40)).max(8).default([]) })).default([]),
  notes: z.array(z.object({ title: z.string().min(1).max(255), content: z.string().min(1).max(6000), category: z.string().max(80).optional(), tags: z.array(z.string().max(40)).max(8).default([]) })).default([]),
  events: z.array(z.object({ title: z.string().min(1).max(255), description: z.string().max(2000).optional(), eventAt: z.string().datetime().nullable().optional(), dateNote: z.string().max(120).nullable().optional() })).default([]),
});

export type SafeBrainDumpAnalysis = z.infer<typeof brainDumpSchema>;

const nullableString = { type: ["string", "null"] };
const stringList = { type: "array", items: { type: "string" } };
const brainDumpResponseSchema = {
  type: "object",
  properties: {
    tasks: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, dueDate: nullableString, dueTime: nullableString, dateNote: nullableString, priority: { type: "string", enum: ["low", "medium", "high"] }, category: { type: "string" }, tags: stringList }, required: ["title", "description", "dueDate", "dueTime", "dateNote", "priority", "category", "tags"] } },
    goals: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, category: { type: "string" }, targetDate: nullableString, dateNote: nullableString }, required: ["title", "description", "category", "targetDate", "dateNote"] } },
    people: { type: "array", items: { type: "object", properties: { name: { type: "string" }, context: { type: "string" }, notes: { type: "string" } }, required: ["name", "context", "notes"] } },
    followups: { type: "array", items: { type: "object", properties: { personName: { type: "string" }, action: { type: "string" }, dueDate: nullableString, dateNote: nullableString }, required: ["personName", "action", "dueDate", "dateNote"] } },
    knowledge: { type: "array", items: { type: "object", properties: { title: { type: "string" }, content: { type: "string" }, category: { type: "string" }, tags: stringList }, required: ["title", "content", "category", "tags"] } },
    notes: { type: "array", items: { type: "object", properties: { title: { type: "string" }, content: { type: "string" }, category: { type: "string" }, tags: stringList }, required: ["title", "content", "category", "tags"] } },
    events: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, eventAt: nullableString, dateNote: nullableString }, required: ["title", "description", "eventAt", "dateNote"] } },
  },
  required: ["tasks", "goals", "people", "followups", "knowledge", "notes", "events"],
};

const documentSummarySchema = z.object({
  summary: z.string().trim().min(1).max(1600),
  deadlines: z.array(z.string().trim().min(1).max(240)).max(12).default([]),
  tasks: z.array(z.string().trim().min(1).max(280)).max(12).default([]),
  knowledge: z.array(z.string().trim().min(1).max(420)).max(12).default([]),
});

const documentSummaryResponseSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    deadlines: { type: "array", items: { type: "string" } },
    tasks: { type: "array", items: { type: "string" } },
    knowledge: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "deadlines", "tasks", "knowledge"],
};

export function brainDumpSystemInstruction(timezone: string) {
  return `You are Dexus's careful private information extractor. Convert a user's natural-language brain dump into a single JSON object with exactly these keys and no others: tasks, goals, people, followups, knowledge, notes, events. All seven keys must be present, including empty arrays. Use only the user's words and direct implications. Do not invent dates, people, facts, priorities, categories, or hidden intent. Current date/time is ${new Date().toISOString()} and user timezone is ${timezone}. Resolve only unambiguous relative dates to YYYY-MM-DD. If a date is vague or ambiguous, set the date field to null and preserve the phrase in dateNote. A person must be explicitly and confidently named before appearing in people or followups. A goal is a desired outcome, target, ambition, or longer-term result; a task is a concrete action or next step. When the user explicitly says “goal”, “target”, “aim”, “want to”, or “working toward”, preserve that outcome in goals even if it has no date. If the same input has immediate steps, extract those separately as tasks. Never leave an explicit user-stated goal unrepresented merely because its category, deadline, or plan is not stated. A factual statement worth remembering goes in knowledge; ordinary reflection belongs in notes. Assign priority high only for strong urgency or deadlines, medium by default, and low only for clearly low-stakes items. Return a JSON object only—no markdown fence, explanation, heading, prose, or comments.`;
}

export function responseText(response: { error?: { message?: unknown }; choices?: Array<{ message?: { content?: unknown } }> }) {
  if (response.error) throw new Error("Dexus AI is temporarily unavailable. Please retry.");
  const content = response.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("Dexus received an empty AI response.");
  return content;
}

export function parseAIJsonObject(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("No JSON object was returned.");
  return JSON.parse(trimmed.slice(start, end + 1));
}

export async function diagnoseBrainDumpExtraction(input: { text: string; timezone: string }) {
  try {
    const raw = await generateGeminiText({ systemInstruction: brainDumpSystemInstruction(input.timezone), prompt: input.text, responseSchema: brainDumpResponseSchema });
    const parsed = parseAIJsonObject(raw);
    const validation = brainDumpSchema.safeParse(parsed);
    return { raw, normalized: JSON.stringify(parsed), parseError: null as string | null, schemaIssues: validation.success ? [] : validation.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })), responseEnvelope: "Gemini structured response" };
  } catch (error) {
    return { raw: "", normalized: null as string | null, parseError: error instanceof Error ? error.message : "Unknown AI provider error", schemaIssues: [] as Array<{ path: string; message: string }>, responseEnvelope: "Gemini structured response" };
  }
}

export async function extractBrainDump(input: { text: string; timezone: string }): Promise<BrainDumpAnalysis> {
  const raw = await generateGeminiText({ systemInstruction: brainDumpSystemInstruction(input.timezone), prompt: input.text, responseSchema: brainDumpResponseSchema });
  let parsed: unknown;
  try { parsed = parseAIJsonObject(raw); } catch { throw new Error("Dexus could not validate the AI response. Please retry."); }
  const result = brainDumpSchema.safeParse(parsed);
  if (!result.success) throw new Error("Dexus could not validate the AI response. Please retry.");
  return result.data;
}

export function parseDocumentSummary(raw: string): string {
  const result = documentSummarySchema.safeParse(parseAIJsonObject(raw));
  if (!result.success) throw new Error("Dexus could not validate the document summary. Please retry.");
  const details = [
    result.data.deadlines.length ? `Deadlines: ${result.data.deadlines.join("; ")}` : "",
    result.data.tasks.length ? `Actions: ${result.data.tasks.join("; ")}` : "",
    result.data.knowledge.length ? `Key points: ${result.data.knowledge.join("; ")}` : "",
  ].filter(Boolean);
  return [result.data.summary, ...details].join("\n\n");
}

export function documentSummaryNeedsRegeneration(summary: string | null | undefined): boolean {
  const normalized = summary?.trim() ?? "";
  return !normalized || normalized === "{}";
}

export async function summarizeDocument(text: string): Promise<string> {
  const raw = await generateGeminiText({
    systemInstruction: "You summarize only the provided document. Return one JSON object with exactly summary, deadlines, tasks, and knowledge. summary must be a concise useful plain-language explanation. deadlines contains only direct deadline phrases. tasks contains only explicit assignments or actions. knowledge contains significant factual points. Use empty arrays when no items apply. Do not invent information. Return JSON only, without markdown or commentary.",
    prompt: text.slice(0, 24000),
    responseSchema: documentSummaryResponseSchema,
  });
  return parseDocumentSummary(raw);
}

export async function answerFromContext(question: string, context: string, purpose: "assistant" | "briefing" | "insights" | "search") {
  return generateGeminiText({ systemInstruction: `You are Dexus, a private personal knowledge assistant. This response is for ${purpose}. Answer only from the supplied user context. Never invent personal facts, commitments, dates, or explanations. If the context is insufficient, explicitly say what Dexus does not have. Be concise, useful, and professional. Clearly label any recommendation as an AI suggestion.`, prompt: `Question: ${question}\n\nRelevant private context:\n${context || "No relevant saved information."}` });
}

export function validateBrainDumpAnalysis(value: unknown) { return brainDumpSchema.safeParse(value); }
