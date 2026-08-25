# Dexus Render Backend Deployment

## Scope

`render.yaml` defines a **free Render Node web service** for the existing Dexus Express/tRPC API. It uses the already uploaded `main` branch, installs the pinned pnpm version directly to avoid Render Corepack signature failures, builds with `pnpm build`, starts with `pnpm start`, and health-checks `/api/health`. Render supplies `PORT`; the Dexus server already binds to it on `0.0.0.0`.

The GitHub Pages frontend remains at <https://d1ranjan.github.io/Dexus/>. The verified Render address is now `https://dexus-api.onrender.com`, and that address has been inserted into the static frontend export as `EXPO_PUBLIC_API_BASE_URL` and published to `gh-pages`.

## Required Render settings

Use **New → Blueprint** in Render and select `d1ranjan/Dexus` on the `main` branch. The Blueprint supplies the non-secret values. When Render asks for secret values, obtain their actual values from the corresponding provider dashboards or existing secure deployment settings; do not copy them from source code or commit them to GitHub.

| Variable | Required | Source | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | Existing TiDB/MySQL provider connection settings | Preserves the current Dexus users and user-scoped data. |
| `SUPABASE_URL` | Yes | Supabase project API settings | Server-side email/password authentication. |
| `SUPABASE_KEY` | Yes | Supabase project API settings | Server-side Supabase Auth requests and token verification. |
| `SUPABASE_SECRET_KEY` | Yes for document uploads | Supabase project API settings → Secret key | Server-only private document uploads and short-lived signed reads. Never expose this value to the frontend. |
| `GEMINI_API_KEY` | Yes for Brain Dump AI | Google AI Studio API Keys | Server-only structured Gemini Brain Dump extraction and document summaries. |
| `OWNER_SUPABASE_USER_ID` | Yes | Existing initial-admin Supabase user identifier | Preserves server-enforced initial-admin assignment. |
| `COOKIE_DOMAIN` | No | Leave blank for the `onrender.com` host | Host-only cookie override for a future owner domain; bearer-token auth remains primary for Pages. |

`WEB_APP_URL` and `CORS_ALLOWED_ORIGINS` are intentionally public, exact GitHub Pages values. Do not add `localhost`, a path to the CORS variable, or wildcard origins.

## Functional boundary

The core Dexus API, Supabase Auth bridge, database CRUD, roles, audits, and user isolation run on Render after the required provider values are set. **Brain Dump extraction and document summaries now use Gemini**, while private documents use **Supabase Storage** through the server-only Secret key. Gemini and private-storage readiness are exposed as booleans only at `/api/health`; no credential is returned.

Notifications, image generation, and voice transcription still call Manus-managed Forge endpoints through `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY`. Those remaining features are not yet portable to Render and need separate owner-controlled replacements before relying on them from the Render service.

> Render’s free web service can spin down after idle time, so the first request after inactivity can be slower. It is suitable for an initial evaluation deployment rather than a no-cold-start production SLA.

## Final connection sequence

1. Confirm `GET https://dexus-api.onrender.com/api/health` returns `200` with `providers.gemini` and `providers.privateStorage` both `true` after deployment or a free-tier cold start.
2. Keep the backend `CORS_ALLOWED_ORIGINS` exactly `https://d1ranjan.github.io`.
3. Supabase Site URL and allowed redirect list now use `https://d1ranjan.github.io/Dexus/auth/callback` while retaining the Dexus native scheme.
4. Verify sign-up, confirmation, sign-in, recovery, a protected API call, cross-user isolation, Brain Dump extraction, and document upload.
