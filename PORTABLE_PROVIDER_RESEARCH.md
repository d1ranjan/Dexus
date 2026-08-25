# Portable Provider Research

## AI structured extraction

OpenAI documents Structured Outputs for schema-conforming JSON responses, including JavaScript and Zod examples. This directly fits Dexus Brain Dump extraction because the existing server requires validated structured data before persistence. Source: <https://developers.openai.com/api/docs/guides/structured-outputs>.

Google’s Gemini API also documents JSON Schema structured output for predictable extraction from unstructured text, with JavaScript and Zod examples. Source: <https://ai.google.dev/gemini-api/docs/structured-output>.

Gemini’s current Free Tier offers limited access to selected models with free input and output tokens, although free-tier content may be used to improve Google products and rate limits apply. The selected implementation will use a free-tier-compatible Flash model and retain the existing server-side schema validation. Source: <https://ai.google.dev/gemini-api/docs/pricing> and <https://ai.google.dev/gemini-api/docs/billing>.

Google instructs developers to store a Gemini key as an environment variable, never expose it client-side, and keep it out of source control. New keys created through Google AI Studio are authorization keys. Source: <https://ai.google.dev/gemini-api/docs/api-key>.

## Portable document storage

Supabase Storage supports files, REST/S3-compatible access, resumable uploads, and row-level access controls. It is the lowest-integration option because Dexus already uses Supabase Auth, but server-side uploads need an appropriately restricted server-only credential and bucket policy. Source: <https://supabase.com/docs/guides/storage>.

Cloudflare R2 provides an S3-compatible API at an account-scoped endpoint. It is a portable general-purpose object-store option, but requires a separate Cloudflare account, bucket, and S3-compatible credential setup. Source: <https://developers.cloudflare.com/r2/api/s3/api/>.

## Decision constraint

No provider credential has been selected or stored. Any selected AI or storage credential must be kept only in the Render service environment and must never be committed to GitHub or included in the GitHub Pages export.

## Selected path

The owner selected Gemini structured extraction plus Supabase Storage. The migration requires `GEMINI_API_KEY` and a server-only `SUPABASE_SECRET_KEY`. The existing publishable `SUPABASE_KEY` remains for token verification and must not be replaced with the Supabase Secret key. The validated Gemini key currently supports `gemini-3.6-flash`, which is used as the adapter default because the older `gemini-2.5-flash` endpoint is unavailable to new users.
