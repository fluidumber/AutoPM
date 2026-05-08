import { randomUUID } from "crypto";
import { saveData, loadData } from "../utils/file-storage.js";

class BrainDatabase {
    constructor() {
        this.data = {
            analyses: [],
            learnings: [],
            feedback: [],
            errors: [],
            designPreferences: null,
        };
        // Expose a promise that resolves when disk data is loaded.
        // Callers must `await db.ready` before reading data.
        this.ready = this.loadFromDisk();
    }

    async loadFromDisk() {
        const saved = await loadData("brain-database.json");
        if (saved) {
            this.data = {
                analyses:           saved.analyses           || [],
                learnings:          saved.learnings          || [],
                feedback:           saved.feedback           || [],
                errors:             saved.errors             || [],
                designPreferences:  saved.designPreferences  || null,
                knowledgeLayer:     saved.knowledgeLayer     || { entries: [] },
                processImprovements: saved.processImprovements || [],
            };
            console.log(`🧠 Loaded ${saved.analyses.length} previous analyses`);
        }
    }

    // ── Design Preferences ───────────────────────────────────────────

    async saveDesignPreferences(prefs) {
        this.data.designPreferences = prefs;
        await saveData("brain-database.json", this.data);
        console.log(`🎨 Design preferences saved.`);
    }

    getDesignPreferences() {
        return this.data.designPreferences;
    }

    // ── Analyses ─────────────────────────────────────────────────────

    async saveAnalysis(productIdea, results) {
        this.data.analyses.push({
            id: this.data.analyses.length + 1,
            product: productIdea,
            results: results,
            timestamp: new Date().toISOString(),
        });
        await saveData("brain-database.json", this.data);
    }

    getAllAnalyses() {
        return this.data.analyses;
    }

    getAnalysisCount() {
        return this.data.analyses.length;
    }

    // ── Feedback ─────────────────────────────────────────────────────

    /**
     * Persist PM feedback for a robot run.
     *
     * @param {string} analysisId
     * @param {string} robotName
     * @param {number} rating - 1-5
     * @param {string} notes  - PM's free-text feedback
     * @param {string} [productSlug] - Which product this run was for (global learning if null)
     */
    async saveFeedback(analysisId, robotName, rating, notes, productSlug = null) {
        this.data.feedback.push({
            analysisId,
            robotName,
            rating,
            notes,
            productSlug,       // ← new: ties feedback to a specific product
            timestamp: new Date().toISOString(),
        });
        await saveData("brain-database.json", this.data);
        console.log(
            `💬 Feedback saved: ${robotName} rated ${rating}/5${productSlug ? ` (${productSlug})` : ""}`
        );
    }

    /**
     * Get all historical feedback for a specific robot type.
     * @param {string} robotName
     * @param {string} [productSlug] - Optional: filter to a single product
     */
    getFeedbackForRobot(robotName, productSlug = null) {
        const all = this.data.feedback.filter((f) => f.robotName === robotName);
        return productSlug ? all.filter(f => f.productSlug === productSlug) : all;
    }

    /**
     * Get average rating for a robot across all feedback.
     */
    getRobotAverageRating(robotName) {
        const fb = this.getFeedbackForRobot(robotName);
        if (fb.length === 0) return null;
        const sum = fb.reduce((acc, f) => acc + f.rating, 0);
        return Math.round((sum / fb.length) * 10) / 10;
    }

    // ── Learnings ────────────────────────────────────────────────────

    async saveLearning(what, score) {
        this.data.learnings.push({
            learning: what,
            effectiveness: score,
            timestamp: new Date().toISOString(),
        });
        await saveData("brain-database.json", this.data);
    }

    // ── Knowledge Layer ──────────────────────────────────────────────

    /**
     * Insert or update a knowledge entry. Generates a UUID if entry.id is absent.
     *
     * @param {object} entry
     * @param {string} [entry.id]
     * @param {string} entry.robotName
     * @param {string} entry.content
     * @param {'observation'|'hypothesis'|'rule'} entry.tier
     * @param {number} entry.confirmations
     * @param {number} entry.contradictions
     * @param {number} entry.promotionThreshold
     * @param {string[]} entry.productSlugs
     * @returns {Promise<object>} the saved entry
     */
    async upsertKnowledgeEntry(entry) {
        const entries = this.data.knowledgeLayer.entries;
        const id      = entry.id || randomUUID();
        const now     = new Date().toISOString();
        const idx     = entries.findIndex(e => e.id === id);

        const saved = {
            ...entry,
            id,
            createdAt: idx >= 0 ? entries[idx].createdAt : now,
            updatedAt: now,
        };

        if (idx >= 0) {
            entries[idx] = saved;
        } else {
            entries.push(saved);
        }

        await saveData("brain-database.json", this.data);
        return saved;
    }

    /**
     * Return knowledge entries for a robot. If productSlug is given, returns
     * entries that either belong to that product or have no product scope.
     *
     * @param {string} robotName
     * @param {string|null} [productSlug]
     * @returns {object[]}
     */
    getKnowledgeForRobot(robotName, productSlug = null) {
        const entries = this.data.knowledgeLayer.entries.filter(e => e.robotName === robotName);
        if (!productSlug) return entries;
        return entries.filter(e =>
            !e.productSlugs?.length || e.productSlugs.includes(productSlug)
        );
    }

    /**
     * Demote a knowledge entry one tier (rule → hypothesis → observation).
     * Increments contradictions and saves.
     *
     * @param {string} entryId
     * @returns {Promise<object|null>}
     */
    async demoteEntry(entryId) {
        const entries = this.data.knowledgeLayer.entries;
        const idx     = entries.findIndex(e => e.id === entryId);
        if (idx < 0) return null;

        const entry = entries[idx];
        const tierDown = { rule: "hypothesis", hypothesis: "observation" };
        entry.tier          = tierDown[entry.tier] ?? entry.tier;
        entry.contradictions = (entry.contradictions || 0) + 1;
        entry.updatedAt     = new Date().toISOString();
        entries[idx]        = entry;

        await saveData("brain-database.json", this.data);
        return entry;
    }

    // ── Process Improvements ─────────────────────────────────────────

    /**
     * Persist a new process improvement suggestion.
     *
     * @param {{ type: string, robotName: string|null, evidence: string[], frequency: number, status: string }} suggestion
     * @returns {Promise<object>}
     */
    async saveProcessImprovement(suggestion) {
        const entry = {
            ...suggestion,
            id:          randomUUID(),
            suggestedAt: new Date().toISOString(),
            status:      suggestion.status || "pending",
        };
        this.data.processImprovements.push(entry);
        await saveData("brain-database.json", this.data);
        return entry;
    }

    /** @returns {object[]} */
    getPendingProcessImprovements() {
        return (this.data.processImprovements || []).filter(s => s.status === "pending");
    }

    /**
     * Mark a suggestion as sent (after email dispatch).
     * @param {string} id
     */
    async markSuggestionSent(id) {
        const idx = (this.data.processImprovements || []).findIndex(s => s.id === id);
        if (idx < 0) return;
        this.data.processImprovements[idx].status = "sent";
        await saveData("brain-database.json", this.data);
    }

    // ── Reset ────────────────────────────────────────────────────────

    async clearAll() {
        this.data = {
            analyses: [],
            learnings: [],
            feedback: [],
            errors: [],
            designPreferences: null,
            knowledgeLayer: { entries: [] },
            processImprovements: [],
        };
        await saveData("brain-database.json", this.data);
    }
}

export default BrainDatabase;