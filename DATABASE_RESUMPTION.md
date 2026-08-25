# Dexus Managed Database Verification Record

## Verified managed-database state

The managed TiDB connection is available again. Dexus’s partially created empty schema was reconciled without destructive changes, the Drizzle migration journal was repaired through migration `0003_thick_molly_hayes`, and every expected product table is present. User-scope and relationship lookup indexes are now included for production query paths.

> **Verified integration coverage:** Protected procedures reject unauthenticated contexts. Real test accounts persisted profiles and all core entities, including tasks, goals, notes, knowledge, people, follow-ups, documents, timeline events, and Brain Dumps. Fresh authenticated contexts retrieved persisted data; a second account could neither read nor mutate another account’s task; and the live Brain Dump flow completed from server-side AI extraction through validated approval, database persistence, search, timeline retrieval, and automatic cleanup.

## Migration and validation record

| Area | Result | Evidence |
|---|---|---|
| Schema reconciliation | Complete | Eleven Dexus tables present with four Drizzle migration records. |
| Safety | Complete | No destructive schema change was used; generated test identities and data were automatically cleaned up. |
| Constraints and indexes | Complete | Profile uniqueness plus user-scope and relationship lookup indexes were verified after applying migration `0003`. |
| Protected access | Complete | An unauthenticated caller was rejected by protected procedures. |
| CRUD persistence | Complete | Live tests created, updated, read, and deleted the principal user-scoped entities. |
| User isolation | Complete | A second authenticated test account could not list or mutate first-account content. |
| Brain Dump workflow | Complete | Live AI extraction returned strictly validated data, then persisted and retrieved it only for the owning user. |
| Interactive OAuth redirect and device session | Manual follow-up | Server auth guard, OAuth entry, logout cookie policy, and persisted-user integration are covered; completing a human browser/device login still requires a user session. |

## AI extraction correction

The provider diagnostic showed that forced JSON mode conflicted with an enabled provider capability and returned a provider error envelope with no choices. Dexus now uses a strict server-side JSON-only prompt, code-fence normalization, and Zod validation. Provider error envelopes and malformed output are rejected before any database save. A regression test covers the diagnosed response shape.

## Ongoing operational checks

Run the standard suite with `pnpm test && pnpm check`. To run the non-destructive live integration coverage against the managed database, use `DEXUS_RUN_LIVE_DB_TESTS=1 pnpm vitest run tests/dexus.live-db.test.ts`. The suite creates uniquely named temporary test identities and removes them in `afterAll`.
