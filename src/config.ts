function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  }
  
  const DEFAULT_FBI_SYSTEM_PROMPT = `You are a simple bot that helps with game night. You keep track of the game list, our game recommendations, and track the games we have played over time. You respond simply and concisely.`;
  
  export const config = {
    discordToken: requireEnv("DISCORD_TOKEN"),
  
    llmBaseUrl: requireEnv("LLM_BASE_URL"),
    llmModel: requireEnv("LLM_MODEL"),
    llmApiKey: process.env.LLM_API_KEY ?? "",
  
    eyesReactionChance: Number(process.env.EYES_REACTION_CHANCE ?? 0.02),
  
    voiceJoinMinMinutes: Number(process.env.VOICE_JOIN_MIN_MINUTES ?? 30),
    voiceJoinMaxMinutes: Number(process.env.VOICE_JOIN_MAX_MINUTES ?? 120),
    voicePauseMinSeconds: Number(process.env.VOICE_PAUSE_MIN_SECONDS ?? 3),
    voicePauseMaxSeconds: Number(process.env.VOICE_PAUSE_MAX_SECONDS ?? 10),
    voiceJoinRetryCount: Number(process.env.VOICE_JOIN_RETRY_COUNT ?? 3),
  
    fbiSystemPrompt: process.env.FBI_SYSTEM_PROMPT ?? DEFAULT_FBI_SYSTEM_PROMPT,
  };
  