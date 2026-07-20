import type { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = 1;

const schemaSql = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "schema.sql"),
  "utf8",
);

export function migrate(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL
    )
  `);

  const row = db
    .query<{ version: number }, []>("SELECT version FROM schema_migrations LIMIT 1")
    .get();

  if (row?.version === SCHEMA_VERSION) {
    return;
  }

  db.exec("BEGIN");
  try {
    db.exec(schemaSql);
    if (row) {
      db.run("UPDATE schema_migrations SET version = ?", [SCHEMA_VERSION]);
    } else {
      db.run("INSERT INTO schema_migrations (version) VALUES (?)", [SCHEMA_VERSION]);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
