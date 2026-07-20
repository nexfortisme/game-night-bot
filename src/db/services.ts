import type { Database } from "bun:sqlite";
import {
  type GameStatus,
  isGameStatus,
} from "../domain/gameStatus.ts";

export type RecommendationRow = {
  id: number;
  guild_id: string;
  name: string;
  link: string | null;
  recommended_by_user_id: string;
  recommended_by_display: string;
  created_at: string;
};

export type GameRow = {
  id: number;
  guild_id: string;
  name: string;
  status: GameStatus;
  link: string | null;
  recommendation_id: number | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
};

export class ServiceError extends Error {
  constructor(
    message: string,
    readonly code: "not_found" | "duplicate" | "invalid" = "invalid",
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function nowIso(): string {
  return new Date().toISOString();
}

function terminalStatuses(): GameStatus[] {
  return ["finished", "abandoned", "shelved"];
}

export function addRecommendation(
  db: Database,
  input: {
    guildId: string;
    name: string;
    link?: string | null;
    recommendedByUserId: string;
    recommendedByDisplay: string;
  },
): RecommendationRow {
  const name = input.name.trim();
  if (!name) {
    throw new ServiceError("Game name is required.", "invalid");
  }

  const createdAt = nowIso();
  try {
    const result = db.run(
      `INSERT INTO recommendations (
        guild_id, name, name_normalized, link,
        recommended_by_user_id, recommended_by_display, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.guildId,
        name,
        normalizeName(name),
        input.link?.trim() || null,
        input.recommendedByUserId,
        input.recommendedByDisplay,
        createdAt,
      ],
    );
    const id = Number(result.lastInsertRowid);
    return getRecommendationById(db, input.guildId, id)!;
  } catch (error) {
    if (isSqliteUnique(error)) {
      throw new ServiceError(`"${name}" is already in recommendations.`, "duplicate");
    }
    throw error;
  }
}

export function listRecommendations(
  db: Database,
  guildId: string,
): RecommendationRow[] {
  return db
    .query<RecommendationRow, [string]>(
      `SELECT id, guild_id, name, link, recommended_by_user_id, recommended_by_display, created_at
       FROM recommendations WHERE guild_id = ? ORDER BY name COLLATE NOCASE`,
    )
    .all(guildId);
}

export function getRecommendationById(
  db: Database,
  guildId: string,
  id: number,
): RecommendationRow | null {
  return (
    db
      .query<RecommendationRow, [string, number]>(
        `SELECT id, guild_id, name, link, recommended_by_user_id, recommended_by_display, created_at
         FROM recommendations WHERE guild_id = ? AND id = ?`,
      )
      .get(guildId, id) ?? null
  );
}

export function findRecommendationByName(
  db: Database,
  guildId: string,
  name: string,
): RecommendationRow | null {
  return (
    db
      .query<RecommendationRow, [string, string]>(
        `SELECT id, guild_id, name, link, recommended_by_user_id, recommended_by_display, created_at
         FROM recommendations WHERE guild_id = ? AND name_normalized = ?`,
      )
      .get(guildId, normalizeName(name)) ?? null
  );
}

export function removeRecommendation(
  db: Database,
  guildId: string,
  id: number,
): RecommendationRow {
  const row = getRecommendationById(db, guildId, id);
  if (!row) {
    throw new ServiceError(`Recommendation R#${id} not found.`, "not_found");
  }
  db.run("DELETE FROM recommendations WHERE guild_id = ? AND id = ?", [guildId, id]);
  return row;
}

export function removeRecommendationByName(
  db: Database,
  guildId: string,
  name: string,
): RecommendationRow {
  const row = findRecommendationByName(db, guildId, name);
  if (!row) {
    throw new ServiceError(`Recommendation "${name.trim()}" not found.`, "not_found");
  }
  return removeRecommendation(db, guildId, row.id);
}

export function addGame(
  db: Database,
  input: {
    guildId: string;
    name: string;
    link?: string | null;
    status?: GameStatus;
    recommendationId?: number | null;
  },
): GameRow {
  const name = input.name.trim();
  if (!name) {
    throw new ServiceError("Game name is required.", "invalid");
  }

  const status = input.status ?? "not_started";
  if (!isGameStatus(status)) {
    throw new ServiceError(`Invalid status: ${status}`, "invalid");
  }

  const createdAt = nowIso();
  const finishedAt = terminalStatuses().includes(status) ? createdAt : null;

  try {
    const result = db.run(
      `INSERT INTO games (
        guild_id, name, name_normalized, status, link, recommendation_id,
        created_at, updated_at, finished_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.guildId,
        name,
        normalizeName(name),
        status,
        input.link?.trim() || null,
        input.recommendationId ?? null,
        createdAt,
        createdAt,
        finishedAt,
      ],
    );
    const id = Number(result.lastInsertRowid);
    return getGameById(db, input.guildId, id)!;
  } catch (error) {
    if (isSqliteUnique(error)) {
      throw new ServiceError(`"${name}" is already on the games list.`, "duplicate");
    }
    throw error;
  }
}

export function listGames(
  db: Database,
  guildId: string,
  status?: GameStatus,
): GameRow[] {
  if (status) {
    return db
      .query<GameRow, [string, string]>(
        `SELECT id, guild_id, name, status, link, recommendation_id, created_at, updated_at, finished_at
         FROM games WHERE guild_id = ? AND status = ? ORDER BY name COLLATE NOCASE`,
      )
      .all(guildId, status);
  }

  return db
    .query<GameRow, [string]>(
      `SELECT id, guild_id, name, status, link, recommendation_id, created_at, updated_at, finished_at
       FROM games WHERE guild_id = ? ORDER BY name COLLATE NOCASE`,
    )
    .all(guildId);
}

export function getGameById(
  db: Database,
  guildId: string,
  id: number,
): GameRow | null {
  const row = db
    .query<
      Omit<GameRow, "status"> & { status: string },
      [string, number]
    >(
      `SELECT id, guild_id, name, status, link, recommendation_id, created_at, updated_at, finished_at
       FROM games WHERE guild_id = ? AND id = ?`,
    )
    .get(guildId, id);

  if (!row || !isGameStatus(row.status)) {
    return null;
  }

  return { ...row, status: row.status };
}

export function findGameByName(
  db: Database,
  guildId: string,
  name: string,
): GameRow | null {
  const row = db
    .query<
      Omit<GameRow, "status"> & { status: string },
      [string, string]
    >(
      `SELECT id, guild_id, name, status, link, recommendation_id, created_at, updated_at, finished_at
       FROM games WHERE guild_id = ? AND name_normalized = ?`,
    )
    .get(guildId, normalizeName(name));

  if (!row || !isGameStatus(row.status)) {
    return null;
  }

  return { ...row, status: row.status };
}

export function updateGameStatus(
  db: Database,
  guildId: string,
  id: number,
  status: GameStatus,
): GameRow {
  if (!isGameStatus(status)) {
    throw new ServiceError(`Invalid status: ${status}`, "invalid");
  }

  const existing = getGameById(db, guildId, id);
  if (!existing) {
    throw new ServiceError(`Game G#${id} not found.`, "not_found");
  }

  const updatedAt = nowIso();
  let finishedAt = existing.finished_at;
  if (terminalStatuses().includes(status)) {
    finishedAt = updatedAt;
  } else if (status === "in_progress" || status === "not_started") {
    finishedAt = null;
  }

  db.run(
    `UPDATE games SET status = ?, updated_at = ?, finished_at = ? WHERE guild_id = ? AND id = ?`,
    [status, updatedAt, finishedAt, guildId, id],
  );

  return getGameById(db, guildId, id)!;
}

export function removeGame(db: Database, guildId: string, id: number): GameRow {
  const row = getGameById(db, guildId, id);
  if (!row) {
    throw new ServiceError(`Game G#${id} not found.`, "not_found");
  }
  db.run("DELETE FROM games WHERE guild_id = ? AND id = ?", [guildId, id]);
  return row;
}

export function removeGameByName(
  db: Database,
  guildId: string,
  name: string,
): GameRow {
  const row = findGameByName(db, guildId, name);
  if (!row) {
    throw new ServiceError(`Game "${name.trim()}" not found.`, "not_found");
  }
  return removeGame(db, guildId, row.id);
}

export function promoteRecommendationToGame(
  db: Database,
  input: {
    guildId: string;
    recommendationId?: number;
    name?: string;
    status?: GameStatus;
  },
): GameRow {
  let recommendation: RecommendationRow | null = null;

  if (input.recommendationId != null) {
    recommendation = getRecommendationById(db, input.guildId, input.recommendationId);
  } else if (input.name) {
    recommendation = findRecommendationByName(db, input.guildId, input.name);
  }

  if (!recommendation) {
    throw new ServiceError("Recommendation not found.", "not_found");
  }

  db.exec("BEGIN");
  try {
    const game = addGame(db, {
      guildId: input.guildId,
      name: recommendation.name,
      link: recommendation.link,
      status: input.status ?? "not_started",
      recommendationId: recommendation.id,
    });
    db.run(
      "DELETE FROM recommendations WHERE guild_id = ? AND id = ?",
      [input.guildId, recommendation.id],
    );
    db.exec("COMMIT");
    return game;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function isSqliteUnique(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "SQLITE_CONSTRAINT_UNIQUE"
  );
}
