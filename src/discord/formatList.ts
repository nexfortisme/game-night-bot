import type { Database } from "bun:sqlite";
import {
  GAME_STATUSES,
  formatGameStatus,
  type GameStatus,
} from "../domain/gameStatus.ts";
import * as services from "../db/services.ts";

export type ShowListFilter = "all" | "recommendations" | GameStatus;

function formatRecommendationLine(row: services.RecommendationRow): string {
  const link = row.link ? ` — ${row.link}` : "";
  return `R#${row.id} — **${row.name}** (by ${row.recommended_by_display})${link}`;
}

function formatGameLine(row: services.GameRow): string {
  const link = row.link ? ` — ${row.link}` : "";
  return `G#${row.id} — **${row.name}** · ${formatGameStatus(row.status)}${link}`;
}

export function formatNoteDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toISOString().slice(0, 10);
}

function formatNoteLine(row: services.NoteRow): string {
  return `N#${row.id} — ${formatNoteDate(row.created_at)} · ${row.created_by_display}\n${row.body}`;
}

export function buildShowListMessage(
  db: Database,
  guildId: string,
  filter: ShowListFilter,
): string {
  const sections: string[] = [];

  if (filter === "all" || filter === "recommendations") {
    const recs = services.listRecommendations(db, guildId);
    if (filter === "recommendations" || filter === "all") {
      sections.push(
        recs.length
          ? `**Recommendations**\n${recs.map(formatRecommendationLine).join("\n")}`
          : "**Recommendations**\n_(none)_",
      );
    }
  }

  if (filter !== "recommendations") {
    const games =
      filter === "all"
        ? services.listGames(db, guildId)
        : services.listGames(db, guildId, filter);

    if (filter === "all") {
      for (const status of GAME_STATUSES) {
        const group = games.filter((g) => g.status === status);
        const title = formatGameStatus(status);
        sections.push(
          group.length
            ? `**Games — ${title}**\n${group.map(formatGameLine).join("\n")}`
            : `**Games — ${title}**\n_(none)_`,
        );
      }
    } else {
      sections.push(
        games.length
          ? `**Games — ${formatGameStatus(filter)}**\n${games.map(formatGameLine).join("\n")}`
          : `**Games — ${formatGameStatus(filter)}**\n_(none)_`,
      );
    }
  }

  const body = sections.join("\n\n");
  if (body.length <= 1900) {
    return body;
  }

  return `${body.slice(0, 1900)}\n\n…_(truncated; narrow the filter or remove old entries)_`;
}

export function buildNotesListMessage(
  db: Database,
  guildId: string,
  input: { gameId?: number; gameName?: string },
): string {
  const { game, notes } = services.listNotesForGame(db, guildId, input);
  const header = `**Notes for G#${game.id} — ${game.name}**`;
  if (!notes.length) {
    return `${header}\n_(none)_`;
  }

  const body = `${header}\n\n${notes.map(formatNoteLine).join("\n\n")}`;
  if (body.length <= 1900) {
    return body;
  }

  return `${body.slice(0, 1900)}\n\n…_(truncated)_`;
}

export function serviceErrorMessage(error: unknown): string {
  if (error instanceof services.ServiceError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong.";
}
