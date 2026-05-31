import express from "express";
import cors from "cors";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { server, initServer } from "./mcp-server.js";

const app = express();
app.use(cors());
const PORT = process.env.PORT || 4322;

let transport;

app.get("/sse", async (req, res) => {
  console.log("New connection to SSE endpoint");
  if (transport) {
    console.log("Closing previous transport...");
    try {
      await server.server.close();
    } catch (e) {
      console.error("Error closing previous transport:", e);
    }
  }
  transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  console.log("Received message on HTTP endpoint");
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("No active SSE session");
  }
});

// Start the HTTP server and ensure the MCP server is initialized
async function startSseServer() {
  await initServer();
  app.listen(PORT, () => {
    console.log(`🚀 ProductFlow MCP SSE Server running on http://localhost:${PORT}`);
    console.log(`SSE Route: http://localhost:${PORT}/sse`);
    console.log(`Message Route: http://localhost:${PORT}/messages`);
  });
}

startSseServer().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
