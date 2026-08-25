import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import mysql, { type RowDataPacket } from "mysql2/promise";

type Journal = { entries: Array<{ when: number; tag: string }> };
type TableRow = RowDataPacket & { tableName: string };
type TagColumnRow = RowDataPacket & { tableName: string; columnDefault: string | null };

const projectRoot = process.cwd();
const migrationRoot = path.join(projectRoot, "drizzle");
const expectedTables = [
  "users",
  "profiles",
  "tasks",
  "goals",
  "notes",
  "knowledge",
  "people",
  "followups",
  "timelineEvents",
  "documents",
  "brainDumps",
];

async function migrationHash(tag: string) {
  const sql = await readFile(path.join(migrationRoot, `${tag}.sql`), "utf8");
  return { sql, hash: createHash("sha256").update(sql).digest("hex") };
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  const journal = JSON.parse(await readFile(path.join(migrationRoot, "meta", "_journal.json"), "utf8")) as Journal;
  const base = journal.entries.find((entry) => entry.tag === "0001_shallow_scorpion");
  const compatibility = journal.entries.find((entry) => entry.tag === "0002_sticky_unicorn");
  if (!base || !compatibility) throw new Error("Expected Dexus migration metadata was not found.");

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const { sql: baseSql, hash: baseHash } = await migrationHash(base.tag);
    const { hash: compatibilityHash } = await migrationHash(compatibility.tag);
    const statements = baseSql
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) await connection.query(statement);

    const [tableRows] = await connection.query<TableRow[]>(
      "SELECT TABLE_NAME AS tableName FROM information_schema.tables WHERE table_schema = DATABASE()",
    );
    const available = new Set(tableRows.map((row) => row.tableName));
    const missing = expectedTables.filter((name) => !available.has(name));
    if (missing.length) throw new Error(`Missing required tables after reconciliation: ${missing.join(", ")}`);

    const [tagRows] = await connection.query<TagColumnRow[]>(
      "SELECT TABLE_NAME AS tableName, COLUMN_DEFAULT AS columnDefault FROM information_schema.columns WHERE table_schema = DATABASE() AND column_name = 'tags' AND table_name IN ('tasks', 'notes', 'knowledge')",
    );
    if (tagRows.length !== 3 || tagRows.some((row) => row.columnDefault !== null)) {
      throw new Error("Dexus tag columns do not match the TiDB-compatible NOT NULL JSON design.");
    }

    await connection.query(
      "CREATE TABLE IF NOT EXISTS __drizzle_migrations (id bigint AUTO_INCREMENT PRIMARY KEY, hash text NOT NULL, created_at bigint)",
    );
    await connection.query("DELETE FROM __drizzle_migrations WHERE created_at IN (?, ?)", [base.when, compatibility.when]);
    await connection.query("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?), (?, ?)", [baseHash, base.when, compatibilityHash, compatibility.when]);

    await writeFile(
      path.join(projectRoot, "db-reconciliation.json"),
      JSON.stringify({ status: "reconciled", tables: expectedTables, migrations: [base.tag, compatibility.tag], reconciledAt: new Date().toISOString() }, null, 2),
    );
    console.log("Dexus database reconciliation completed.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Dexus database reconciliation failed.");
  process.exitCode = 1;
});
