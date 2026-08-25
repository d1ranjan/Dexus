import { ENV } from "./_core/env";

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  promptFeedback?: { blockReason?: string };
};

const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

function assertGeminiConfigured() {
  if (!ENV.geminiApiKey) {
    throw new Error("Dexus AI is not configured. Please contact the application owner.");
  }
}

export function isTransientGeminiStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function generateGeminiText(input: {
  systemInstruction: string;
  prompt: string;
  responseSchema?: Record<string, unknown>;
}): Promise<string> {
  assertGeminiConfigured();

  const request = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": ENV.geminiApiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: input.systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: input.prompt }] }],
      generationConfig: {
        temperature: 0.2,
        ...(input.responseSchema
          ? { responseMimeType: "application/json", responseJsonSchema: input.responseSchema }
          : {}),
      },
    }),
  };

  let response: Response | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = await fetch(endpoint, request);
    if (response.ok) break;
    if (attempt === 1 || !isTransientGeminiStatus(response.status)) {
      throw new Error("Dexus AI is temporarily unavailable. Please retry.");
    }
    await wait(500);
  }
  if (!response?.ok) throw new Error("Dexus AI is temporarily unavailable. Please retry.");

  const payload = (await response.json()) as GeminiResponse;
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error(
      payload.promptFeedback?.blockReason
        ? "Dexus AI could not process that request. Please rephrase and retry."
        : "Dexus received an empty AI response.",
    );
  }

  return text;
}
