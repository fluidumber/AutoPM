# AutoPM 🚀

AutoPM is an agentic MCP server that transforms raw business ideas into complete product strategies. It orchestrates a specialized AI team to handle real-time market research, competitive deep-dives, persona building, and dynamic financial modeling, culminating in a fully-styled, pitch-ready presentation.

> **🟢 New to this?** Check out the [Quick Start Guide for Beginners](QUICKSTART.md) for step-by-step setup instructions!

## The Two-Phased Agentic Approach

Real-world Product Management requires distinguishing between *finding the right thing to build* and *defining how to build it right*. AutoPM mirrors this exact discipline through a strictly gated, two-phased workflow:

1. **Phase 1: Strategic Discovery** ensures you are solving a real problem in a viable market before writing a single requirement. This phase answers the "Why?" and "Who?" through competitive intelligence, financial modeling, and roadmap prioritization.
2. **Phase 2: Execution Definition** takes the validated strategy and translates it into rigorous engineering and design constraints. It answers the "What?" and "How?" by generating technical specifications, user stories, risk matrices, and success metrics.

By enforcing Phase 1 as a prerequisite for Phase 2, AutoPM prevents the most common PM trap: rushing into solution design and feature-building without a validated market strategy.

## Features

- **The Robot Pipeline**:
  - **Phase 1: Strategic Discovery**
    - **Interview Robot 🎤** - Dynamic, interactive context-gathering interview to lock in the product idea.
    - **Scout Robot 🔭** - Market demand analysis (TAM/SAM/SOM, growth signals, demand validation)
    - **Detective Robot 🔎** - Competitive intelligence (competitors, gaps, moat, positioning)
    - **People Robot 👥** - User personas (segments, pain points, motivations, buying triggers)
    - **Money Robot 💰** - Financial projections (unit economics, revenue models, 3-scenario forecast)
    - **Feature Robot 📝** - Feature breakdown (must-have, nice-to-have, future, with WHY/WHEN)
    - **Plan Robot 🗺️** - Product roadmap (phased 18-month plan with milestones, dependencies)
    - **Priority Robot ⭐** - Feature prioritisation (RICE scoring with principled reasoning)
  - **Phase 2: Execution Definition**
    - **User Stories Robot 📖** - Epic and user story generation with acceptance criteria.
    - **Scope Spec Robot 🎯** - Strict scope definition, out-of-scope boundaries, and requirements.
    - **Customer Journeys Robot 🛤️** - End-to-end journey mapping across touchpoints.
    - **Feasibility Tech Robot ⚙️** - Technical architecture evaluation and constraints.
    - **Feasibility Design Robot 🎨** - UX/UI constraints, guidelines, and design complexity.
    - **KPIs Robot 📈** - Success metrics, instrumentation strategies, and target baselines.
    - **Data Privacy Robot 🛡️** - Security, compliance (GDPR/CCPA), and privacy risks.
    - **GTM Readiness Robot 🚀** - Go-to-market strategy, launch phases, and marketing channels.
    - **Risks Registry Robot ⚠️** - Comprehensive risk matrix and mitigation strategies.
    - **DACI Stakeholders Robot 🤝** - Stakeholder alignment (Driver, Approver, Contributor, Informed).
- **Agentic Presentation Generator**: A specialized workflow instructing Claude to act as an expert UI designer to draft and deploy beautiful, custom HTML/CSS pitch-deck presentations directly to your filesystem.
- **Claude Desktop MCP Integration**: Use the agents right out of the Claude MacOS/Windows desktop app.

## How to Run

### Via Claude Desktop (MCP integration)
1. Open your Claude Desktop settings config file (`claude_desktop_config.json`).
2. Point a new server at the Absolute Path of this project with `command: "node"` and `args: ["/absolute/path/to/AutoPM/src/mcp-server.js"]`.
3. Start the workflow using the `interview` tool, iterate via `run-robot`, and export using `generate-presentation`!

### Via Other MCP Clients (Cursor, Roo Code, ChatGPT, etc.)
Because AutoPM is built on the standard **Model Context Protocol (MCP)**, you can use it with any compatible client!
- **ChatGPT macOS Desktop App**: Open or create `~/Library/Application Support/OpenAI/ChatGPT/mcp.json` and add the `productflow` server configuration similar to Claude Desktop (command: `node`, args: `["/absolute/path/to/AutoPM/src/mcp-server.js"]`). Restart the app.
- **Cursor**: Go to Settings -> Features -> MCP. Add a new MCP server. Type: `command`, Command: `node`, Args: `/absolute/path/to/AutoPM/src/mcp-server.js`.
- **Roo Code (VS Code)**: Open MCP Settings and add a configuration similar to Claude Desktop:
  ```json
  "mcpServers": {
    "productflow": {
      "command": "node",
      "args": ["/absolute/path/to/AutoPM/src/mcp-server.js"]
    }
  }
  ```

### Via standard CLI
1. Ensure Node.js (v20+) is installed 
2. `npm install`
3. Update `run.js` to change your target product idea
4. Run: `node run.js`

## Key Folders

- `src/` - Core MCP Server implementation (`mcp-server.js`)
- `robots/` - The specialized autonomous agent logic
- `brain/` - Persistent memory, agent instructions, and user feedback engine
- `leader/` - TeamLeader orchestrator managing the flow
- `utils/` - Output engines and file tooling
- `plans/` - Auto-generated HTML presentation deliverables

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