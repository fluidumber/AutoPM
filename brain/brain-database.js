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
                analyses: saved.analyses || [],
                learnings: saved.learnings || [],
                feedback: saved.feedback || [],
                errors: saved.errors || [],
                designPreferences: saved.designPreferences || null,
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

    // ── Reset ────────────────────────────────────────────────────────

    async clearAll() {
        this.data = {
            analyses: [],
            learnings: [],
            feedback: [],
            errors: [],
            designPreferences: null,
        };
        await saveData("brain-database.json", this.data);
    }
}

export default BrainDatabase;