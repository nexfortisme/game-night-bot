import {
  SlashCommandBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import { ServiceError } from "../db/services.ts";
import { GAME_STATUSES, gameStatusChoices } from "../domain/gameStatus.ts";

const showListChoices = [
  { name: "All", value: "all" },
  { name: "Recommendations", value: "recommendations" },
  ...gameStatusChoices(),
];

export const commandPayloads: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
  new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Recommend a game for the group to try")
    .addStringOption((opt) =>
      opt.setName("name").setDescription("Game title").setRequired(true),
    )
    .addStringOption((opt) =>
      opt.setName("link").setDescription("Steam or other link").setRequired(false),
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("add")
    .setDescription("Add a game to the games list (not recommendations)")
    .addStringOption((opt) =>
      opt.setName("name").setDescription("Game title").setRequired(true),
    )
    .addStringOption((opt) =>
      opt.setName("link").setDescription("Optional link").setRequired(false),
    )
    .addStringOption((opt) =>
      opt
        .setName("status")
        .setDescription("Initial status")
        .setRequired(false)
        .addChoices(...gameStatusChoices()),
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Remove an entry by id from /show-list")
    .addStringOption((opt) =>
      opt
        .setName("list")
        .setDescription("Which list")
        .setRequired(true)
        .addChoices(
          { name: "Recommendation", value: "recommendation" },
          { name: "Game", value: "game" },
        ),
    )
    .addIntegerOption((opt) =>
      opt.setName("id").setDescription("R# or G# number without prefix").setRequired(true),
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("show-list")
    .setDescription("Show recommendations and/or games with R# / G# ids")
    .addStringOption((opt) =>
      opt
        .setName("filter")
        .setDescription("What to show")
        .setRequired(false)
        .addChoices(...showListChoices),
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("update-status")
    .setDescription("Update a game status by G# id")
    .addIntegerOption((opt) =>
      opt.setName("id").setDescription("Game id (G#)").setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("status")
        .setDescription("New status")
        .setRequired(true)
        .addChoices(...gameStatusChoices()),
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("notes")
    .setDescription("List or add dated notes for a recommendation (R#) or game (G#)")
    .addStringOption((opt) =>
      opt
        .setName("id")
        .setDescription("Entry id from /show-list, e.g. R#3 or G#12")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("action")
        .setDescription("What to do (defaults to list)")
        .setRequired(false)
        .addChoices(
          { name: "List", value: "list" },
          { name: "Add", value: "add" },
        ),
    )
    .addStringOption((opt) =>
      opt
        .setName("note")
        .setDescription("Note text (required when action is add)")
        .setRequired(false),
    )
    .toJSON(),
];

export type ParsedShowListFilter =
  | "all"
  | "recommendations"
  | (typeof GAME_STATUSES)[number];

export type ParsedEntryId =
  | { kind: "recommendation"; id: number }
  | { kind: "game"; id: number };

export function parseShowListFilter(value: string | undefined): ParsedShowListFilter {
  if (!value || value === "all") {
    return "all";
  }
  if (value === "recommendations") {
    return "recommendations";
  }
  return value as ParsedShowListFilter;
}

/** Parse ids like R#3, r3, G#12, g 12. */
export function parseEntryId(raw: string): ParsedEntryId {
  const match = raw.trim().match(/^(r|g)\s*#?\s*(\d+)$/i);
  if (!match) {
    throw new ServiceError('Expected an id like "R#3" or "G#12".', "invalid");
  }

  const id = Number(match[2]);
  if (!Number.isInteger(id) || id < 1) {
    throw new ServiceError('Expected an id like "R#3" or "G#12".', "invalid");
  }

  return match[1]!.toLowerCase() === "r"
    ? { kind: "recommendation", id }
    : { kind: "game", id };
}
