import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "fs/promises";
const originalTool = McpServer.prototype.tool;
const tools = [];
McpServer.prototype.tool = function(name, ...args) {
    tools.push(name);
    return originalTool.apply(this, [name, ...args]);
};
import("./src/mcp-server.js").then(() => {
    console.log("Registered tools:", tools.length);
    console.log(tools.join(", "));
    process.exit(0);
}).catch(e => console.error(e));
