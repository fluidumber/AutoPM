# AutoPM 🚀

AutoPM is an agentic MCP server that transforms raw business ideas into complete product strategies. It orchestrates a specialized AI team to handle real-time market research, competitive deep-dives, persona building, and dynamic financial modeling, culminating in a fully-styled, pitch-ready presentation.

## Features

- **Dynamic Interactive Interview**: An Interview robot asks targeted context-gathering questions dynamically based on clarity and detail.
- **Autonomous Analytical Robots**:
  - **Scout Robot 🔭** - Market demand analysis (TAM/SAM/SOM, growth signals, demand validation)
  - **Detective Robot 🔎** - Competitive intelligence (competitors, gaps, moat, positioning)
  - **People Robot 👥** - User personas (segments, pain points, motivations, buying triggers)
  - **Money Robot 💰** - Financial projections (unit economics, revenue models, 3-scenario forecast)
  - **Feature Robot 📝** - Feature breakdown (must-have, nice-to-have, future, with WHY/WHEN)
  - **Plan Robot 🗺️** - Product roadmap (phased 18-month plan with milestones, dependencies)
  - **Priority Robot ⭐** - Feature prioritisation (RICE scoring with principled reasoning)
- **Agentic Presentation Generator**: A specialized workflow instructing Claude to act as an expert UI designer to draft and deploy beautiful, custom HTML/CSS pitch-deck presentations directly to your filesystem.
- **Claude Desktop MCP Integration**: Use the agents right out of the Claude MacOS/Windows desktop app.

## How to Run

### Via Claude Desktop (MCP integration)
1. Open your Claude Desktop settings config file (`claude_desktop_config.json`).
2. Point a new server at the Absolute Path of this project with `command: "node"` and `args: ["/absolute/path/to/AutoPM/src/mcp-server.js"]`.
3. Start the workflow using the `interview` tool, iterate via `run-robot`, and export using `generate-presentation`!

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