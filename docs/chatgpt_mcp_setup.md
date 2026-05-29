# ChatGPT MCP Integration Guide (SSE Bridge)

This document provides instructions and code to expose the ProductFlow stdio MCP server over Server-Sent Events (SSE), allowing integration with ChatGPT Developer Mode.

## The SSE Bridge Script

Create a file named `src/mcp-sse-server.js` with the following content when you are ready to use it:

```javascript
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { registerTools } from "./mcp-server-tools.js"; // Or import server setup from mcp-server.js

const app = express();
const PORT = process.env.PORT || 4322;

// Initialize MCP Server instance
const mcpServer = new McpServer({
  name: "ProductFlow",
  version: "1.0.0",
});

// Register all your tools here (similar to src/mcp-server.js)
// Example:
// mcpServer.tool("greet", { name: z.string() }, async ({ name }) => { ... });

let transport;

app.get("/sse", async (req, res) => {
  console.log("New connection to SSE endpoint");
  transport = new SSEServerTransport("/messages", res);
  await mcpServer.connect(transport);
});

app.post("/messages", async (req, res) => {
  console.log("Received message on HTTP endpoint");
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("No active SSE session");
  }
});

app.listen(PORT, () => {
  console.log(`ProductFlow MCP SSE Server running on http://localhost:${PORT}`);
  console.log(`SSE Route: http://localhost:${PORT}/sse`);
  console.log(`Message Route: http://localhost:${PORT}/messages`);
});
```

> [!NOTE]
> Since `src/mcp-server.js` instantiates its own `McpServer` and starts a stdio loop immediately, you should refactor it to separate the *tool definitions* from the *transport activation* if you want to share tool definitions between stdio (Claude) and SSE (ChatGPT) cleanly.

---

## Step-by-Step Setup

### Step 1: Install Express
Install Express in this project if it isn't already:
```bash
npm install express
```

### Step 2: Run the SSE Server
Run the bridge server locally:
```bash
node src/mcp-sse-server.js
```

### Step 3: Tunnel via Ngrok (or alternative)
Because ChatGPT runs in the cloud, it cannot resolve `localhost` directly. You will need to expose your local port (e.g. `4322`) to a public URL:
```bash
ngrok http 4322
```
This will give you a public URL (e.g., `https://abcdef123.ngrok-free.app`).

### Step 4: Register in ChatGPT
1. Go to **ChatGPT** on the web.
2. Ensure you have **Developer Mode** enabled (under settings/beta features).
3. Under the custom Apps or Developer settings, choose to register a new connector/app.
4. Input your public tunnel URL with the `/sse` route:
   `https://abcdef123.ngrok-free.app/sse`
5. Save the configuration. ChatGPT will connect and inspect the tools available.
