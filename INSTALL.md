# AutoPM — Installation Guide

No API keys needed. AutoPM runs entirely locally using your MCP client (Claude Desktop, Claude Code, Cursor, etc.) as the LLM.

---

## Prerequisites

- **Node.js v20 or later** — [nodejs.org/en/download](https://nodejs.org/en/download)
- An MCP-compatible client — Claude Desktop, Claude Code, Cursor, Roo Code, or any client supporting MCP stdio servers

---

## Step 1: Get the code

```bash
git clone https://github.com/fluidumber/AutoPM.git
cd AutoPM
```

---

## Step 2: Install dependencies

```bash
npm install
```

This installs all four runtime packages declared in `package.json`:

| Package | Purpose |
|---------|---------|
| `@modelcontextprotocol/sdk` | MCP protocol — server + stdio transport |
| `express` | HTTP server (used by the experiment viewer UI) |
| `nodemailer` | Optional email notifications for process improvement suggestions |
| `zod` | Input schema validation for all MCP tools |

---

## Step 3: Wire up your MCP client

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "productflow": {
      "command": "node",
      "args": ["/absolute/path/to/AutoPM/src/mcp-server.js"]
    }
  }
}
```

Restart Claude Desktop. You'll see AutoPM tools appear in the tool selector.

### Claude Code (CLI)

```bash
claude mcp add productflow -- node /absolute/path/to/AutoPM/src/mcp-server.js
```

### Cursor

Go to **Settings → Features → MCP** and add:

```json
{
  "mcpServers": {
    "productflow": {
      "command": "node",
      "args": ["/absolute/path/to/AutoPM/src/mcp-server.js"]
    }
  }
}
```

### Roo Code (VS Code)

Open MCP settings and add:

```json
"mcpServers": {
  "productflow": {
    "command": "node",
    "args": ["/absolute/path/to/AutoPM/src/mcp-server.js"]
  }
}
```

---

## Step 4: Start a session

In your MCP client, ask AutoPM to get started:

> **"Use AutoPM to help me build a product strategy"**

AutoPM will automatically call the `greet` tool which will:
- Show you where it stores data (`~/.productflow/` by default)
- Check if a PM profile exists and walk you through creating one if not
- Ask you to accept the Terms of Service (once per persona)
- List any existing products and help you pick one or create a new one
- Guide you step by step through Phase 1 → Phase 2 → PDD

---

## Optional: Environment variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `PRODUCTFLOW_HOME` | Override where AutoPM stores workspace data | `~/.productflow` |
| `PRODUCTFLOW_OWNER_EMAIL` | Email address to receive process improvement alerts | _(unset — notifications disabled)_ |
| `SMTP_HOST` | SMTP server hostname for notifications | `localhost` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | _(none)_ |
| `SMTP_PASS` | SMTP password | _(none)_ |
| `SMTP_SECURE` | Set to `"true"` for TLS | `false` |
| `NOTIFICATION_THRESHOLD` | Min feedback events before an email is sent | `3` |

Set these in a `.env` file in the project root or export them in your shell before starting the server.

---

## Where data is stored

All data is local — nothing is sent to the internet unless you configure SMTP notifications.

```
~/.productflow/          (or $PRODUCTFLOW_HOME)
  profiles/
    active.json          ← tracks which persona is active
    <slug>/
      profile.md         ← your PM profile (role, industry, frameworks)
  products/
    <slug>/
      product.md         ← product metadata
      freshness.json     ← robot staleness tracking
      context/           ← interview answers, notes, research documents
      assets/            ← robot output files + PDD exports
```

```
<project-root>/data/
  brain-database.json    ← robot ratings, learned patterns, process suggestions
```

---

## Running tests

```bash
npm test
```

---
## What robots are available?

Run `robots-list` in your MCP session, or see [README.md](README.md) for the full list.

---

## Cockpit UI: Navigation & Custom Local Domain Setup

The ProductFlow Cockpit UI supports full URL routing, browser history (Back/Forward navigation), page-refresh persistence, and deep-linking via a hash-based routing system.

### Custom Local Domain (`autopm.ai`)
Instead of accessing the Cockpit UI via `http://localhost:4321`, you can configure your machine to access it via a custom local domain: **`http://autopm.ai`**.

#### Step 1: Map the domain locally on macOS
1. Open a terminal.
2. Edit your system's hosts file:
   ```bash
   sudo nano /etc/hosts
   ```
3. Add the following entry at the bottom of the file:
   ```text
   127.0.0.1 autopm.ai
   ```
4. Save and exit (`Ctrl + O`, `Enter`, then `Ctrl + X`).

#### Step 2: Start the server
You have two options for starting the HTTP Cockpit server:

* **Option A: Run on Port 4321 (Default)**
  Start the server normally:
  ```bash
  npm run http
  ```
  Access it in the browser at: [http://autopm.ai:4321](http://autopm.ai:4321)

* **Option B: Run on Port 80 (No port number in URL)**
  Port 80 is a privileged port, so you must start Node with `sudo` permissions:
  ```bash
  sudo PRODUCTFLOW_HTTP_PORT=80 node src/http-server.js
  ```
  Access it in the browser directly at: [http://autopm.ai](http://autopm.ai)