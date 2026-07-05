# install.ps1
# Requires PowerShell 5+

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResourcesAppDir = Join-Path $ScriptDir "app"
$ResourcesNodeExe = Join-Path $ScriptDir "node.exe"

$InstallDir = Join-Path $HOME ".productflow-app"

# 1. Ask for confirmation
$wshell = New-Object -ComObject Wscript.Shell
$title = "ProductFlow Installer"
$msg = "Welcome to ProductFlow Installer.`n`nThis will install the ProductFlow MCP server to your PC and configure it for use with Claude Desktop and Codex."
$answer = $wshell.Popup($msg, 0, $title, 1 + 64) # OK (1) + Information Icon (64)

if ($answer -ne 1) {
    Exit
}

$msgPermission = "ProductFlow needs permission to automatically configure your Claude Desktop and Codex config files.`n`nDo you allow this?"
$answerPermission = $wshell.Popup($msgPermission, 0, $title, 4 + 32) # Yes (6) / No (7) + Question Icon (32)

if ($answerPermission -ne 6) {
    Exit
}

# Create installation dir and copy files
if (Test-Path $InstallDir) {
    Remove-Item -Recurse -Force $InstallDir\*
} else {
    New-Item -ItemType Directory -Path $InstallDir -Force
}

Copy-Item -Path $ResourcesNodeExe -Destination (Join-Path $InstallDir "node.exe") -Force
Copy-Item -Path (Join-Path $ResourcesAppDir "*") -Destination $InstallDir -Recurse -Force

# Setup Claude Desktop Config
$ClaudeConfigDir = Join-Path $env:APPDATA "Claude"
$ClaudeConfigFile = Join-Path $ClaudeConfigDir "claude_desktop_config.json"

if (!(Test-Path $ClaudeConfigDir)) {
    New-Item -ItemType Directory -Path $ClaudeConfigDir -Force
}

# Node script inline to modify JSON on Windows
$NodeExe = Join-Path $InstallDir "node.exe"
$McpServerJs = (Join-Path $InstallDir "src/mcp-server.js").Replace("\", "/")
$ClaudeConfigFileNormalized = $ClaudeConfigFile.Replace("\", "/")

# We can run the bundled node to parse and modify the configuration safely
$NodeScript = @"
const fs = require('fs');
const file = '$ClaudeConfigFileNormalized';
let config = {};
try { config = JSON.parse(fs.readFileSync(file, 'utf8')); } catch(e) { config = { mcpServers: {} }; }
if (!config.mcpServers) config.mcpServers = {};
config.mcpServers['productflow-installed'] = {
    command: '$($NodeExe.Replace("\", "/"))',
    args: ['$McpServerJs']
};
fs.writeFileSync(file, JSON.stringify(config, null, 2));
"@

Start-Process -FilePath $NodeExe -ArgumentList "-e", "`"$NodeScript`"" -NoNewWindow -Wait

# Setup Codex Config (~/.config/codex/config.toml)
$CodexConfigDir = Join-Path $HOME ".config\codex"
$CodexConfigFile = Join-Path $CodexConfigDir "config.toml"

if (!(Test-Path $CodexConfigDir)) {
    New-Item -ItemType Directory -Path $CodexConfigDir -Force
}

if (!(Test-Path $CodexConfigFile)) {
    New-Item -ItemType File -Path $CodexConfigFile -Force
}

$CodexContent = Get-Content $CodexConfigFile -Raw
if ($CodexContent -notmatch "\[mcpServers\.productflow-installed\]") {
    $TomlToAppend = "`r`n[mcpServers.productflow-installed]`r`ncommand = `"$($NodeExe.Replace('\', '/'))`"`r`nargs = [`"$McpServerJs`"]`r`n"
    Add-Content -Path $CodexConfigFile -Value $TomlToAppend
}

# Setup Claude Code Config (~/.claude.json)
$ClaudeCodeConfigFile = Join-Path $HOME ".claude.json"
if (Test-Path $ClaudeCodeConfigFile) {
    $ClaudeCodeNormalized = $ClaudeCodeConfigFile.Replace("\", "/")
    $NodeScriptCode = @"
const fs = require('fs');
const file = '$ClaudeCodeNormalized';
let config = {};
try { config = JSON.parse(fs.readFileSync(file, 'utf8')); } catch(e) {}
if (!config.mcpServers) config.mcpServers = {};
config.mcpServers['productflow-installed'] = {
    command: '$($NodeExe.Replace("\", "/"))',
    args: ['$McpServerJs']
};
fs.writeFileSync(file, JSON.stringify(config, null, 2));
"@
    Start-Process -FilePath $NodeExe -ArgumentList "-e", "`"$NodeScriptCode`"" -NoNewWindow -Wait
}

$wshell.Popup("Installation successful!`n`nProductFlow is now ready to use.", 0, $title, 64)
