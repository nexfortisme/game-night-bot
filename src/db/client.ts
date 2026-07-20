import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "../config.ts";
import { logInfo } from "../log.ts";
import { migrate } from "./migrate.ts";

let dbInstance: Database | null = null;

export function getDb(): Database {
  if (dbInstance) {
    return dbInstance;
  }

  mkdirSync(dirname(config.databasePath), { recursive: true });
  dbInstance = new Database(config.databasePath, { create: true });
  dbInstance.exec("PRAGMA foreign_keys = ON");
  migrate(dbInstance);
  logInfo("Database initialized", { path: config.databasePath });
  return dbInstance;
}

export function closeDb(): void {
  if (!dbInstance) {
    return;
  }
  dbInstance.close();
  dbInstance = null;
  logInfo("Database closed", { path: config.databasePath });
}
