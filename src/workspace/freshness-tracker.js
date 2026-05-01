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
            return {
                robots:          parsed.robots          || {},
                interviewAnswers: parsed.interviewAnswers || {},
            };
        } catch {
            return { robots: {}, interviewAnswers: {} };
        }
    }

    async _save(slug, data) {
        await this.workspace.ensureProductStructure(slug);
        const p = this.workspace.getFreshnessPath(slug);
        await fs.writeFile(p, JSON.stringify(data, null, 2), "utf-8");
    }

    /**
     * Record that a robot analysis ran successfully.
     *
     * @param {string} slug - product slug
     * @param {string} robotName
     * @param {string} assetPath - relative path to the saved asset
     * @param {{ personaSlug?: string|null }} [opts]
     */
    async recordRobotRun(slug, robotName, assetPath, { personaSlug = null } = {}) {
        const policy = await resolvePolicy(this.workspace, { personaSlug, productSlug: slug });
        const data   = await this._load(slug);
        data.robots[robotName] = {
            lastRun:       new Date().toISOString(),
            assetPath,
            staleAfterDays: policy.robots[robotName] ?? 60,
        };
        await this._save(slug, data);
        return data.robots[robotName];
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
     * Get freshness state for every robot of a product.
     *
     * Returns a map: robotName -> { status, ageDays, lastRun, assetPath, staleAfterDays, policyWindow, provenanceSource }
     *   status: "fresh" | "stale" | "missing"
     *
     * @param {string} slug
     * @param {{ personaSlug?: string|null }} [opts]
     */
    async getRobotFreshness(slug, { personaSlug = null } = {}) {
        const policy = await resolvePolicy(this.workspace, { personaSlug, productSlug: slug });
        const data   = await this._load(slug);
        const out    = {};

        for (const robot of Object.keys(ROBOT_STALENESS_DAYS)) {
            const entry      = data.robots[robot];
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
}

function daysSince(iso) {
    if (!iso) return Infinity;
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return Infinity;
    return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}
