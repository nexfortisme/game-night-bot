import type { Message } from "discord.js";
import { runMentionAgent } from "../../llm/agent.ts";
import { logError, logInfo } from "../../log.ts";

export async function handleMention(message: Message, botUserId: string): Promise<void> {
  if (!message.guildId) {
    return;
  }

  const withoutMention = message.content
    .replace(new RegExp(`<@!?${botUserId}>`, "g"), "")
    .trim();

  if (!withoutMention) {
    await message.reply(
      "Send a list or instructions after mentioning me — for example games to suggest or add. Use `/show-list` for R# and G# ids.",
    );
    return;
  }

  try {
    if (message.channel.isSendable()) {
      await message.channel.sendTyping();
    }
    logInfo("Mention agent request", {
      guildId: message.guildId,
      userId: message.author.id,
      user: message.author.displayName || message.author.username,
      preview: withoutMention.slice(0, 120),
    });
    const reply = await runMentionAgent(
      {
        guildId: message.guildId,
        userId: message.author.id,
        displayName: message.author.displayName || message.author.username,
      },
      withoutMention,
    );
    logInfo("Mention agent reply", {
      guildId: message.guildId,
      userId: message.author.id,
      length: reply.length,
    });
    await message.reply(reply.slice(0, 2000));
  } catch (error) {
    logError(
      "Mention handler failed",
      {
        guildId: message.guildId,
        userId: message.author.id,
      },
      error,
    );
    await message.reply(
      error instanceof Error
        ? `Could not process that: ${error.message}`
        : "Could not process that message.",
    );
  }
}
