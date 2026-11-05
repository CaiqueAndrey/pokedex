/**
 * Entry point: `yarn mcp`. Speaks MCP over stdio, so stdout belongs to the protocol — anything
 * else printed there corrupts the JSON-RPC stream. Logs go to stderr (`console.error`).
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createPokedexMcpServer, SERVER_NAME } from "./create-server";

async function main() {
  const server = createPokedexMcpServer();
  const transport = new StdioServerTransport();

  let closing = false;
  const shutdown = async (reason: string) => {
    if (closing) return;
    closing = true;
    console.error(`[${SERVER_NAME}] shutting down (${reason})`);
    await server.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  // The client closing our stdin is the normal way a stdio session ends.
  process.stdin.on("end", () => void shutdown("stdin closed"));

  await server.connect(transport);
  console.error(`[${SERVER_NAME}] MCP server running on stdio`);
}

main().catch((error: unknown) => {
  console.error(`[${SERVER_NAME}] fatal:`, error);
  process.exit(1);
});
