#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const command = process.argv[2];

switch (command) {
    case "init":
        initProject();
        break;

    case "mcp":
    case "start":
        startMCPServer();
        break;

    case "analyze":
        analyzeProduct();
        break;

    case "--help":
    case "-h":
        showHelp();
        break;

    default:
        showHelp();
}

function initProject() {
    console.log("🚀 Initializing ProductFlow...\n");

    const configPath = path.join(process.cwd(), ".productflow.json");
    const config = {
        initialized: true,
        version: "1.0.0",
        timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log("✅ ProductFlow initialized!");
    console.log("📝 Config saved to: .productflow.json\n");

    console.log("Next steps:");
    console.log('  1. Register with Claude Code:');
    console.log('     claude mcp add productflow -- productflow mcp\n');
    console.log('  2. Use in Claude Code:');
    console.log('     "Analyze a mobile gaming app"');
}

function startMCPServer() {
    const serverPath = path.join(path.dirname(__dirname), "src", "mcp-server.js");

    // Replace this process with the MCP server so stdin/stdout pass
    // through directly — required for stdio-based MCP transport.
    const child = spawn(process.execPath, [serverPath], {
        stdio: "inherit",
    });

    child.on("exit", (code) => process.exit(code ?? 0));
}

function analyzeProduct() {
    const productIdea = process.argv.slice(3).join(" ");
    if (!productIdea) {
        console.log(
            "Please provide a product idea: productflow analyze 'your idea'"
        );
        return;
    }

    const runPath = path.join(path.dirname(__dirname), "run.js");
    spawn("node", [runPath, productIdea], {
        stdio: "inherit",
    });
}

function showHelp() {
    console.log(`
ProductFlow - Product Management Agent Orchestration

Usage:
  productflow init              Initialize ProductFlow
  productflow mcp               Start MCP server
  productflow analyze <idea>    Analyze a product idea
  productflow --help            Show this help

Examples:
  productflow init
  productflow mcp
  productflow analyze "mobile gaming app"

Setup with Claude Code:
  1. Run: productflow init
  2. Run: productflow mcp
  3. In Claude Code, use: "Use ProductFlow to analyze..."

No API keys needed! Claude Code handles authentication.
`);
}