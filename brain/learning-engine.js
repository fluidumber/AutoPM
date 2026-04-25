// Learning Engine - Makes robots smarter from feedback
class LearningEngine {
    constructor(memory) {
        this.memory = memory;
        this.learnings = [];
    }

    /**
     * Replay persisted feedback records (from BrainDatabase) into the
     * in-memory learnings array.  Called once at startup — after
     * BrainDatabase finishes loading from disk — so improvement hints
     * survive server restarts.
     *
     * @param {Array<{robotName: string, rating: number, notes: string, productSlug?: string}>} feedbackRecords
     */
    hydrateFromPersistedFeedback(feedbackRecords) {
        if (!Array.isArray(feedbackRecords) || feedbackRecords.length === 0) return 0;

        let count = 0;
        for (const record of feedbackRecords) {
            if (!record.robotName) continue;
            if (record.rating >= 4) {
                this.learnings.push({
                    successfulMethod: `${record.robotName}: ${record.notes || "good output"}`,
                    effectiveness: record.rating / 5,
                    timesSeen: 1,
                    productSlug: record.productSlug || null,
                    hydratedFromDisk: true,
                });
                this.memory.remember(`Learned: ${record.robotName}: ${record.notes || "good output"}`, record.rating / 5);
            } else {
                this.learnings.push({
                    failedMethod: `${record.robotName}: needs improvement`,
                    reason: record.notes || "low rating",
                    effectiveness: 0.1,
                    productSlug: record.productSlug || null,
                    hydratedFromDisk: true,
                });
                this.memory.remember(`Failed: ${record.robotName}: needs improvement`, 0.1);
            }
            count++;
        }

        console.log(`🧠 Hydrated ${count} feedback records from persistent brain`);
        return count;
    }

    // Learn from success
    learnFromSuccess(what, howGood = 0.9) {
        const learning = {
            successfulMethod: what,
            effectiveness: howGood,
            timesSeen: 1,
        };
        this.learnings.push(learning);
        this.memory.remember(`Learned: ${what}`, howGood);
        console.log(`✅ Learning: "${what}" (Score: ${howGood})`);
    }

    // Learn from failure
    learnFromFailure(what, whyItFailed) {
        const learning = {
            failedMethod: what,
            reason: whyItFailed,
            effectiveness: 0.1,
        };
        this.learnings.push(learning);
        this.memory.remember(`Failed: ${what}`, 0.1);
        console.log(`❌ Learning: "${what}" failed - ${whyItFailed}`);
    }

    // Apply learning
    applyLearning(situation) {
        const similar = this.memory.findSimilar(situation);
        if (similar.length > 0) {
            console.log(`🧠 Found ${similar.length} similar past experiences!`);
            return similar;
        }
        return null;
    }

    /**
     * Get improvement hints for a robot based on past feedback.
     * Returns common themes from low-rated feedback and tips from high-rated ones.
     * Includes hints from all products (global learning) — cross-product patterns
     * help each new run benefit from every past run.
     *
     * @param {string} robotName
     * @param {string} [productSlug] - Optional: if provided, product-specific hints
     *   are surfaced first, followed by hints from other products.
     */
    getImprovementHints(robotName, productSlug = null) {
        // Filter learnings relevant to this robot
        const robotLearnings = this.learnings.filter(
            (l) =>
                (l.successfulMethod && l.successfulMethod.startsWith(robotName)) ||
                (l.failedMethod && l.failedMethod.startsWith(robotName))
        );

        if (robotLearnings.length === 0) {
            return {
                hasHints: false,
                message: "No past feedback for this robot yet.",
            };
        }

        // Split into product-specific and cross-product hints
        const forThisProduct = productSlug
            ? robotLearnings.filter(l => l.productSlug === productSlug)
            : [];
        const crossProduct = productSlug
            ? robotLearnings.filter(l => l.productSlug !== productSlug)
            : robotLearnings;

        const allSuccesses = robotLearnings.filter(l => l.successfulMethod).map(l => l.successfulMethod);
        const allFailures  = robotLearnings.filter(l => l.failedMethod).map(l => ({ what: l.failedMethod, reason: l.reason, product: l.productSlug }));

        // Deduplicate failure reasons — same note text from multiple runs is one signal
        const uniqueReasons = [...new Set(allFailures.map(f => f.reason).filter(Boolean))];

        return {
            hasHints: true,
            totalFeedback: robotLearnings.length,
            fromThisProduct: forThisProduct.length,
            fromOtherProducts: crossProduct.length,
            whatWorked: allSuccesses,
            whatNeedsImprovement: allFailures,
            suggestion: uniqueReasons.length > 0
                ? `Previous PM feedback to address: ${uniqueReasons.join("; ")}`
                : "Past feedback has been positive — maintain current quality.",
        };
    }
}

export default LearningEngine;