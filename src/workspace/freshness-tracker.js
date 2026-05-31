// FreshnessTracker — records when robot analyses and interview answers
// were last captured, and computes whether they are "fresh" or "stale"
// based on per-category staleness windows.
//
// Staleness resolution order (highest wins):
//   1. Per-product override  — products/<slug>/staleness-overrides.json
//   2. Per-persona override  — profiles/<slug>/staleness-overrides.json  (Track 2)
//   3. Project policy        — config/staleness-policy.json
//   4. Compiled-in defaults  — ROBOT_STALENESS_DAYS / INTERVIEW_STALENESS_DAYS
//
// On-disk format (products/<slug>/freshness.json):
// {
//   "robots": {
//     "scout":     { "lastRun": ISO, "assetPath": "assets/...md", "staleAfterDays": 90 },
//     "detective": { ... }
//   },
//   "interviewAnswers": {
//     "target_geo":  { "value": "India", "capturedAt": ISO, "staleAfterDays": 180 },
//     "pain_point":  { ... }
//   }
// }

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Absolute path to the project-level policy file (config/staleness-policy.json).
const PROJECT_POLICY_PATH = path.join(__dirname, "..", "..", "config", "staleness-policy.json");

// ── Compiled-in defaults ─────────────────────────────────────────────────────
// These are the fallback values when the policy file is absent.
// Values match config/staleness-policy.json — keep in sync.
//
// Phase 1 — Strategic Discovery
// Phase 2 — Execution Definition
export const ROBOT_STALENESS_DAYS = {
    // ── Phase 1 ────────────────────────────────────────────────────
    scout:     90,
    detective: 60,
    people:    180,
    money:     90,
    epic:      30,
    feature:   30,
    plan:      30,
    priority:  30,

    // ── Phase 2 ────────────────────────────────────────────────────
    "user-stories":       30,
    "scope-spec":         30,
    "feasibility-tech":   60,
    "feasibility-design": 60,
    "customer-journeys":  90,
    "data-privacy":       90,
    "gtm-readiness":      30,
    "risks-registry":     30,
    "kpis":               90,
    "daci-stakeholders":  180,
};

export const INTERVIEW_STALENESS_DAYS = 180;

// ── Policy cache ─────────────────────────────────────────────────────────────
// Keyed by "<personaSlug>|<productSlug>" — cleared per process, not per request.
const _policyCache = new Map();

/**
 * Resolve effective staleness windows for a given persona + product combination.
 *
 * Returns { robots: { [robotName]: windowDays }, interviewWindowDays: number, provenance: {...} }
 *
 * @param {import('./workspace-manager.js').WorkspaceManager} workspace
 * @param {{ personaSlug?: string|null, productSlug?: string|null }} opts
 */
async function resolvePolicy(workspace, { personaSlug = null, productSlug = null } = {}) {
    const cacheKey = `${personaSlug ?? ""}|${productSlug ?? ""}`;
    if (_policyCache.has(cacheKey)) return _policyCache.get(cacheKey);

    // 1. Project defaults — config/staleness-policy.json or compiled-in fallback
    let projectRobots = { ...ROBOT_STALENESS_DAYS };
    let projectInterviewDays = INTERVIEW_STALENESS_DAYS;
    const provenance = {};

    try {
        const raw    = await fs.readFile(PROJECT_POLICY_PATH, "utf-8");
        const policy = JSON.parse(raw);
        for (const [k, v] of Object.entries(policy.robots || {})) {
            projectRobots[k] = v.windowDays;
        }
        if (policy.interviewAnswers?.windowDays) {
            projectInterviewDays = policy.interviewAnswers.windowDays;
        }
        for (const k of Object.keys(projectRobots)) provenance[k] = "project-policy";
    } catch {
        for (const k of Object.keys(projectRobots)) provenance[k] = "compiled-default";
    }

    const robots = { ...projectRobots };
    let interviewWindowDays = projectInterviewDays;

    // 2. Persona overrides (Track 2 will populate these files)
    if (personaSlug) {
        try {
            const raw       = await fs.readFile(workspace.getPersonaStalenessOverridePath(personaSlug), "utf-8");
            const overrides = JSON.parse(raw);
            for (const [k, v] of Object.entries(overrides.robots || {})) {
                robots[k]     = v;
                provenance[k] = `persona:${personaSlug}`;
            }
            if (overrides.interviewAnswers?.windowDays) {
                interviewWindowDays = overrides.interviewAnswers.windowDays;
            }
        } catch { /* no persona overrides — expected until Track 2 */ }
    }

    // 3. Product overrides
    if (productSlug) {
        try {
            const raw       = await fs.readFile(workspace.getProductStalenessOverridePath(productSlug), "utf-8");
            const overrides = JSON.parse(raw);
            for (const [k, v] of Object.entries(overrides.robots || {})) {
                robots[k]     = v;
                provenance[k] = `product:${productSlug}`;
            }
            if (overrides.interviewAnswers?.windowDays) {
                interviewWindowDays = overrides.interviewAnswers.windowDays;
            }
        } catch { /* no product overrides — expected */ }
    }

    const resolved = { robots, interviewWindowDays, provenance };
    _policyCache.set(cacheKey, resolved);
    return resolved;
}

/** Clear the policy cache (used in tests that mutate override files). */
export function clearPolicyCache() {
    _policyCache.clear();
}

export class FreshnessTracker {
    /**
     * @param {import('./workspace-manager.js').WorkspaceManager} workspace
     */
    constructor(workspace) {
        this.workspace = workspace;
    }

    async _load(slug) {
        const p = this.workspace.getFreshnessPath(slug);
        try {
            const raw    = await fs.readFile(p, "utf-8");
            const parsed = JSON.parse(raw);
            
            parsed.asks = parsed.asks || {};
            parsed.asks["core"] = parsed.asks["core"] || { robots: {}, epics: {} };
            parsed.asks["core"].robots = { ...(parsed.robots || {}), ...parsed.asks["core"].robots };
            parsed.asks["core"].epics = { ...(parsed.epics || {}), ...parsed.asks["core"].epics };
            
            return {
                robots:           parsed.robots           || {},
                epics:            parsed.epics            || {},
                interviewAnswers: parsed.interviewAnswers || {},
                asks:             parsed.asks             || {},
            };
        } catch {
            return { robots: {}, epics: {}, interviewAnswers: {}, asks: { "core": { robots: {}, epics: {} } } };
        }
    }

    async _save(slug, data) {
        await this.workspace.ensureProductStructure(slug);
        const p = this.workspace.getFreshnessPath(slug);
        await fs.writeFile(p, JSON.stringify(data, null, 2), "utf-8");
    }

    /**
     * Record a robot run in freshness.json under the new asks structure.
     */
    async recordRobotRun(slug, robotName, assetPath, { askId = "core", epicId = null, featureId = null, personaSlug = null } = {}) {
        const policy = await resolvePolicy(this.workspace, { personaSlug, productSlug: slug });
        const data   = await this._load(slug);
        
        const runData = {
            lastRun:       new Date().toISOString(),
            assetPath,
            staleAfterDays: policy.robots[robotName] ?? 60,
        };

        data.asks = data.asks || {};
        data.asks[askId] = data.asks[askId] || { epics: {}, robots: {} };

        if (epicId) {
            data.asks[askId].epics[epicId] = data.asks[askId].epics[epicId] || { robots: {}, features: {} };
            if (featureId) {
                data.asks[askId].epics[epicId].features[featureId] = data.asks[askId].epics[epicId].features[featureId] || { robots: {} };
                data.asks[askId].epics[epicId].features[featureId].robots[robotName] = runData;
            } else {
                data.asks[askId].epics[epicId].robots[robotName] = runData;
            }
        } else {
            data.asks[askId].robots[robotName] = runData;
        }

        await this._save(slug, data);
        return runData;
    }

    /**
     * Record an interview answer.  Each question ID gets its own entry
     * with its own capture timestamp.
     *
     * @param {string} slug
     * @param {string} questionId
     * @param {*} value
     * @param {{ personaSlug?: string|null }} [opts]
     */
    async recordInterviewAnswer(slug, questionId, value, { personaSlug = null } = {}) {
        const policy = await resolvePolicy(this.workspace, { personaSlug, productSlug: slug });
        const data   = await this._load(slug);
        data.interviewAnswers[questionId] = {
            value,
            capturedAt:    new Date().toISOString(),
            staleAfterDays: policy.interviewWindowDays,
        };
        await this._save(slug, data);
        return data.interviewAnswers[questionId];
    }

    /**
     * Bulk-record interview answers from an enrichedContext.answers object.
     *
     * @param {string} slug
     * @param {object} answers
     * @param {{ personaSlug?: string|null }} [opts]
     */
    async recordAllInterviewAnswers(slug, answers, { personaSlug = null } = {}) {
        const policy = await resolvePolicy(this.workspace, { personaSlug, productSlug: slug });
        const data   = await this._load(slug);
        const now    = new Date().toISOString();
        for (const [qid, value] of Object.entries(answers || {})) {
            data.interviewAnswers[qid] = {
                value,
                capturedAt:    now,
                staleAfterDays: policy.interviewWindowDays,
            };
        }
        await this._save(slug, data);
        return data.interviewAnswers;
    }

    /**
     * Get freshness state for every robot of a product (or scoped ask/epic/feature).
     *
     * Returns a map: robotName -> { status, ageDays, lastRun, assetPath, staleAfterDays, policyWindow, provenanceSource }
     *   status: "fresh" | "stale" | "missing"
     */
    async getRobotFreshness(slug, { askId = "core", epicId = null, featureId = null, personaSlug = null } = {}) {
        const policy = await resolvePolicy(this.workspace, { personaSlug, productSlug: slug });
        const data   = await this._load(slug);
        const out    = {};

        for (const robot of Object.keys(ROBOT_STALENESS_DAYS)) {
            const entries = collectRobotEntries(data, robot, askId, epicId, featureId);
            const entry = pickLatestEntry(entries);

            const policyWin  = policy.robots[robot] ?? 60;
            const provenance = policy.provenance[robot] ?? "compiled-default";

            if (!entry) {
                out[robot] = {
                    status:         "missing",
                    ageDays:        null,
                    lastRun:        null,
                    assetPath:      null,
                    staleAfterDays: policyWin,
                    policyWindow:   policyWin,
                    provenanceSource: provenance,
                };
                continue;
            }

            const ageDays       = daysSince(entry.lastRun);
            // Use the window that was in effect when this robot ran (entry.staleAfterDays),
            // but compare against the *current* policy window so a tightened policy triggers
            // a stale flag on next check even if the recorded window was looser.
            const effectiveWin  = policyWin;
            const status        = ageDays > effectiveWin ? "stale" : "fresh";

            out[robot] = {
                status,
                ageDays,
                lastRun:          entry.lastRun,
                assetPath:        entry.assetPath,
                epicId:           entry.epicId ?? null,
                featureId:        entry.featureId ?? null,
                staleAfterDays:   entry.staleAfterDays,   // window recorded at run time
                policyWindow:     policyWin,               // current resolved window
                provenanceSource: provenance,
            };
        }
        return out;
    }

    /**
     * Get freshness state for all recorded interview answers.
     * Returns a map: questionId -> { status, ageDays, value }
     *
     * @param {string} slug
     * @param {{ personaSlug?: string|null }} [opts]
     */
    async getInterviewFreshness(slug, { personaSlug = null } = {}) {
        const policy = await resolvePolicy(this.workspace, { personaSlug, productSlug: slug });
        const data   = await this._load(slug);
        const out    = {};

        for (const [qid, entry] of Object.entries(data.interviewAnswers)) {
            const ageDays = daysSince(entry.capturedAt);
            const win     = policy.interviewWindowDays;
            const status  = ageDays > win ? "stale" : "fresh";
            out[qid] = {
                status,
                ageDays,
                value:      entry.value,
                capturedAt: entry.capturedAt,
                policyWindow: win,
            };
        }
        return out;
    }

    /**
     * Return a snapshot of all stored interview answers, keyed by question ID.
     * Freshness status is included so callers can decide what to reuse.
     */
    async getStoredAnswers(slug) {
        return this.getInterviewFreshness(slug);
    }

    /**
     * Get the raw freshness.json contents (for inspection/export).
     */
    async getRaw(slug) {
        return this._load(slug);
    }

    /**
     * Return the resolved staleness policy for a given persona + product.
     * Exposed so the staleness-policy MCP tool can surface provenance to the PM.
     */
    async getResolvedPolicy({ personaSlug = null, productSlug = null } = {}) {
        return resolvePolicy(this.workspace, { personaSlug, productSlug });
    }

    /**
     * Mark robots as stale when new external research is added.
     *
     * The mapping is intentionally conservative — only robots with a direct
     * data dependency on the research type are invalidated. The PM can always
     * force-rerun any robot regardless.
     *
     * @param {string} slug - product slug
     * @param {"research"|"survey-result"|"experiment-feedback"|"analyst-report"} researchType
     * @returns {Promise<string[]>} list of robot names that were invalidated
     */
    async invalidateOnResearch(slug, researchType) {
        // Map research types to the robots whose outputs they directly affect
        const RESEARCH_ROBOT_MAP = {
            "research":            ["people", "feature", "detective", "user-stories", "customer-journeys"],
            "survey-result":       ["people", "feature", "priority", "user-stories"],
            "experiment-feedback": ["user-stories", "scope-spec", "feasibility-design"],
            "analyst-report":      ["scout", "detective", "money", "gtm-readiness"],
        };

        const robotsToInvalidate = RESEARCH_ROBOT_MAP[researchType] || [];
        if (robotsToInvalidate.length === 0) return [];

        const data = await this._load(slug);
        const invalidated = [];

        for (const robot of robotsToInvalidate) {
            if (data.robots[robot]) {
                // Set lastRun to epoch so it appears stale against any policy window
                data.robots[robot].lastRun = "1970-01-01T00:00:00.000Z";
                invalidated.push(robot);
            }

            for (const epicData of Object.values(data.epics || {})) {
                if (epicData.robots?.[robot]) {
                    epicData.robots[robot].lastRun = "1970-01-01T00:00:00.000Z";
                    invalidated.push(robot);
                }

                for (const featureData of Object.values(epicData.features || {})) {
                    if (featureData.robots?.[robot]) {
                        featureData.robots[robot].lastRun = "1970-01-01T00:00:00.000Z";
                        invalidated.push(robot);
                    }
                }
            }
        }

        const uniqueInvalidated = [...new Set(invalidated)];
        if (uniqueInvalidated.length > 0) {
            await this._save(slug, data);
        }

        return uniqueInvalidated;
    }
}



function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function collectRobotEntries(data, robot, askId = "core", epicId = null, featureId = null) {
    const entries = [];

    // 1. New structure: asks > askId
    const ask = data.asks?.[askId];
    if (ask) {
        if (!epicId && ask.robots?.[robot]) {
            entries.push({ ...ask.robots[robot], askId, epicId: null, featureId: null });
        }
        if (epicId) {
            const epic = ask.epics?.[epicId];
            if (epic) {
                if (featureId) {
                    const featureEntry = epic.features?.[featureId]?.robots?.[robot];
                    if (featureEntry) entries.push({ ...featureEntry, askId, epicId, featureId });
                }
                const epicEntry = epic.robots?.[robot];
                if (epicEntry) entries.push({ ...epicEntry, askId, epicId, featureId: null });
            }
        }
        // Collect all epics if not epic-scoped
        for (const [eid, epic] of Object.entries(ask.epics || {})) {
            const epicEntry = epic.robots?.[robot];
            if (epicEntry) entries.push({ ...epicEntry, askId, epicId: eid, featureId: null });
            for (const [fid, feature] of Object.entries(epic.features || {})) {
                const featureEntry = feature.robots?.[robot];
                if (featureEntry) entries.push({ ...featureEntry, askId, epicId: eid, featureId: fid });
            }
        }
    }

    // 2. Legacy structure (acts like askId = "core")
    if (askId === "core") {
        if (!epicId && data.robots?.[robot]) {
            entries.push({ ...data.robots[robot], askId: "core", epicId: null, featureId: null });
        }
        if (epicId) {
            const epic = data.epics?.[epicId];
            if (epic) {
                if (featureId) {
                    const featureEntry = epic.features?.[featureId]?.robots?.[robot];
                    if (featureEntry) entries.push({ ...featureEntry, askId: "core", epicId, featureId });
                }
                const epicEntry = epic.robots?.[robot];
                if (epicEntry) entries.push({ ...epicEntry, askId: "core", epicId, featureId: null });
            }
        }
        for (const [eid, epic] of Object.entries(data.epics || {})) {
            const epicEntry = epic.robots?.[robot];
            if (epicEntry) entries.push({ ...epicEntry, askId: "core", epicId: eid, featureId: null });
            for (const [fid, feature] of Object.entries(epic.features || {})) {
                const featureEntry = feature.robots?.[robot];
                if (featureEntry) entries.push({ ...featureEntry, askId: "core", epicId: eid, featureId: fid });
            }
        }
    }

    return entries;
}

function pickLatestEntry(entries) {
    let latest = null;
    let latestTime = -Infinity;

    for (const entry of entries) {
        const time = new Date(entry.lastRun).getTime();
        if (!Number.isFinite(time)) continue;
        if (time > latestTime) {
            latest = entry;
            latestTime = time;
        }
    }

    return latest;
}

function daysSince(iso) {
    if (!iso) return Infinity;
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return Infinity;
    return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}
