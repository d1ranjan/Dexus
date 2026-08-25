/**
 * PDF parsers can return only synthetic page markers for scanned or image-only
 * documents. Those markers are not useful source text for a private AI summary.
 */
export function hasReadableDocumentText(text: string): boolean {
  const content = text
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return content.length >= 40;
}

/** Safely unwraps an older structured summary for display without mutating stored data. */
export function displayDocumentSummary(summary: string | null): string | null {
  const value = summary?.trim() ?? "";
  if (!value || value === "{}") return summary;
  try {
    const parsed = JSON.parse(value) as { summary?: unknown };
    return typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim() : summary;
  } catch {
    return summary;
  }
}
