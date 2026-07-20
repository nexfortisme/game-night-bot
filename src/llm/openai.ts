import { config } from "../config.ts";

export type ChatMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: OpenAiToolCall[];
    }
  | { role: "tool"; tool_call_id: string; content: string };

export type OpenAiTool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
};

export type OpenAiToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

type ChatCompletionResponse = {
  choices: {
    message: {
      role: string;
      content: string | null;
      tool_calls?: OpenAiToolCall[];
    };
    finish_reason: string;
  }[];
};

export async function createChatCompletion(input: {
  messages: ChatMessage[];
  tools?: OpenAiTool[];
}): Promise<ChatCompletionResponse["choices"][0]["message"]> {
  const url = `${config.llmBaseUrl.replace(/\/$/, "")}/chat/completions`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.llmApiKey) {
    headers.Authorization = `Bearer ${config.llmApiKey}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.llmModel,
      messages: input.messages,
      tools: input.tools,
      tool_choice: input.tools?.length ? "auto" : undefined,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const choice = data.choices[0];
  if (!choice) {
    throw new Error("LLM returned no choices.");
  }
  return choice.message;
}
