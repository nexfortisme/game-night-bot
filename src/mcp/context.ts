export type McpRequestContext = {
  guildId: string;
  userId: string;
  displayName: string;
};

export function textResult(payload: unknown): {
  content: { type: "text"; text: string }[];
} {
  return {
    content: [
      {
        type: "text",
        text: typeof payload === "string" ? payload : JSON.stringify(payload, null, 2),
      },
    ],
  };
}
