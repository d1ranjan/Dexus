# Dexus Supabase Auth Migration Status

**Status:** Automated validation resumed on 24 August 2026. The migration is server-validated; one concise browser check and native-build email-link testing remain intentionally deferred.

## Completed work

| Area | Current state |
|---|---|
| Authentication provider | Dexus uses Supabase Auth for its branded email/password account flow. The legacy Manus-hosted sign-in entrypoint and callback flow are no longer used by Dexus. |
| Branded account UI | Dexus now has its own sign-in, create-account, email-confirmation callback, forgot-password, and password-update screens. They do not display provider or builder branding. |
| Data continuity | Migration `0005_chief_rattler` added the `authIdentities` table. It maps a Supabase subject to one stable Dexus `users.id`, so existing user-scoped tasks, goals, notes, knowledge, documents, profiles, audit records, and other relationships are not copied or reassigned. |
| Database migration | The additive identity-map table and indexes were applied and reconciled in the managed Drizzle migration journal. No existing product table or user data was deleted. |
| Server authorization | The Dexus server verifies Supabase access tokens through Supabase Auth before resolving a Dexus account. It continues to enforce account status, server-side roles, tRPC protected procedures, and user-scoped data access. |
| Browser transport | After a browser `NetworkError`, the account actions were moved through Dexus server endpoints: sign-up, sign-in, recovery, token refresh, password update, sign-out, and session establishment. Browser clients no longer directly call Supabase for these actions. |
| Initial administrator | Exactly one active Supabase-to-Dexus mapping was confirmed. That mapped Dexus account was assigned the existing server-enforced `admin` role at the owner’s request. The Admin role still requires reasons and immutable audit logging for controlled private-content access; it is not an unrestricted data-isolation bypass. |
| Privacy and domain docs | The privacy draft now names Supabase Auth and remains marked for legal review. `DOMAIN_SETUP.md` retains the no-custom-domain posture and documents Supabase redirect requirements. |

## Verified evidence

| Check | Result |
|---|---|
| Supabase project configuration | Server-side settings probe passed: email/password signup is enabled and email confirmation is configured. |
| Supabase token verification | Focused verification tests passed, including rejection of expired tokens and unverified email identities. |
| Data mapping | Live managed-database test passed: a Supabase subject linked to an existing Dexus user by verified email without creating a duplicate user. |
| Product isolation and admin regressions | Opt-in live suite passed with 10 tests covering CRUD, user isolation, Brain Dump retrieval isolation, normal-user admin denial, admin controls, audits, suspension, export, soft deletion, and cleanup. |
| Server-mediated sign-in route | Externally reachable Dexus API health was restored after a temporary 502; the server sign-in route was confirmed to reject invalid credentials normally rather than failing with a browser network error. |
| Initial admin assignment | The active Supabase-mapped account was verified as one active Dexus administrator in the managed database. |
| Server-mediated account endpoints | External endpoint contract checks returned normal responses: invalid sign-up `400`, invalid sign-in `401`, invalid recovery `400`, invalid refresh `400`, invalid password update `400`, and safe sign-out `200`. No user account was created or changed by these checks. |
| Resumed regression run | TypeScript checking and focused Supabase tests passed (5 tests). Managed-database Dexus and Admin suites also passed (10 tests), covering identity mapping, protected CRUD, user isolation, Brain Dump isolation, normal-user admin denial, audit controls, account status, export, soft deletion, and cleanup. |
| Protected API transport | The remaining tRPC token lookup was changed to the Dexus-managed secure session store; no active application screen, hook, or API transport now uses the direct Supabase browser SDK for authentication. |
| Current administrator | The managed database currently reports one active Supabase-mapped Dexus administrator. |

## Important limitations and follow-up steps

1. **Complete one concise real web account journey** when convenient: sign in, sign out, sign in again, and confirm the Dexus Admin route appears. A fresh registration, email-link confirmation, and password-reset update are still useful manual evidence, but were deferred because the owner asked to minimize time spent on browser testing.
2. **Do not use Expo Go for Dexus email confirmation or password recovery.** Expo Go cannot register Dexus’s custom `dexusdexusmobilev2://` scheme. Native confirmation/recovery must be verified in a Dexus development or production build. Test browser email flows in the HTTPS web preview.
3. **Do not claim physical-device verification yet.** It remains unavailable and unverified.
4. **No owner-provided custom domain is configured.** A managed deployment domain exists but currently returned HTTP `503` when checked, so it must not be used as a confirmed production Site URL or redirect target. Do not invent DNS values. When a canonical host is live and verified, add `https://<canonical-host>/auth/callback` to Supabase Redirect URLs and set its Site URL only then. The native redirect remains `dexusdexusmobilev2://**`.
5. **Retain the existing security model.** Do not add a self-promotion endpoint, do not expose a service-role credential, do not weaken server-side token verification, and do not remove reason/audit requirements for controlled administrator access.
6. **Before declaring the migration complete,** rerun `pnpm check`, `pnpm test`, the opt-in live database/admin tests, and the real web account journey above. Then update `todo.md`, checkpoint, and report only the evidence actually obtained.

## Key implementation locations

| Purpose | Files |
|---|---|
| Additive identity map | `drizzle/schema.ts`, `drizzle/0005_chief_rattler.sql`, `server/db.ts` |
| Supabase token verification | `server/_core/sdk.ts`, `server/_core/oauth.ts`, `server/_core/env.ts` |
| Browser account forms | `app/welcome.tsx`, `app/auth/callback.tsx`, `app/auth/forgot-password.tsx`, `app/auth/update-password.tsx` |
| Dexus-managed session storage | `lib/dexus-session.ts`, `lib/_core/api.ts`, `hooks/use-auth.ts`, `lib/trpc.ts` |
| Redirect and domain guidance | `constants/oauth.ts`, `DOMAIN_SETUP.md` |
| Regression coverage | `tests/dexus.supabase-token.test.ts`, `tests/supabase.config.test.ts`, `tests/dexus.live-db.test.ts` |
