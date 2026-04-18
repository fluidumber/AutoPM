// Learning Engine - Makes robots smarter from feedback
class LearningEngine {
    constructor(memory) {
        this.memory = memory;
        this.learnings = [];
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
     */
    getImprovementHints(robotName) {
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

        const successes = robotLearnings
            .filter((l) => l.successfulMethod)
            .map((l) => l.successfulMethod);

        const failures = robotLearnings
            .filter((l) => l.failedMethod)
            .map((l) => ({
                what: l.failedMethod,
                reason: l.reason,
            }));

        return {
            hasHints: true,
            totalFeedback: robotLearnings.length,
            whatWorked: successes,
            whatNeedsImprovement: failures,
            suggestion:
                failures.length > 0
                    ? `Users previously requested improvements: ${failures
                          .map((f) => f.reason)
                          .join("; ")}`
                    : "Past feedback has been positive — maintain current quality.",
        };
    }
}

export default LearningEngine;