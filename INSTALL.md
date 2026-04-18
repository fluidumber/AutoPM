# ProductFlow Installation

No API keys needed!

## Quick Start

```bash
# Install globally
npm install -g productflow

# Initialize
productflow init

# Start MCP server
productflow mcp
```

## Use with Claude Code

```bash
# In another terminal, register with Claude Code
claude mcp add productflow -- productflow mcp

# Now in Claude Code, just say:
# "Use ProductFlow to analyze a mobile gaming app"
```

## How It Works

- **No API keys** - Claude Code handles authentication
- **7 specialized robots** - Market, Competition, Personas, Finance, Features, Roadmap, Priority
- **Automatic learning** - Robots remember what worked
- **Local data** - All analysis saved locally in ./data/

## Commands

```bash
productflow init              # Initialize
productflow mcp               # Start MCP server
productflow analyze "idea"    # Analyze locally
```

## What Robots Do

1. **Scout Robot** 🔍 - Market demand analysis
2. **Detective Robot** 🔎 - Competitive analysis
3. **People Robot** 👥 - User persona creation
4. **Money Robot** 💰 - Financial projections
5. **Feature Robot** 📝 - Feature generation
6. **Plan Robot** 🗺️ - Roadmap creation
7. **Priority Robot** ⭐ - RICE prioritization

## Claude Code Integration

Once registered with Claude Code: