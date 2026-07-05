#!/bin/bash
set -e

# $1 is the POSIX path to the app bundle (e.g. /path/to/ProductFlow Installer.app/)
APP_BUNDLE_PATH="$1"
RESOURCES_PATH="${APP_BUNDLE_PATH}Contents/Resources"

INSTALL_DIR="$HOME/.productflow-app"
mkdir -p "$INSTALL_DIR"

# Copy node binary and app source
rm -rf "$INSTALL_DIR/"*
cp "$RESOURCES_PATH/node" "$INSTALL_DIR/node"
chmod +x "$INSTALL_DIR/node"

cp -R "$RESOURCES_PATH/app/"* "$INSTALL_DIR/"

# Setup Claude Desktop Config
CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
CLAUDE_CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"

mkdir -p "$CLAUDE_CONFIG_DIR"

if [ ! -f "$CLAUDE_CONFIG_FILE" ]; then
    echo "{ \"mcpServers\": {} }" > "$CLAUDE_CONFIG_FILE"
fi

"$INSTALL_DIR/node" -e "
const fs = require('fs');
const file = '$CLAUDE_CONFIG_FILE';
let config = {};
try { config = JSON.parse(fs.readFileSync(file, 'utf8')); } catch(e) { config = { mcpServers: {} }; }
if (!config.mcpServers) config.mcpServers = {};
config.mcpServers['productflow-installed'] = {
    command: '$INSTALL_DIR/node',
    args: ['$INSTALL_DIR/src/mcp-server.js']
};
fs.writeFileSync(file, JSON.stringify(config, null, 2));
"

# Setup Codex Config (~/.config/codex/config.toml)
CODEX_CONFIG_DIR="$HOME/.config/codex"
CODEX_CONFIG_FILE="$CODEX_CONFIG_DIR/config.toml"
if [ -d "$CODEX_CONFIG_DIR" ] || [ -f "$CODEX_CONFIG_FILE" ]; then
    mkdir -p "$CODEX_CONFIG_DIR"
    if ! grep -q "\[mcpServers\.productflow-installed\]" "$CODEX_CONFIG_FILE" 2>/dev/null; then
        echo "" >> "$CODEX_CONFIG_FILE"
        echo "[mcpServers.productflow-installed]" >> "$CODEX_CONFIG_FILE"
        echo "command = \"$INSTALL_DIR/node\"" >> "$CODEX_CONFIG_FILE"
        echo "args = [\"$INSTALL_DIR/src/mcp-server.js\"]" >> "$CODEX_CONFIG_FILE"
    fi
fi

# Setup Claude Code Config (~/.claude.json)
CLAUDE_CODE_CONFIG="$HOME/.claude.json"
if [ -f "$CLAUDE_CODE_CONFIG" ]; then
    "$INSTALL_DIR/node" -e "
    const fs = require('fs');
    const file = '$CLAUDE_CODE_CONFIG';
    let config = {};
    try { config = JSON.parse(fs.readFileSync(file, 'utf8')); } catch(e) {}
    if (!config.mcpServers) config.mcpServers = {};
    config.mcpServers['productflow-installed'] = {
        command: '$INSTALL_DIR/node',
        args: ['$INSTALL_DIR/src/mcp-server.js']
    };
    fs.writeFileSync(file, JSON.stringify(config, null, 2));
    "
fi

echo "Success"
