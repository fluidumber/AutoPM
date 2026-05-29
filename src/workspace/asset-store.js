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
    }    /**
     * Save a robot analysis result. Returns the relative path under the
     * product directory.
     */
    async saveRobotResult(slug, robotName, result, { askId = "core", epicId = null, featureId = null, feedback = null } = {}) {
        await this.workspace.ensureProductStructure(slug);

        const today = new Date().toISOString().slice(0, 10);
        const filename = `${today}-${robotName}.md`;
        
        let targetDir = this.workspace.getAskAssetsDir(slug, askId);
        let relPrefix = path.posix.join("assets", "asks", askId);
        if (epicId) {
            targetDir = this.workspace.getEpicFeatureDir(slug, askId, epicId, featureId);
            relPrefix = path.posix.join(relPrefix, "epics", epicId);
            if (featureId) relPrefix = path.posix.join(relPrefix, "features", featureId);
        }
        await fs.mkdir(targetDir, { recursive: true });

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
            files = await fs.readdir(dir, { recursive: true });
        } catch {
            return [];
        }
        return files
            .filter(f => f.endsWith(".md"))
            .sort()
            .map(f => ({
                filename: path.basename(f),
                relPath: path.posix.join("assets", f.split(path.sep).join(path.posix.sep)),
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

    /**
     * Save Claude's generated analysis text for a robot.
     */
    async saveRobotOutput(slug, robotName, markdownText, { askId = "core", epicId = null, featureId = null } = {}) {
        await this.workspace.ensureProductStructure(slug);

        const today = new Date().toISOString().slice(0, 10);
        const filename = `${today}-${robotName}-output.md`;
        
        let targetDir = this.workspace.getAskAssetsDir(slug, askId);
        let relPrefix = path.posix.join("assets", "asks", askId);
        if (epicId) {
            targetDir = this.workspace.getEpicFeatureDir(slug, askId, epicId, featureId);
            relPrefix = path.posix.join(relPrefix, "epics", epicId);
            if (featureId) relPrefix = path.posix.join(relPrefix, "features", featureId);
        }
        await fs.mkdir(targetDir, { recursive: true });

        const absPath = path.join(targetDir, filename);
        const relPath = path.posix.join(relPrefix, filename);

        await fs.writeFile(absPath, markdownText, "utf-8");
        return relPath;
    }

    /**
     * Load the most recently dated output file for a robot.
     */
    async loadLatestRobotOutput(slug, robotName, { askId = "core", epicId = null, featureId = null } = {}) {
        const candidates = await this._findRobotOutputCandidates(slug, robotName, { askId, epicId, featureId });
        if (candidates.length === 0) return null;

        try {
            return await fs.readFile(candidates[0].absPath, "utf-8");
        } catch {
            return null;
        }
    }

    async _findRobotOutputCandidates(slug, robotName, { askId = "core", epicId = null, featureId = null } = {}) {
        const suffix = `-${robotName}-output.md`;
        const dirs = await this._candidateDirs(slug, { askId, epicId, featureId });
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

    async _candidateDirs(slug, { askId = "core", epicId = null, featureId = null } = {}) {
        const dirs = [];
        const pushDir = (absDir, relDir) => dirs.push({ absDir, relDir });

        // 1. Exact path resolution
        if (epicId) {
            const relDir = featureId
                ? path.posix.join("assets", "asks", askId, "epics", epicId, "features", featureId)
                : path.posix.join("assets", "asks", askId, "epics", epicId);
            pushDir(this.workspace.getEpicFeatureDir(slug, askId, epicId, featureId), relDir);
        } else {
            pushDir(this.workspace.getAskAssetsDir(slug, askId), path.posix.join("assets", "asks", askId));
        }

        // 2. Fallbacks for 'core' missing old migrations
        if (askId === "core") {
            if (epicId) {
                const legacyEpicRel = featureId 
                    ? path.posix.join("assets", "epics", epicId, "features", featureId)
                    : path.posix.join("assets", "epics", epicId);
                const legacyEpicAbs = featureId 
                    ? path.join(this.workspace.getAssetsDir(slug), "epics", epicId, "features", featureId)
                    : path.join(this.workspace.getAssetsDir(slug), "epics", epicId);
                pushDir(legacyEpicAbs, legacyEpicRel);
            }
            pushDir(this.workspace.getAssetsDir(slug), "assets");
        }
        
        // 3. Always fallback to the product root (assets/) in case it's a Phase 1 core dependency
        // This ensures epic robots can still load scout/detective output if it's only at the root.
        pushDir(this.workspace.getAssetsDir(slug), "assets");

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
