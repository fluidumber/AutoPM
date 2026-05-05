import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates an interactive HTML viewer for the UserStories robot output.
 * 
 * @param {string} jsonPath - Absolute path to the saved user-stories JSON file
 * @param {Object} jsonData - The parsed JSON data from the robot
 * @returns {Promise<string>} - The path to the generated HTML file
 */
export async function generateExperimentViewer(jsonPath, jsonData) {
    if (!jsonData || !jsonData.experimentClusters) {
        return null; // Not a multi-cluster output, no UI needed
    }

    try {
        const templatePath = path.join(__dirname, 'experiment-viewer-template.html');
        const templateContent = await fs.readFile(templatePath, 'utf-8');

        // Inject the JSON data into the template
        const htmlContent = templateContent.replace(
            '/*INJECT_JSON_HERE*/null',
            JSON.stringify(jsonData)
        ).replace(
            '/*INJECT_JSON_HERE*/{}',
            JSON.stringify(jsonData)
        );

        // Save right next to the JSON file
        const dir = path.dirname(jsonPath);
        const base = path.basename(jsonPath, '.json');
        const htmlPath = path.join(dir, `${base}-viewer.html`);

        await fs.writeFile(htmlPath, htmlContent, 'utf-8');
        return htmlPath;
    } catch (err) {
        console.error("Failed to generate experiment viewer HTML:", err);
        return null;
    }
}
