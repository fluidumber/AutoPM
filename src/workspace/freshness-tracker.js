// FreshnessTracker — records when robot analyses and interview answers
// were last captured, and computes whether they are "fresh" or "stale"
// based on per-category staleness windows.
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

// Staleness windows in days. Tactical artifacts (features, plan, priority)
// expire fast; strategic artifacts (personas) live longer.
export const ROBOT_STALENESS_DAYS = {
    scout: 90,
    detective: 60,
    people: 180,
    money: 90,
    feature: 30,
    plan: 30,
    priority: 30,
};

export const INTERVIEW_STALENESS_DAYS = 180;

export class FreshnessTracker {
    /**
     * @param {import('./workspace-manager.js').WorkspaceManager} workspace
     */
    constructor(workspace) {
        this.workspace = workspace;
    }

    async _load(slug) {
        const path = this.workspace.getFreshnessPath(slug);
        try {
            const raw = await fs.readFile(path, "utf-8");
            const parsed = JSON.parse(raw);
            return {
                robots: parsed.robots || {},
                interviewAnswers: parsed.interviewAnswers || {},
            };
        } catch {
            return { robots: {}, interviewAnswers: {} };
        }
    }

    async _save(slug, data) {
        await this.workspace.ensureProductStructure(slug);
        const path = this.workspace.getFreshnessPath(slug);
        await fs.writeFile(path, JSON.stringify(data, null, 2), "utf-8");
    }

    /**
     * Record that a robot analysis ran successfully.
     * @param {string} slug - product slug
     * @param {string} robotName
     * @param {string} assetPath - relative path to the saved asset
     */
    async recordRobotRun(slug, robotName, assetPath) {
        const data = await this._load(slug);
        data.robots[robotName] = {
            lastRun: new Date().toISOString(),
            assetPath,
            staleAfterDays: ROBOT_STALENESS_DAYS[robotName] ?? 60,
        };
        await this._save(slug, data);
        return data.robots[robotName];
    }

    /**
     * Record an interview answer. Each question ID gets its own entry
     * with its own capture timestamp.
     */
    async recordInterviewAnswer(slug, questionId, value) {
        const data = await this._load(slug);
        data.interviewAnswers[questionId] = {
            value,
            capturedAt: new Date().toISOString(),
            staleAfterDays: INTERVIEW_STALENESS_DAYS,
        };
        await this._save(slug, data);
        return data.interviewAnswers[questionId];
    }

    /**
     * Bulk-record interview answers from an enrichedContext.answers object.
     */
    async recordAllInterviewAnswers(slug, answers) {
        const data = await this._load(slug);
        const now = new Date().toISOString();
        for (const [qid, value] of Object.entries(answers || {})) {
            data.interviewAnswers[qid] = {
                value,
                capturedAt: now,
                staleAfterDays: INTERVIEW_STALENESS_DAYS,
            };
        }
        await this._save(slug, data);
        return data.interviewAnswers;
    }

    /**
     * Get freshness state for every robot of a product.
     * Returns a map: robotName -> { status, ageDays, lastRun, assetPath }
     *   status: "fresh" | "stale" | "missing"
     */
    async getRobotFreshness(slug) {
        const data = await this._load(slug);
        const out = {};
        for (const robot of Object.keys(ROBOT_STALENESS_DAYS)) {
            const entry = data.robots[robot];
            if (!entry) {
                out[robot] = { status: "missing", ageDays: null, lastRun: null, assetPath: null };
                continue;
            }
            const ageDays = daysSince(entry.lastRun);
            const status = ageDays > (entry.staleAfterDays ?? 60) ? "stale" : "fresh";
            out[robot] = {
                status,
                ageDays,
                lastRun: entry.lastRun,
                assetPath: entry.assetPath,
                staleAfterDays: entry.staleAfterDays,
            };
        }
        return out;
    }

    /**
     * Get freshness state for all recorded interview answers.
     * Returns a map: questionId -> { status, ageDays, value }
     */
    async getInterviewFreshness(slug) {
        const data = await this._load(slug);
        const out = {};
        for (const [qid, entry] of Object.entries(data.interviewAnswers)) {
            const ageDays = daysSince(entry.capturedAt);
            const status = ageDays > (entry.staleAfterDays ?? INTERVIEW_STALENESS_DAYS)
                ? "stale" : "fresh";
            out[qid] = {
                status,
                ageDays,
                value: entry.value,
                capturedAt: entry.capturedAt,
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
}

function daysSince(iso) {
    if (!iso) return Infinity;
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return Infinity;
    return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}
