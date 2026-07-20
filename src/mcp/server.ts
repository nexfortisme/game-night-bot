import type { Database } from "bun:sqlite";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { gameStatusZod } from "../domain/gameStatus.ts";
import * as services from "../db/services.ts";
import { logInfo } from "../log.ts";
import { type McpRequestContext, textResult } from "./context.ts";

export function createMcpServer(db: Database, ctx: McpRequestContext): McpServer {
  const server = new McpServer({
    name: "game-night-bot",
    version: "1.0.0",
  });

  const actor = {
    guildId: ctx.guildId,
    userId: ctx.userId,
    user: ctx.displayName,
    source: "mention-agent",
  };

  server.registerTool(
    "list_recommendations",
    {
      description: "List all game recommendations for this Discord server.",
      inputSchema: {},
    },
    async () => {
      const rows = services.listRecommendations(db, ctx.guildId);
      return textResult(rows);
    },
  );

  server.registerTool(
    "add_recommendation",
    {
      description: "Add a game recommendation. Recommender is the Discord user from context.",
      inputSchema: {
        name: z.string().describe("Game title"),
        link: z.string().optional().describe("Optional store or info URL"),
      },
    },
    async ({ name, link }) => {
      const row = services.addRecommendation(db, {
        guildId: ctx.guildId,
        name,
        link: link ?? null,
        recommendedByUserId: ctx.userId,
        recommendedByDisplay: ctx.displayName,
      });
      logInfo("Added recommendation", { ...actor, id: row.id, name: row.name });
      return textResult({ ok: true, recommendation: row });
    },
  );

  server.registerTool(
    "remove_recommendation",
    {
      description: "Remove a recommendation by id or name.",
      inputSchema: {
        id: z.number().int().positive().optional(),
        name: z.string().optional(),
      },
    },
    async ({ id, name }) => {
      if (id != null) {
        const row = services.removeRecommendation(db, ctx.guildId, id);
        logInfo("Removed recommendation", { ...actor, id: row.id, name: row.name });
        return textResult({ ok: true, removed: row });
      }
      if (name) {
        const row = services.removeRecommendationByName(db, ctx.guildId, name);
        logInfo("Removed recommendation", { ...actor, id: row.id, name: row.name });
        return textResult({ ok: true, removed: row });
      }
      return textResult("Provide id or name.");
    },
  );

  server.registerTool(
    "list_games",
    {
      description:
        "List games on the group's games list, optionally filtered by status. Unfiltered results put in_progress first, then other statuses.",
      inputSchema: {
        status: gameStatusZod.optional(),
      },
    },
    async ({ status }) => {
      const rows = services.listGames(db, ctx.guildId, status);
      return textResult(rows);
    },
  );

  server.registerTool(
    "add_game",
    {
      description: "Add a game to the games list (not the recommendation queue).",
      inputSchema: {
        name: z.string().describe("Game title"),
        link: z.string().optional(),
        status: gameStatusZod.optional().describe("Defaults to not_started"),
      },
    },
    async ({ name, link, status }) => {
      const row = services.addGame(db, {
        guildId: ctx.guildId,
        name,
        link: link ?? null,
        status,
      });
      logInfo("Added game", { ...actor, id: row.id, name: row.name, status: row.status });
      return textResult({ ok: true, game: row });
    },
  );

  server.registerTool(
    "promote_recommendation_to_game",
    {
      description: "Move a recommendation onto the games list and remove it from recommendations.",
      inputSchema: {
        recommendation_id: z.number().int().positive().optional(),
        name: z.string().optional(),
        status: gameStatusZod.optional().describe("Initial game status, default not_started"),
      },
    },
    async ({ recommendation_id, name, status }) => {
      const row = services.promoteRecommendationToGame(db, {
        guildId: ctx.guildId,
        recommendationId: recommendation_id,
        name,
        status,
      });
      logInfo("Promoted recommendation to game", {
        ...actor,
        id: row.id,
        name: row.name,
        status: row.status,
      });
      return textResult({ ok: true, game: row });
    },
  );

  server.registerTool(
    "update_game_status",
    {
      description: "Update status for a game by game_id (G# from list_games).",
      inputSchema: {
        game_id: z.number().int().positive(),
        status: gameStatusZod,
      },
    },
    async ({ game_id, status }) => {
      const row = services.updateGameStatus(db, ctx.guildId, game_id, status);
      logInfo("Updated game status", {
        ...actor,
        id: row.id,
        name: row.name,
        status: row.status,
      });
      return textResult({ ok: true, game: row });
    },
  );

  server.registerTool(
    "remove_game",
    {
      description: "Remove a game from the games list by id or name.",
      inputSchema: {
        id: z.number().int().positive().optional(),
        name: z.string().optional(),
      },
    },
    async ({ id, name }) => {
      if (id != null) {
        const row = services.removeGame(db, ctx.guildId, id);
        logInfo("Removed game", { ...actor, id: row.id, name: row.name });
        return textResult({ ok: true, removed: row });
      }
      if (name) {
        const row = services.removeGameByName(db, ctx.guildId, name);
        logInfo("Removed game", { ...actor, id: row.id, name: row.name });
        return textResult({ ok: true, removed: row });
      }
      return textResult("Provide id or name.");
    },
  );

  server.registerTool(
    "add_note",
    {
      description:
        "Add a dated note for a game (G#) or recommendation (R#). Provide one target by id and/or name. Notes are append-only.",
      inputSchema: {
        game_id: z.number().int().positive().optional().describe("Game id (G#) from list_games"),
        recommendation_id: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Recommendation id (R#) from list_recommendations"),
        name: z.string().optional().describe("Game or recommendation title if id is unknown"),
        note: z.string().describe("Note text to store"),
      },
    },
    async ({ game_id, recommendation_id, name, note }) => {
      if (game_id == null && recommendation_id == null && !name) {
        return textResult("Provide game_id, recommendation_id, or name.");
      }
      if (game_id != null && recommendation_id != null) {
        return textResult("Provide either game_id or recommendation_id, not both.");
      }

      const input =
        recommendation_id != null
          ? {
              recommendationId: recommendation_id,
              recommendationName: name,
            }
          : game_id != null
            ? { gameId: game_id, gameName: name }
            : name
              ? (() => {
                  const game = services.findGameByName(db, ctx.guildId, name);
                  if (game) {
                    return { gameName: name };
                  }
                  return { recommendationName: name };
                })()
              : {};

      const { note: row, target } = services.addNote(db, {
        guildId: ctx.guildId,
        ...input,
        body: note,
        createdByUserId: ctx.userId,
        createdByDisplay: ctx.displayName,
      });
      logInfo("Added note", {
        ...actor,
        noteId: row.id,
        targetKind: target.kind,
        targetId:
          target.kind === "game" ? target.game.id : target.recommendation.id,
        targetName:
          target.kind === "game" ? target.game.name : target.recommendation.name,
      });
      return textResult({ ok: true, note: row, target });
    },
  );

  server.registerTool(
    "list_notes",
    {
      description:
        "List dated notes for a game (G#) or recommendation (R#) by id and/or name.",
      inputSchema: {
        game_id: z.number().int().positive().optional(),
        recommendation_id: z.number().int().positive().optional(),
        name: z.string().optional(),
      },
    },
    async ({ game_id, recommendation_id, name }) => {
      if (game_id == null && recommendation_id == null && !name) {
        return textResult("Provide game_id, recommendation_id, or name.");
      }
      if (game_id != null && recommendation_id != null) {
        return textResult("Provide either game_id or recommendation_id, not both.");
      }

      const input =
        recommendation_id != null
          ? {
              recommendationId: recommendation_id,
              recommendationName: name,
            }
          : game_id != null
            ? { gameId: game_id, gameName: name }
            : name
              ? (() => {
                  const game = services.findGameByName(db, ctx.guildId, name);
                  if (game) {
                    return { gameName: name };
                  }
                  return { recommendationName: name };
                })()
              : {};

      const result = services.listNotes(db, ctx.guildId, input);
      return textResult(result);
    },
  );

  return server;
}
