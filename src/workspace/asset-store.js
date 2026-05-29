// AssetStore — persists robot analysis results to a product's assets/ folder
// as human-readable markdown, with the raw JSON embedded.
//
// Filename pattern: YYYY-MM-DD-<robot>.md (one per robot per day; new runs
// overwrite the same day's file).

import fs from "fs/promises";
import path from "path";

export class AssetStore {
    /**
     * @param {import('./workspace-manager.js').WorkspaceManager} workspace
     */
    constructor(workspace) {
        this.workspace = workspace;
    }

    /**
     * Save a robot analysis result. Returns the relative path under the
     * product directory (e.g., "assets/2026-04-24-scout.md" or "assets/epics/...").
     */
    async saveRobotResult(slug, robotName, result, epicId = null, featureId = null, options = {}) {
        ({ epicId, featureId, options } = normalizeScopeArgs(epicId, featureId, options));
        const { feedback = null } = options;
        await this.workspace.ensureProductStructure(slug);

        const today = new Date().toISOString().slice(0, 10);
        const filename = `${today}-${robotName}.md`;
        
        let targetDir = this.workspace.getAssetsDir(slug);
        let relPrefix = "assets";
        if (epicId) {
            targetDir = this.workspace.getEpicFeatureDir(slug, epicId, featureId);
            relPrefix = path.posix.join("assets", "epics", epicId);
            if (featureId) relPrefix = path.posix.join(relPrefix, "features", featureId);
            await fs.mkdir(targetDir, { recursive: true });
        }

        const absPath = path.join(targetDir, filename);
        const relPath = path.posix.join(relPrefix, filename);

        const body = this._renderMarkdown(robotName, result, feedback);
        await fs.writeFile(absPath, body, "utf-8");

        return relPath;
    }

    /**
     * Load a previously saved robot result by relative asset path.
     * Returns { markdown, result } — or null if the file is gone.
     */
    async loadRobotResult(slug, relPath) {
        const absPath = path.join(this.workspace.getProductDir(slug), relPath);
        let markdown;
        try {
            markdown = await fs.readFile(absPath, "utf-8");
        } catch {
            return null;
        }

        // Extract the JSON block for programmatic use
        const jsonMatch = markdown.match(/```json\n([\s\S]*?)\n```/);
        let result = null;
        if (jsonMatch) {
            try {
                result = JSON.parse(jsonMatch[1]);
            } catch { /* fall back to markdown only */ }
        }

        return { markdown, result };
    }

    /**
     * List all asset files for a product.
     */
    async list(slug) {
        const dir = this.workspace.getAssetsDir(slug);
        let files;
        try {
            files = await fs.readdir(dir);
        } catch {
            return [];
        }
        return files
            .filter(f => f.endsWith(".md"))
            .sort()
            .map(f => ({
                filename: f,
                relPath: path.posix.join("assets", f),
                absPath: path.join(dir, f),
            }));
    }

    /**
     * Append feedback to an existing asset file.
     */
    async appendFeedback(slug, relPath, feedback) {
        const absPath = path.join(this.workspace.getProductDir(slug), relPath);
        let existing = "";
        try {
            existing = await fs.readFile(absPath, "utf-8");
        } catch {
            return null;
        }

        const block = this._renderFeedbackBlock(feedback);
        // Strip any prior feedback block to keep the file idempotent
        const cleaned = existing.replace(/\n<!-- feedback-start -->[\s\S]*?<!-- feedback-end -->\n?/g, "");
        await fs.writeFile(absPath, cleaned.trimEnd() + "\n" + block, "utf-8");
        return relPath;
    }

    // ── Phase 2: robot output files ───────────────────────────────────
    //
    // Phase 1 asset files (saveRobotResult) store the _claudeInstructions
    // prompt payload — the input to Claude.  Phase 2 robots need Claude's
    // GENERATED analysis text as their input.  These two methods manage a
    // companion file pattern:
    //
    //   YYYY-MM-DD-<robot>.md          ← prompt payload  (existing)
    //   YYYY-MM-DD-<robot>-output.md   ← Claude's response text (new)

    /**
     * Save Claude's generated analysis text for a robot.
     * Called by the save-robot-output MCP tool after Claude produces its response.
     *
     * Filename pattern: YYYY-MM-DD-<robot>-output.md
     * New runs overwrite the same day's file (idempotent per day).
     *
     * @param {string} slug       - product slug
     * @param {string} robotName  - robot name, e.g. "people" or "user-stories"
     * @param {string} markdownText - raw analysis text Claude generated
     * @param {string} [epicId]
     * @param {string} [featureId]
     * @returns {Promise<string>} relative path, e.g. "assets/2026-04-24-people-output.md"
     */
    async saveRobotOutput(slug, robotName, markdownText, epicId = null, featureId = null) {
        await this.workspace.ensureProductStructure(slug);

        const today = new Date().toISOString().slice(0, 10);
        const filename = `${today}-${robotName}-output.md`;
        
        let targetDir = this.workspace.getAssetsDir(slug);
        let relPrefix = "assets";
        if (epicId) {
            targetDir = this.workspace.getEpicFeatureDir(slug, epicId, featureId);
            relPrefix = path.posix.join("assets", "epics", epicId);
            if (featureId) relPrefix = path.posix.join(relPrefix, "features", featureId);
            await fs.mkdir(targetDir, { recursive: true });
        }

        const absPath = path.join(targetDir, filename);
        const relPath = path.posix.join(relPrefix, filename);

        await fs.writeFile(absPath, markdownText, "utf-8");
        return relPath;
    }

    /**
     * Load the most recently dated output file for a robot.
     * Filenames are YYYY-MM-DD-<robot>-output.md so lexicographic sort = date sort.
     *
     * @param {string} slug      - product slug
     * @param {string} robotName - robot name
     * @param {string} [epicId]
     * @param {string} [featureId]
     * @returns {Promise<string|null>} raw markdown text, or null if no file found
     */
    async loadLatestRobotOutput(slug, robotName, epicId = null, featureId = null) {
        const candidates = await this._findRobotOutputCandidates(slug, robotName, epicId, featureId);
        if (candidates.length === 0) return null;

        try {
            return await fs.readFile(candidates[0].absPath, "utf-8");
        } catch {
            return null;
        }
    }

    async _findRobotOutputCandidates(slug, robotName, epicId = null, featureId = null) {
        const suffix = `-${robotName}-output.md`;
        const dirs = await this._candidateDirs(slug, epicId, featureId);
        const matches = [];

        for (const dir of dirs) {
            let files;
            try {
                files = await fs.readdir(dir.absDir);
            } catch {
                continue;
            }

            for (const file of files) {
                if (!file.endsWith(suffix)) continue;
                matches.push({
                    absPath: path.join(dir.absDir, file),
                    relPath: path.posix.join(dir.relDir, file),
                    filename: file,
                });
            }
        }

        return matches.sort((a, b) => b.filename.localeCompare(a.filename));
    }

    async _candidateDirs(slug, epicId = null, featureId = null) {
        if (epicId) {
            const relDir = featureId
                ? path.posix.join("assets", "epics", epicId, "features", featureId)
                : path.posix.join("assets", "epics", epicId);
            return [{
                absDir: this.workspace.getEpicFeatureDir(slug, epicId, featureId),
                relDir,
            }];
        }

        const dirs = [{
            absDir: this.workspace.getAssetsDir(slug),
            relDir: "assets",
        }];

        const epicsDir = path.join(this.workspace.getAssetsDir(slug), "epics");
        let epicEntries;
        try {
            epicEntries = await fs.readdir(epicsDir, { withFileTypes: true });
        } catch {
            return dirs;
        }

        for (const epicEntry of epicEntries) {
            if (!epicEntry.isDirectory()) continue;
            const epicId = epicEntry.name;
            const epicAbs = path.join(epicsDir, epicId);
            const epicRel = path.posix.join("assets", "epics", epicId);
            dirs.push({ absDir: epicAbs, relDir: epicRel });

            const featuresDir = path.join(epicAbs, "features");
            let featureEntries;
            try {
                featureEntries = await fs.readdir(featuresDir, { withFileTypes: true });
            } catch {
                continue;
            }

            for (const featureEntry of featureEntries) {
                if (!featureEntry.isDirectory()) continue;
                const featureId = featureEntry.name;
                dirs.push({
                    absDir: path.join(featuresDir, featureId),
                    relDir: path.posix.join(epicRel, "features", featureId),
                });
            }
        }

        return dirs;
    }

    // ── internals ──────────────────────────────────────────────────

    _renderMarkdown(robotName, result, feedback) {
        const timestamp = new Date().toISOString();
        const productIdea = result?.productIdea || "";
        const feedbackBlock = feedback ? this._renderFeedbackBlock(feedback) : "";

        return `---
robot: ${robotName}
generated: ${timestamp}
productIdea: ${JSON.stringify(productIdea)}
---

# ${robotName.toUpperCase()} Robot Analysis

**Product:** ${productIdea || "_(not set)_"}
**Generated:** ${timestamp}

## Raw Output

\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\`
${feedbackBlock}`;
    }

    _renderFeedbackBlock(feedback) {
        if (!feedback) return "";
        const stars = "★".repeat(feedback.rating || 0) + "☆".repeat(Math.max(0, 5 - (feedback.rating || 0)));
        return `
<!-- feedback-start -->
## User Feedback

**Rating:** ${stars} (${feedback.rating}/5)
${feedback.notes ? `**Notes:** ${feedback.notes}` : ""}
**Recorded:** ${new Date().toISOString()}
<!-- feedback-end -->
`;
    }
}

function normalizeScopeArgs(epicId, featureId, options) {
    if (isPlainObject(epicId)) {
        return { epicId: null, featureId: null, options: epicId };
    }
    if (isPlainObject(featureId)) {
        return { epicId, featureId: null, options: featureId };
    }
    return { epicId: epicId || null, featureId: featureId || null, options: options || {} };
}

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
