import { REST, Routes } from "discord.js";
import { config } from "../config.ts";
import { logInfo } from "../log.ts";
import { commandPayloads } from "./commands.ts";

export async function registerCommands(clientId: string): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(config.discordToken);

  if (config.discordGuildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, config.discordGuildId), {
      body: commandPayloads,
    });
    logInfo("Registered guild slash commands", {
      count: commandPayloads.length,
      guildId: config.discordGuildId,
    });
    return;
  }

  await rest.put(Routes.applicationCommands(clientId), { body: commandPayloads });
  logInfo("Registered global slash commands", { count: commandPayloads.length });
}
