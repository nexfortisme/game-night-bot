import {
  SlashCommandBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
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
];

export type ParsedShowListFilter =
  | "all"
  | "recommendations"
  | (typeof GAME_STATUSES)[number];

export function parseShowListFilter(value: string | undefined): ParsedShowListFilter {
  if (!value || value === "all") {
    return "all";
  }
  if (value === "recommendations") {
    return "recommendations";
  }
  return value as ParsedShowListFilter;
}
