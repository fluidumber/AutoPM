import fs from "fs/promises";
import path from "path";
import { packageHtml } from "./utils/html-renderer.js";

async function main() {
    const scoutPath = "/Users/anandshrivastava/.productflow/products/styleiq-ai-wardrobe-style-co-pilot/assets/asks/core/2026-05-30-scout-output.md";
    const scoutHtmlPath = scoutPath.replace(".md", ".html");

    const scoutContent = await fs.readFile(scoutPath, "utf-8");
    const htmlContent = packageHtml(scoutContent, "scout - styleiq-ai-wardrobe-style-co-pilot");
    await fs.writeFile(scoutHtmlPath, htmlContent, "utf-8");
    console.log("Scout HTML generated.");
}

main().catch(console.error);
