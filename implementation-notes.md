# Implementation Notes

The managed TiDB database does not allow a default value for JSON columns. Dexus writes a non-empty `tags` array explicitly on every task, note, and knowledge mutation, so the relational schema uses `NOT NULL` JSON columns without JSON defaults. The additive migration is written with `IF NOT EXISTS` because its first direct provision attempt created a subset of the empty new tables before the database surfaced this dialect limitation. Re-running the corrected migration safely creates the remaining tables and records the migration journal.

