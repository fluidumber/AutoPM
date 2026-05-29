// PDDComposer — gathers all robot outputs and product metadata for PDD assembly.
//
// This module is a DATA GATHERER, not a renderer.  It loads every available
// robot output file, tries to parse JSON from Phase 2 outputs, and returns a
// structured assemblyPayload that the generate-pdd MCP tool passes to Claude.
//
// Claude does the actual PDD JSON assembly (mapping robot fields → PDD schema).
// The pdd-renderer then turns the PDD JSON into markdown + HTML.

import fs from "fs/promises";

// All robots whose outputs contribute to the PDD, in assembly order.
const ASSEMBLY_ROBOTS = [
    // Phase 1 — strategic discovery (narrative outputs)
    "scout", "detective", "people", "money", "feature", "plan", "priority",
    // Phase 2 — execution definition (JSON outputs)
    "user-stories", "scope-spec", "customer-journeys",
    "feasibility-tech", "feasibility-design", "kpis",
    "data-privacy", "gtm-readiness", "risks-registry", "daci-stakeholders",
];

const PHASE1_ROBOTS = ["scout", "detective", "people", "money", "feature", "plan", "priority"];

export class PDDComposer {
    /**
     * @param {import('./workspace-manager.js').WorkspaceManager} workspace
     * @param {import('./asset-store.js').AssetStore} assetStore
     */
    constructor(workspace, assetStore) {
        this.workspace = workspace;
        this.assetStore = assetStore;
    }

    /**
     * Assemble the PDD payload for a product.
     * Loads all available robot outputs, product metadata, and Phase 2 context.
     *
     * @param {string} slug - product slug
     * @param {string|null} [epicId] - Optional epic scope for Phase 2 outputs.
     * @returns {Promise<PDDAssemblyPayload>}
     */
    async assemble(slug, epicId = null) {
        const [productMeta, phase2Context, daciData, robotOutputs, experimentSelection] = await Promise.all([
            this._loadProductMeta(slug),
            this._loadPhase2Context(slug),
            this._loadDaciData(slug),
            this._loadAllRobotOutputs(slug, epicId),
            this._loadExperimentSelection(slug),
        ]);

        // Determine which robots have run vs. are missing
        const robotsPresent = Object.keys(robotOutputs);
        const robotsMissing = ASSEMBLY_ROBOTS.filter(r => !robotsPresent.includes(r));

        return {
            slug,
            epicId,
            productMeta,
            phase2Context,
            daciData,
            robotOutputs,
            robotsPresent,
            robotsMissing,
            experimentSelection,
            assembledAt: new Date().toISOString(),
        };
    }

    /**
     * Assemble Phase 1 robot outputs for presentation generation.
     * Loads only the 7 Phase 1 robot output files + product metadata.
     * Does NOT require Phase 2 to have run — presentations are unlocked by
     * Phase 1 completion, independent of the PDD lifecycle.
     *
     * @param {string} slug - product slug
     * @returns {Promise<Phase1AssemblyPayload>}
     */
    async assemblePhase1(slug) {
        const [productMeta, robotOutputs] = await Promise.all([
            this._loadProductMeta(slug),
            this._loadPhase1RobotOutputs(slug),
        ]);

        const robotsPresent = Object.keys(robotOutputs);
        const robotsMissing = PHASE1_ROBOTS.filter(r => !robotsPresent.includes(r));

        return {
            slug,
            productMeta,
            robotOutputs,
            robotsPresent,
            robotsMissing,
            assembledAt: new Date().toISOString(),
        };
    }

    // ── Private loaders ────────────────────────────────────────────────

    async _loadProductMeta(slug) {
        try {
            const raw = await fs.readFile(this.workspace.getProductMarkdownPath(slug), "utf-8");
            const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---/);
            const nameMatch = raw.match(/^#\s+Product:\s*(.+)$/m);
            return {
                name: nameMatch ? nameMatch[1].trim() : slug,
                raw,
            };
        } catch {
            return { name: slug, raw: null };
        }
    }

    async _loadPhase2Context(slug) {
        try {
            const raw = await fs.readFile(this.workspace.getPhase2ContextPath(slug), "utf-8");
            return JSON.parse(raw);
        } catch {
            return {};
        }
    }

    async _loadDaciData(slug) {
        try {
            const raw = await fs.readFile(this.workspace.getDACIPath(slug), "utf-8");
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    /**
     * Load all robot output files. Returns a map of robotName →
     * { raw: string, json: object|null, missing: false }.
     * Only robots that have an output file on disk are included.
     */
    async _loadAllRobotOutputs(slug, epicId = null) {
        const outputs = {};

        await Promise.all(ASSEMBLY_ROBOTS.map(async (robot) => {
            const raw = await this.assetStore.loadLatestRobotOutput(slug, robot, epicId);
            if (!raw) return; // robot hasn't been run

            outputs[robot] = {
                raw,
                json: this._tryParseJson(raw),
            };
        }));

        return outputs;
    }

    /**
     * Load Phase 1 robot output files only.
     * Used by assemblePhase1() — keeps presentations independent of Phase 2.
     */
    async _loadPhase1RobotOutputs(slug) {
        const outputs = {};
        await Promise.all(PHASE1_ROBOTS.map(async (robot) => {
            const raw = await this.assetStore.loadLatestRobotOutput(slug, robot);
            if (!raw) return;
            outputs[robot] = { raw };
        }));
        return outputs;
    }

    /**
     * Robustly extract a JSON object from a robot output file.
     * Handles three cases:
     *   1. File IS valid JSON (Phase 2 robots following the mandate)
     *   2. File has a ```json ... ``` block (Claude added fences despite the mandate)
     *   3. File is narrative markdown (Phase 1 robots) — returns null
     *
     * @param {string} text
     * @returns {object|null}
     */
    _tryParseJson(text) {
        if (!text) return null;

        const trimmed = text.trim();

        // Case 1 — entire file is JSON
        if (trimmed.startsWith("{")) {
            try { return JSON.parse(trimmed); } catch { /* fall through */ }
        }

        // Case 2 — JSON wrapped in code fence
        const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
        if (fenceMatch) {
            try { return JSON.parse(fenceMatch[1].trim()); } catch { /* fall through */ }
        }

        // Case 3 — find the outermost { ... } block
        const start = trimmed.indexOf("{");
        const end   = trimmed.lastIndexOf("}");
        if (start !== -1 && end > start) {
            try { return JSON.parse(trimmed.slice(start, end + 1)); } catch { /* fall through */ }
        }

        return null; // Phase 1 narrative output — cannot parse as JSON
    }

    /**
     * Load the experiment selection file if it exists.
     *
     * This file is written by the 'select-experiment' MCP tool after the PM
     * reviews experiment clusters generated by UserStoriesRobot. It contains
     * either a selected clusterId or an array of cherry-picked story IDs.
     *
     * @param {string} slug
     * @returns {Promise<Object|null>}
     */
    async _loadExperimentSelection(slug) {
        try {
            const selPath = this.workspace.getContextDir(slug) + "/experiment-selection.json";
            const raw = await fs.readFile(selPath, "utf-8");
            return JSON.parse(raw);
        } catch {
            return null; // No selection made — expected for single-cluster runs
        }
    }
}

/**
 * @typedef {Object} PDDAssemblyPayload
 * @property {string}        slug                - Product slug
 * @property {Object}        productMeta         - { name, raw }
 * @property {Object}        phase2Context       - Parsed phase2-context.json
 * @property {Object|null}   daciData            - Parsed daci.json or null
 * @property {Object}        robotOutputs        - Map: robotName → { raw, json }
 * @property {string[]}      robotsPresent       - Robots with saved output files
 * @property {string[]}      robotsMissing       - Robots not yet run
 * @property {Object|null}   experimentSelection - Selected cluster or cherry-picked stories
 * @property {string}        assembledAt         - ISO timestamp
 */

/**
 * @typedef {Object} Phase1AssemblyPayload
 * @property {string}   slug            - Product slug
 * @property {Object}   productMeta     - { name, raw }
 * @property {Object}   robotOutputs    - Map: Phase 1 robotName → { raw }
 * @property {string[]} robotsPresent   - Phase 1 robots with saved output files
 * @property {string[]} robotsMissing   - Phase 1 robots not yet run
 * @property {string}   assembledAt     - ISO timestamp
 */
