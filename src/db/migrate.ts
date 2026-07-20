import type { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = 3;

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

  const current = row?.version ?? 0;
  if (current === SCHEMA_VERSION) {
    return;
  }

  db.exec("BEGIN");
  try {
    if (current === 0) {
      db.exec(schemaSql);
      db.run("INSERT INTO schema_migrations (version) VALUES (?)", [SCHEMA_VERSION]);
    } else {
      if (current < 3) {
        migrateNotesToSupportRecommendations(db);
      }
      db.exec(schemaSql);
      db.run("UPDATE schema_migrations SET version = ?", [SCHEMA_VERSION]);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function migrateNotesToSupportRecommendations(db: Database): void {
  const notesInfo = db
    .query<{ name: string }, []>("PRAGMA table_info(notes)")
    .all();

  if (!notesInfo.length) {
    return;
  }

  const hasRecommendationId = notesInfo.some((col) => col.name === "recommendation_id");
  if (hasRecommendationId) {
    return;
  }

  db.exec(`
    CREATE TABLE notes_v3 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
      recommendation_id INTEGER REFERENCES recommendations(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      created_by_display TEXT NOT NULL,
      created_at TEXT NOT NULL,
      CHECK (
        (game_id IS NOT NULL AND recommendation_id IS NULL)
        OR (game_id IS NULL AND recommendation_id IS NOT NULL)
      )
    );

    INSERT INTO notes_v3 (
      id, guild_id, game_id, recommendation_id, body,
      created_by_user_id, created_by_display, created_at
    )
    SELECT
      id, guild_id, game_id, NULL, body,
      created_by_user_id, created_by_display, created_at
    FROM notes;

    DROP TABLE notes;
    ALTER TABLE notes_v3 RENAME TO notes;
  `);
}
