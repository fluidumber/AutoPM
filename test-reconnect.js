import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
const mcpServer = new McpServer({ name: "test", version: "1.0" });
let transport = new SSEServerTransport("/messages", { on: () => {}, write: () => {}, writeHead: () => {}, end: () => {}, setHeader: () => {}, flushHeaders: () => {} });
await mcpServer.connect(transport);
console.log("Connected 1");
await mcpServer.server.close();
let t2 = new SSEServerTransport("/messages", { on: () => {}, write: () => {}, writeHead: () => {}, end: () => {}, setHeader: () => {}, flushHeaders: () => {} });
try {
  await mcpServer.connect(t2);
  console.log("Connected 2");
} catch(e) {
  console.error("Failed:", e.message);
}
