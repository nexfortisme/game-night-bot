import type { ChatInputCommandInteraction } from "discord.js";
import { MessageFlags } from "discord.js";
import { getDb } from "../../db/client.ts";
import * as services from "../../db/services.ts";
import { isGameStatus, type GameStatus } from "../../domain/gameStatus.ts";
import { logError, logInfo } from "../../log.ts";
import { parseEntryId, parseShowListFilter } from "../commands.ts";
import {
  buildNotesListMessage,
  buildShowListMessage,
  formatNoteDate,
  formatNoteTargetLabel,
  serviceErrorMessage,
} from "../formatList.ts";

function actorMeta(interaction: ChatInputCommandInteraction) {
  return {
    guildId: interaction.guildId ?? undefined,
    userId: interaction.user.id,
    user: interaction.user.displayName || interaction.user.username,
  };
}

function guildIdFrom(interaction: ChatInputCommandInteraction): string {
  if (!interaction.guildId) {
    throw new services.ServiceError("This command only works in a server.", "invalid");
  }
  return interaction.guildId;
}

export async function handleInteraction(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  logInfo(`Slash command /${interaction.commandName}`, actorMeta(interaction));
  await interaction.deferReply();

  try {
    const db = getDb();
    const guildId = guildIdFrom(interaction);

    switch (interaction.commandName) {
      case "suggest": {
        const name = interaction.options.getString("name", true);
        const link = interaction.options.getString("link");
        const row = services.addRecommendation(db, {
          guildId,
          name,
          link,
          recommendedByUserId: interaction.user.id,
          recommendedByDisplay: interaction.user.displayName || interaction.user.username,
        });
        logInfo("Added recommendation", {
          ...actorMeta(interaction),
          id: row.id,
          name: row.name,
        });
        await interaction.editReply(`Added recommendation **R#${row.id}** — ${row.name}.`);
        break;
      }
      case "add": {
        const name = interaction.options.getString("name", true);
        const link = interaction.options.getString("link");
        const statusRaw = interaction.options.getString("status");
        const status: GameStatus | undefined =
          statusRaw && isGameStatus(statusRaw) ? statusRaw : undefined;
        const row = services.addGame(db, {
          guildId,
          name,
          link,
          status,
        });
        logInfo("Added game", {
          ...actorMeta(interaction),
          id: row.id,
          name: row.name,
          status: row.status,
        });
        await interaction.editReply(`Added game **G#${row.id}** — ${row.name} (${row.status}).`);
        break;
      }
      case "remove": {
        const list = interaction.options.getString("list", true);
        const id = interaction.options.getInteger("id", true);
        if (list === "recommendation") {
          const row = services.removeRecommendation(db, guildId, id);
          logInfo("Removed recommendation", {
            ...actorMeta(interaction),
            id: row.id,
            name: row.name,
          });
          await interaction.editReply(`Removed recommendation **R#${row.id}** — ${row.name}.`);
        } else {
          const row = services.removeGame(db, guildId, id);
          logInfo("Removed game", {
            ...actorMeta(interaction),
            id: row.id,
            name: row.name,
          });
          await interaction.editReply(`Removed game **G#${row.id}** — ${row.name}.`);
        }
        break;
      }
      case "show-list": {
        const filter = parseShowListFilter(
          interaction.options.getString("filter") ?? undefined,
        );
        const message = buildShowListMessage(db, guildId, filter);
        logInfo("Show list", { ...actorMeta(interaction), filter });
        await interaction.editReply({
          content: message,
          flags: MessageFlags.SuppressEmbeds,
        });
        break;
      }
      case "update-status": {
        const id = interaction.options.getInteger("id", true);
        const statusRaw = interaction.options.getString("status", true);
        if (!isGameStatus(statusRaw)) {
          throw new services.ServiceError("Invalid status.", "invalid");
        }
        const row = services.updateGameStatus(db, guildId, id, statusRaw);
        logInfo("Updated game status", {
          ...actorMeta(interaction),
          id: row.id,
          name: row.name,
          status: row.status,
        });
        await interaction.editReply(`Updated **G#${row.id}** — ${row.name} → ${row.status}.`);
        break;
      }
      case "notes": {
        const entry = parseEntryId(interaction.options.getString("id", true));
        const noteText = interaction.options.getString("note") ?? undefined;
        const actionRaw = interaction.options.getString("action");
        const action =
          actionRaw === "add" || actionRaw === "list"
            ? actionRaw
            : noteText
              ? "add"
              : "list";

        const targetInput =
          entry.kind === "recommendation"
            ? { recommendationId: entry.id }
            : { gameId: entry.id };

        if (action === "list") {
          const message = buildNotesListMessage(db, guildId, targetInput);
          logInfo("List notes", {
            ...actorMeta(interaction),
            entryKind: entry.kind,
            entryId: entry.id,
          });
          await interaction.editReply(message);
          break;
        }

        if (!noteText?.trim()) {
          throw new services.ServiceError(
            "Provide note text when adding a note.",
            "invalid",
          );
        }

        const { note, target } = services.addNote(db, {
          guildId,
          ...targetInput,
          body: noteText,
          createdByUserId: interaction.user.id,
          createdByDisplay: interaction.user.displayName || interaction.user.username,
        });
        logInfo("Added note", {
          ...actorMeta(interaction),
          noteId: note.id,
          entryKind: entry.kind,
          entryId: entry.id,
          target: formatNoteTargetLabel(target),
        });
        await interaction.editReply(
          `Added note **N#${note.id}** on **${formatNoteTargetLabel(target)}** (${formatNoteDate(note.created_at)}).`,
        );
        break;
      }
      default:
        logInfo("Unknown slash command", actorMeta(interaction));
        await interaction.editReply("Unknown command.");
    }
  } catch (error) {
    logError(`Slash command /${interaction.commandName} failed`, actorMeta(interaction), error);
    await interaction.editReply(serviceErrorMessage(error));
  }
}
