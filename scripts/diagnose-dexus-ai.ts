import { diagnoseBrainDumpExtraction } from "../server/ai";

async function main() {
  const diagnostic = await diagnoseBrainDumpExtraction({
    text: "Create a high priority task to validate Dexus live AI workflow tomorrow. Remember that retrieval must remain private.",
    timezone: "UTC",
  });
  console.log(JSON.stringify({ parseError: diagnostic.parseError, schemaIssues: diagnostic.schemaIssues, raw: diagnostic.raw, normalized: diagnostic.normalized, responseEnvelope: diagnostic.responseEnvelope }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Dexus AI diagnostic failed.");
  process.exitCode = 1;
});
