// Learning Engine - Makes robots smarter from feedback

// Confirmations needed to promote a pattern up one tier (observation → hypothesis).
// Double the threshold to reach rule (hypothesis → rule).
const PROMOTION_THRESHOLDS = {
    default: 3,
    // per-robot overrides: "scout": 4, etc.
};

function getThreshold(robotName) {
    return PROMOTION_THRESHOLDS[robotName] ?? PROMOTION_THRESHOLDS.default;
}

class LearningEngine {
    /**
     * @param {import('./robot-memory.js').default} memory
     * @param {import('./brain-database.js').default} [database] - optional; enables tiered knowledge layer
     */
    constructor(memory, database = null) {
        this.memory   = memory;
        this.database = database;
        this.learnings = [];
    }

    /**
     * Replay persisted feedback records (from BrainDatabase) into the
     * in-memory learnings array.  Called once at startup — after
     * BrainDatabase finishes loading from disk — so improvement hints
     * survive server restarts.
     *
     * Knowledge layer entries are already on disk in knowledgeLayer.entries
     * and are read directly by getKnowledgeForRobot(), so we only rebuild
     * the in-memory learnings[] array here.
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

    /**
     * Record a feedback event and promote/demote the knowledge tier accordingly.
     * Replaces the binary learnFromSuccess/learnFromFailure call in saveFeedback().
     *
     * @param {string} robotName
     * @param {number} rating - 1-5
     * @param {string} notes
     * @param {string|null} productSlug
     */
    async recordFeedback(robotName, rating, notes, productSlug = null) {
        const content = rating >= 4
            ? `${robotName}: ${notes || "good output"}`
            : `${robotName}: needs improvement`;

        if (this.database) {
            const entries  = this.database.getKnowledgeForRobot(robotName);
            const existing = entries.find(e => e.content === content);

            if (rating >= 4) {
                const threshold = getThreshold(robotName);
                if (!existing) {
                    await this.database.upsertKnowledgeEntry({
                        robotName,
                        content,
                        tier:               "observation",
                        confirmations:      1,
                        contradictions:     0,
                        promotionThreshold: threshold,
                        productSlugs:       productSlug ? [productSlug] : [],
                    });
                } else {
                    const confirmations = (existing.confirmations || 0) + 1;
                    const productSlugs  = existing.productSlugs || [];
                    if (productSlug && !productSlugs.includes(productSlug)) {
                        productSlugs.push(productSlug);
                    }
                    let tier = existing.tier;
                    if (confirmations >= threshold * 2) {
                        tier = "rule";
                    } else if (confirmations >= threshold) {
                        tier = "hypothesis";
                    }
                    await this.database.upsertKnowledgeEntry({
                        ...existing,
                        confirmations,
                        productSlugs,
                        tier,
                    });
                }
            } else {
                // Contradiction: demote existing rule to hypothesis
                const ruleEntry = entries.find(e =>
                    e.tier === "rule" && e.content.startsWith(robotName)
                );
                if (ruleEntry) {
                    await this.database.demoteEntry(ruleEntry.id);
                }
            }
        }

        // Maintain backward-compat in-memory array
        if (rating >= 4) {
            this.learnFromSuccess(content, rating / 5);
        } else {
            this.learnFromFailure(content, notes || "low rating");
        }
    }

    // Learn from success (in-memory, kept for backward compat)
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

    // Learn from failure (in-memory, kept for backward compat)
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
     * Now surfaces tiered knowledge (rules > hypotheses > observations) in addition
     * to the existing in-memory success/failure signals.
     *
     * @param {string} robotName
     * @param {string} [productSlug]
     */
    getImprovementHints(robotName, productSlug = null) {
        // Filter in-memory learnings relevant to this robot
        const robotLearnings = this.learnings.filter(
            (l) =>
                (l.successfulMethod && l.successfulMethod.startsWith(robotName)) ||
                (l.failedMethod && l.failedMethod.startsWith(robotName))
        );

        // Build tiered knowledge from persisted layer
        const knowledgeTier = { rules: [], hypotheses: [], observations: [] };
        if (this.database) {
            const entries = this.database.getKnowledgeForRobot(robotName, productSlug);
            for (const e of entries) {
                if (e.tier === "rule")        knowledgeTier.rules.push(e.content);
                else if (e.tier === "hypothesis") knowledgeTier.hypotheses.push(e.content);
                else                          knowledgeTier.observations.push(e.content);
            }
        }

        const hasTieredKnowledge = knowledgeTier.rules.length > 0 ||
                                   knowledgeTier.hypotheses.length > 0 ||
                                   knowledgeTier.observations.length > 0;

        if (robotLearnings.length === 0 && !hasTieredKnowledge) {
            return {
                hasHints: false,
                message: "No past feedback for this robot yet.",
            };
        }

        // Split in-memory hints by product scope
        const forThisProduct = productSlug
            ? robotLearnings.filter(l => l.productSlug === productSlug)
            : [];
        const crossProduct = productSlug
            ? robotLearnings.filter(l => l.productSlug !== productSlug)
            : robotLearnings;

        const allSuccesses = robotLearnings.filter(l => l.successfulMethod).map(l => l.successfulMethod);
        const allFailures  = robotLearnings.filter(l => l.failedMethod).map(l => ({ what: l.failedMethod, reason: l.reason, product: l.productSlug }));
        const uniqueReasons = [...new Set(allFailures.map(f => f.reason).filter(Boolean))];

        // Tiered suggestion: rules carry the most weight
        let tieredSuggestion;
        if (knowledgeTier.rules.length > 0) {
            tieredSuggestion = `Confirmed patterns (apply by default): ${knowledgeTier.rules.join("; ")}`;
        } else if (knowledgeTier.hypotheses.length > 0) {
            tieredSuggestion = `Emerging patterns (likely reliable): ${knowledgeTier.hypotheses.join("; ")}`;
        } else if (uniqueReasons.length > 0) {
            tieredSuggestion = `Previous PM feedback to address: ${uniqueReasons.join("; ")}`;
        } else {
            tieredSuggestion = "Past feedback has been positive — maintain current quality.";
        }

        return {
            hasHints: true,
            totalFeedback: robotLearnings.length,
            fromThisProduct: forThisProduct.length,
            fromOtherProducts: crossProduct.length,
            whatWorked: allSuccesses,
            whatNeedsImprovement: allFailures,
            knowledgeTier,
            tieredSuggestion,
            // keep legacy field name so existing prompt templates still work
            suggestion: tieredSuggestion,
        };
    }
}

export default LearningEngine;
