import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
} from "discord.js";
import { config } from "./config.ts";
import { getDb, closeDb } from "./db/client.ts";
import { handleInteraction } from "./discord/handlers/interactions.ts";
import { handleMention } from "./discord/handlers/mentions.ts";
import { registerCommands } from "./discord/registerCommands.ts";
import { logError, logInfo } from "./log.ts";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, async (readyClient) => {
  getDb();
  await registerCommands(readyClient.user.id);
  logInfo("Bot ready", {
    user: readyClient.user.tag,
    guilds: readyClient.guilds.cache.size,
    database: config.databasePath,
    commandScope: config.discordGuildId ? "guild" : "global",
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }
  try {
    await handleInteraction(interaction);
  } catch (error) {
    logError("Unhandled interaction error", { command: interaction.commandName }, error);
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !client.user) {
    return;
  }
  if (!message.mentions.users.has(client.user.id)) {
    return;
  }
  try {
    await handleMention(message, client.user.id);
  } catch (error) {
    logError("Unhandled mention error", { guildId: message.guildId ?? undefined }, error);
  }
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  logInfo("Shutting down", { signal });

  try {
    if (client.isReady()) {
      await client.destroy();
      logInfo("Disconnected from Discord; bot is offline");
    } else {
      client.destroy();
      logInfo("Discord client destroyed before ready");
    }
    closeDb();
    logInfo("Shutdown complete");
    process.exit(0);
  } catch (error) {
    logError("Shutdown failed", { signal }, error);
    process.exit(1);
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void shutdown(signal);
  });
}

logInfo("Connecting to Discord…");
await client.login(config.discordToken);
