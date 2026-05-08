// ProcessAdvisor — analyses feedback patterns and surfaces process improvement suggestions.
// Runs asynchronously (fire-and-forget) from the feedback hot path.

const FEEDBACK_THRESHOLD  = 5;    // minimum feedback events before analysis runs
const LOW_RATING_THRESHOLD = 3.5; // average rating below this triggers improve-robot

// Hard-coded robot names to use as stop-words during keyword extraction.
// Updated here when new robots are added (avoids a circular dependency with team-leader.js).
const ROBOT_NAMES = new Set([
    "scout", "detective", "people", "money", "feature", "plan", "priority",
    "user-stories", "scope-spec", "feasibility-tech", "feasibility-design",
    "customer-journeys", "data-privacy", "gtm-readiness", "risks-registry",
    "kpis", "daci-stakeholders",
]);

// Common English stop-words to skip during keyword extraction
const STOP_WORDS = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "is", "was", "it", "this", "that", "be", "by", "are",
    "not", "add", "more", "need", "needs", "should", "would", "could",
    "good", "great", "nice", "better", "best", "output", "analysis",
    "robot", "ran", "run", "please", "very", "too", "also",
]);

export class ProcessAdvisor {
    /**
     * @param {import('../brain/brain-database.js').default} database
     * @param {import('../utils/notification-service.js').NotificationService} notificationService
     */
    constructor(database, notificationService) {
        this.database            = database;
        this.notificationService = notificationService;
    }

    /**
     * Run analysis for the given robot if enough feedback has accumulated.
     * Called fire-and-forget — never throws; errors are logged only.
     *
     * @param {string} robotName
     */
    async analyzeIfThresholdMet(robotName) {
        try {
            const allFeedback = this.database.data.feedback.filter(f => f.robotName === robotName);
            if (allFeedback.length < FEEDBACK_THRESHOLD) return;

            await this._checkLowRating(robotName, allFeedback);
            await this._checkMissingRobotTopics();

            await this.notificationService.checkAndNotify();
        } catch (err) {
            console.error(`ProcessAdvisor error for ${robotName}: ${err.message}`);
        }
    }

    // ── Private helpers ──────────────────────────────────────────────

    async _checkLowRating(robotName, feedbackRecords) {
        const avg = feedbackRecords.reduce((sum, f) => sum + f.rating, 0) / feedbackRecords.length;
        if (avg >= LOW_RATING_THRESHOLD) return;

        // Avoid duplicate pending suggestions for the same robot
        const existing = (this.database.data.processImprovements || []).find(
            s => s.type === "improve-robot" && s.robotName === robotName && s.status === "pending"
        );
        if (existing) return;

        const evidence = feedbackRecords
            .filter(f => f.rating < 4 && f.notes)
            .slice(-5)
            .map(f => f.notes);

        await this.database.saveProcessImprovement({
            type:      "improve-robot",
            robotName,
            evidence,
            frequency: feedbackRecords.length,
            status:    "pending",
        });

        console.log(`💡 ProcessAdvisor: improve-robot suggestion created for ${robotName} (avg rating ${avg.toFixed(1)})`);
    }

    async _checkMissingRobotTopics() {
        const allFeedback = this.database.data.feedback || [];
        if (allFeedback.length < FEEDBACK_THRESHOLD) return;

        // Extract token frequencies from all feedback notes
        const tokenFreq = {};
        for (const f of allFeedback) {
            if (!f.notes) continue;
            const tokens = f.notes
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, " ")
                .split(/\s+/)
                .filter(t => t.length > 3 && !STOP_WORDS.has(t) && !ROBOT_NAMES.has(t));
            for (const token of tokens) {
                tokenFreq[token] = (tokenFreq[token] || 0) + 1;
            }
        }

        // Find tokens that appear at least FEEDBACK_THRESHOLD times
        const hotTopics = Object.entries(tokenFreq)
            .filter(([, count]) => count >= FEEDBACK_THRESHOLD)
            .sort((a, b) => b[1] - a[1])
            .map(([token]) => token);

        for (const topic of hotTopics) {
            // Skip if a pending new-robot suggestion already covers this topic
            const duplicate = (this.database.data.processImprovements || []).find(
                s => s.type === "new-robot" && s.status === "pending" &&
                     s.evidence?.some(e => e.includes(topic))
            );
            if (duplicate) continue;

            const matchingNotes = allFeedback
                .filter(f => f.notes?.toLowerCase().includes(topic))
                .slice(-5)
                .map(f => f.notes);

            await this.database.saveProcessImprovement({
                type:      "new-robot",
                robotName: null,
                evidence:  matchingNotes,
                frequency: tokenFreq[topic],
                status:    "pending",
            });

            console.log(`💡 ProcessAdvisor: new-robot suggestion created for topic "${topic}" (${tokenFreq[topic]} mentions)`);
        }
    }
}
