function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
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
- Use add_note / list_notes for dated notes about a specific game (session thoughts, who liked it, what to try next, etc.).
- Use remove_* only when asked to delete entries.

Never invent the recommender: use the Discord user from context for add_recommendation and add_note.
After changes, briefly summarize what you did. Mention that /show-list displays R# and G# ids for /update-status, /notes, /list-notes, and /remove.`;

export const config = {
  discordToken: requireEnv("DISCORD_TOKEN"),
  discordGuildId: process.env.DISCORD_GUILD_ID ?? "",

  llmBaseUrl: requireEnv("LLM_BASE_URL"),
  llmModel: requireEnv("LLM_MODEL"),
  llmApiKey: process.env.LLM_API_KEY ?? "",
  llmSystemPrompt: process.env.LLM_SYSTEM_PROMPT ?? DEFAULT_LLM_SYSTEM_PROMPT,

  databasePath: process.env.DATABASE_PATH ?? "./data/games.db",
};
