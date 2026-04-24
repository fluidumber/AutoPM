import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");

// Make sure data folder exists
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
        console.error("Error creating data directory:", error);
    }
}

// Save data to file
export async function saveData(filename, data) {
    await ensureDataDir();
    const filepath = path.join(DATA_DIR, filename);

    try {
        await fs.writeFile(filepath, JSON.stringify(data, null, 2));
        console.log(`💾 Saved: ${filename}`);
        return true;
    } catch (error) {
        console.error("Error saving file:", error);
        return false;
    }
}

// Load data from file
export async function loadData(filename) {
    const filepath = path.join(DATA_DIR, filename);

    try {
        const data = await fs.readFile(filepath, "utf-8");
        console.log(`📂 Loaded: ${filename}`);
        return JSON.parse(data);
    } catch (error) {
        console.log(`📂 No previous data for: ${filename}`);
        return null;
    }
}

// List all saved files
export async function listSavedData() {
    try {
        const files = await fs.readdir(DATA_DIR);
        return files;
    } catch (error) {
        return [];
    }
}