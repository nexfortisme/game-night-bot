import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { config } from "../config.ts";
import { type McpRequestContext } from "../mcp/context.ts";
import { createMcpSession } from "../mcp/runtime.ts";
import { getDb } from "../db/client.ts";
import { logInfo } from "../log.ts";
import {
  type ChatMessage,
  type OpenAiTool,
  createChatCompletion,
} from "./openai.ts";

const MAX_ROUNDS = 10;

function mcpToolsToOpenAi(
  tools: Awaited<ReturnType<Client["listTools"]>>["tools"],
): OpenAiTool[] {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema ?? { type: "object", properties: {} },
    },
  }));
}

export async function runMentionAgent(
  ctx: McpRequestContext,
  userMessage: string,
): Promise<string> {
  const db = getDb();
  const session = await createMcpSession(db, ctx);

  try {
    const { tools } = await session.client.listTools();
    const openAiTools = mcpToolsToOpenAi(tools);

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `${config.llmSystemPrompt}\n\nContext: guildId=${ctx.guildId}, userId=${ctx.userId}, displayName=${ctx.displayName}`,
      },
      { role: "user", content: userMessage },
    ];

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const assistant = await createChatCompletion({
        messages,
        tools: openAiTools,
      });

      if (assistant.tool_calls?.length) {
        messages.push({
          role: "assistant",
          content: assistant.content,
          tool_calls: assistant.tool_calls,
        });

        for (const call of assistant.tool_calls) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(call.function.arguments || "{}") as Record<
              string,
              unknown
            >;
          } catch {
            args = {};
          }

          logInfo("Mention agent tool call", {
            guildId: ctx.guildId,
            userId: ctx.userId,
            tool: call.function.name,
          });

          const result = await session.client.callTool({
            name: call.function.name,
            arguments: args,
          });

          const contentParts = Array.isArray(result.content) ? result.content : [];
          const textParts = contentParts
            .filter(
              (part): part is { type: "text"; text: string } =>
                typeof part === "object" &&
                part !== null &&
                "type" in part &&
                part.type === "text" &&
                "text" in part &&
                typeof part.text === "string",
            )
            .map((part) => part.text);
          const toolContent =
            textParts.join("\n") || JSON.stringify(result.structuredContent ?? result);

          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: toolContent,
          });
        }
        continue;
      }

      if (assistant.content?.trim()) {
        return assistant.content.trim();
      }

      return "Done.";
    }

    return "Stopped after too many tool rounds. Check /show-list for current data.";
  } finally {
    await session.close();
  }
}
