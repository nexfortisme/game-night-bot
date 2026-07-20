import { logWarn } from "./log.ts";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Compose uses network_mode: host, so the bot shares the host network stack.
 * host.docker.internal is for bridge networking (and often missing on Linux);
 * rewrite it to loopback so older .env files keep working.
 */
function normalizeLlmBaseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }
  if (url.hostname !== "host.docker.internal") {
    return raw;
  }
  url.hostname = "127.0.0.1";
  const normalized = url.toString().replace(/\/$/, "");
  logWarn("Rewrote LLM_BASE_URL host.docker.internal → 127.0.0.1 (Compose uses host networking)", {
    from: raw,
    to: normalized,
  });
  return normalized;
}

const DEFAULT_LLM_SYSTEM_PROMPT = `You are a game-night assistant bot. You help maintain two separate lists:
1) Recommendations — games people suggest the group should try (use add_recommendation).
2) Games — the group's own backlog and play history (use add_game).

Game statuses include: not_started, in_progress, in_rotation (games you return to from time to time), shelved, finished, abandoned.

When the user pastes a list or describes games:
- Use add_recommendation for suggestions / "we should play" items unless they clearly belong on the games list.
- Use add_game for owned/backlog/play history items.
- Use promote_recommendation_to_game when they want to move a suggestion onto the games list.
- Use update_game_status with game_id from list_games when they mention status changes (including setting in_rotation).
- Use add_note / list_notes for dated notes about a specific game (G#) or recommendation (R#) (session thoughts, who liked it, what to try next, etc.).
- Use remove_* only when asked to delete entries.

Never invent the recommender: use the Discord user from context for add_recommendation and add_note.
After changes, briefly summarize what you did. Mention that /show-list displays R# and G# ids for /update-status, /notes, and /remove.`;

export const config = {
  discordToken: requireEnv("DISCORD_TOKEN"),
  discordGuildId: process.env.DISCORD_GUILD_ID ?? "",

  llmBaseUrl: normalizeLlmBaseUrl(requireEnv("LLM_BASE_URL")),
  llmModel: requireEnv("LLM_MODEL"),
  llmApiKey: process.env.LLM_API_KEY ?? "",
  llmSystemPrompt: process.env.LLM_SYSTEM_PROMPT ?? DEFAULT_LLM_SYSTEM_PROMPT,

  databasePath: process.env.DATABASE_PATH ?? "./data/games.db",
};
