import type { Database } from "bun:sqlite";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { type McpRequestContext } from "./context.ts";
import { createMcpServer } from "./server.ts";

export type McpSession = {
  client: Client;
  close: () => Promise<void>;
};

export async function createMcpSession(
  db: Database,
  ctx: McpRequestContext,
): Promise<McpSession> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createMcpServer(db, ctx);
  const client = new Client({
    name: "game-night-bot-client",
    version: "1.0.0",
  });

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}
