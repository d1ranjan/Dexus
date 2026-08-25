# Dexus Admin Verification Record

## Security controls verified

The Dexus Admin extension uses server-side authenticated role checks. Normal users are denied every privileged route, while active administrators receive only the administrative data and actions allowed by the server. No client-side flag, stored preference, hidden route, or request field can grant administrator status.

| Control | Live verification result |
|---|---|
| Normal-user admin denial | Passed. Normal test account was rejected from overview, user listing, and controlled content endpoints. |
| Metadata-first user management | Passed. User-list metadata did not include private task content. |
| Controlled content access | Passed. A required reason of at least ten characters was enforced before server-side content return. |
| Immutable audit records | Passed. Sensitive content access, account suspension, and JSON export produced audit events; no client-facing update or delete procedure exists. |
| Account-state enforcement | Passed. A server-side suspension blocked the affected user from active user procedures. |
| Soft deletion | Passed. An administrative Brain Dump soft-delete removed the item from normal user retrieval while retaining the record. |
| Privacy-safe monitoring | Passed. Operational metrics omit raw private prompts, document content, storage keys, and stack traces. |
| Existing Dexus workflows | Passed. Core live persistence and Brain Dump extraction tests remain green. |

## Test command

Run `DEXUS_RUN_LIVE_DB_TESTS=1 pnpm vitest run tests/dexus.live-db.test.ts tests/dexus.admin.live-db.test.ts` to exercise the managed-database integration coverage. Test identities and their audit records are deleted after the suite completes.

> The test suite validates server authorization and privileged operational workflows. Interactive device login remains subject to the existing manual OAuth/device-session test path.
