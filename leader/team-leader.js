import ScoutRobot from "../robots/scout-robot.js";
import DetectiveRobot from "../robots/detective-robot.js";
import PeopleRobot from "../robots/people-robot.js";
import MoneyRobot from "../robots/money-robot.js";
import FeatureRobot from "../robots/feature-robot.js";
import PlanRobot from "../robots/plan-robot.js";
import PriorityRobot from "../robots/priority-robot.js";
import InterviewRobot from "../robots/interview-robot.js";

import RobotMemory from "../brain/robot-memory.js";
import LearningEngine from "../brain/learning-engine.js";
import BrainDatabase from "../brain/brain-database.js";

import { WorkspaceManager } from "../src/workspace/workspace-manager.js";
import { AssetStore } from "../src/workspace/asset-store.js";
import { ContextStore } from "../src/workspace/context-store.js";
import { FreshnessTracker } from "../src/workspace/freshness-tracker.js";

// Robot registry — maps names to instances
const ROBOT_ORDER = [
    "scout",
    "detective",
    "people",
    "money",
    "feature",
    "plan",
    "priority",
];

class TeamLeader {
    constructor() {
        console.log("👑 === TEAM LEADER: Initializing ===");

        // Create all robots
        this.robots = {
            scout: new ScoutRobot(),
            detective: new DetectiveRobot(),
            people: new PeopleRobot(),
            money: new MoneyRobot(),
            feature: new FeatureRobot(),
            plan: new PlanRobot(),
            priority: new PriorityRobot(),
        };
        this.interviewer = new InterviewRobot();

        // Create brain
        this.memory = new RobotMemory();
        this.learner = new LearningEngine(this.memory);
        this.database = new BrainDatabase();

        // Workspace layer (product-scoped persistence). Optional — sessions
        // without a productSlug fall back to purely in-memory behaviour.
        this.workspace = new WorkspaceManager();
        this.assetStore = new AssetStore(this.workspace);
        this.contextStore = new ContextStore(this.workspace);
        this.freshness = new FreshnessTracker(this.workspace);

        // Active analysis sessions: analysisId -> session state
        this.sessions = new Map();

        // Propagate the database ready promise so callers can await full init
        this.ready = this.database.ready;

        console.log("✅ All robots ready! 🤖🤖🤖🤖🤖🤖🤖🤖\n");
    }

    // ── Interview (stateful, one question at a time) ────────────────

    /**
     * Start a new interview. If `productSlug` is provided and the product
     * already has stored interview answers, the PM can opt to reuse the
     * fresh ones by passing `useEarlierResearch: true` — those questions
     * will be pre-filled and skipped in the interview flow.
     *
     * @param {string} rawIdea
     * @param {object} [opts]
     * @param {string} [opts.productSlug]
     * @param {boolean} [opts.useEarlierResearch=false]
     */
    async startInterview(rawIdea, { productSlug = null, useEarlierResearch = false } = {}) {
        let preFilledAnswers = {};
        let preFilledSources = [];

        if (productSlug && useEarlierResearch) {
            try {
                const stored = await this.freshness.getStoredAnswers(productSlug);
                for (const [qid, entry] of Object.entries(stored || {})) {
                    if (entry?.status === "fresh" && entry.value != null && String(entry.value).trim() !== "") {
                        preFilledAnswers[qid] = entry.value;
                        preFilledSources.push(qid);
                    }
                }
            } catch (err) {
                console.error(`Failed to load prior answers for ${productSlug}: ${err.message}`);
            }
        }

        return this.interviewer.startInterview(rawIdea, { preFilledAnswers, preFilledSources });
    }

    answerInterviewQuestion(interviewSessionId, answer) {
        return this.interviewer.processAnswer(interviewSessionId, answer);
    }

    skipInterviewQuestion(interviewSessionId) {
        return this.interviewer.skipQuestion(interviewSessionId);
    }

    // ── Session management ───────────────────────────────────────────

    /**
     * Start a new analysis session and return its ID.
     * @param {object} enrichedContext - interview output
     * @param {object} [opts]
     * @param {string} [opts.productSlug] - if provided, session is tied to a
     *        product on disk. Results persist to assets/, interview answers
     *        persist to context/, and freshness is tracked.
     */
    startAnalysis(enrichedContext, { productSlug = null } = {}) {
        const id = `analysis-${Date.now()}`;
        this.sessions.set(id, {
            id,
            enrichedContext,
            productSlug,
            productIdea:
                enrichedContext.productIdea || enrichedContext.summary || id,
            results: {},
            feedback: {},
            completedRobots: [],
            startedAt: new Date().toISOString(),
        });
        console.log(`📋 Analysis session started: ${id}${productSlug ? ` (product: ${productSlug})` : ""}`);

        // Persist interview answers to the product's context folder (fire & forget).
        // We don't await because session creation should be synchronous from the
        // caller's perspective, but we log errors so silent failures don't hide bugs.
        if (productSlug && enrichedContext?.answers) {
            Promise.all([
                this.contextStore.saveInterviewAnswers(productSlug, enrichedContext.answers),
                this.freshness.recordAllInterviewAnswers(productSlug, enrichedContext.answers),
            ]).catch(err => console.error(`Failed to persist interview answers: ${err.message}`));
        }

        return id;
    }

    /**
     * Run a single robot by name, store the result in the session.
     * If the session is tied to a product, the result is also persisted
     * to the product's assets/ folder and freshness is updated.
     *
     * @param {string} analysisId
     * @param {string} robotName
     * @param {object} [opts]
     * @param {boolean} [opts.forceRerun=false] - run even if a fresh asset exists
     */
    async runSingleRobot(analysisId, robotName, { forceRerun = false } = {}) {
        const session = this.sessions.get(analysisId);
        if (!session) throw new Error(`Unknown analysis ID: ${analysisId}`);

        const robot = this.robots[robotName];
        if (!robot) throw new Error(`Unknown robot: ${robotName}`);

        // If this session is product-scoped, check for a fresh cached result first.
        if (session.productSlug && !forceRerun) {
            const freshnessState = await this.freshness.getRobotFreshness(session.productSlug);
            const robotState = freshnessState[robotName];
            if (robotState?.status === "fresh") {
                const cached = await this.assetStore.loadRobotResult(session.productSlug, robotState.assetPath);
                if (cached?.result) {
                    console.log(`♻️  Reusing cached ${robotName} result (age: ${robotState.ageDays}d, asset: ${robotState.assetPath})`);
                    cached.result._reused = {
                        fromAsset: robotState.assetPath,
                        ageDays: robotState.ageDays,
                        reason: "Fresh asset available — re-run skipped. Pass forceRerun=true to override.",
                    };
                    session.results[robotName] = cached.result;
                    if (!session.completedRobots.includes(robotName)) {
                        session.completedRobots.push(robotName);
                    }
                    return cached.result;
                }
            }
        }

        // Gather improvement hints from past feedback
        const hints = this.learner.getImprovementHints(robotName);

        // Build the prompt that goes into the robot — enriched context + hints
        console.log(`🤖 Running ${robot.name}...`);
        const result = await robot.analyze(session.enrichedContext);

        // Attach improvement hints so Claude can see them
        result._improvementHints = hints;

        // Store in session
        session.results[robotName] = result;
        session.completedRobots.push(robotName);

        // Persist to disk if product-scoped
        if (session.productSlug) {
            try {
                const assetPath = await this.assetStore.saveRobotResult(
                    session.productSlug,
                    robotName,
                    result
                );
                await this.freshness.recordRobotRun(session.productSlug, robotName, assetPath);
                console.log(`💾 Saved ${robotName} analysis to ${assetPath}`);
            } catch (err) {
                console.error(`Failed to persist ${robotName} result: ${err.message}`);
            }
        }

        return result;
    }

    /**
     * Get current state of an analysis: which robots ran, results so far.
     */
    getAnalysisState(analysisId) {
        const session = this.sessions.get(analysisId);
        if (!session) return null;
        return {
            id: session.id,
            productIdea: session.productIdea,
            completedRobots: session.completedRobots,
            remainingRobots: ROBOT_ORDER.filter(
                (r) => !session.completedRobots.includes(r)
            ),
            feedback: session.feedback,
            startedAt: session.startedAt,
        };
    }

    /**
     * Get the next robot to run in the standard order.
     */
    getNextRobot(analysisId) {
        const session = this.sessions.get(analysisId);
        if (!session) return null;
        return (
            ROBOT_ORDER.find(
                (r) => !session.completedRobots.includes(r)
            ) || null
        );
    }

    /**
     * Store user feedback for a robot's output.
     * If the session is tied to a product, the feedback is also appended
     * to the robot's asset markdown file on disk.
     */
    async saveFeedback(analysisId, robotName, rating, notes) {
        const session = this.sessions.get(analysisId);
        if (session) {
            session.feedback[robotName] = { rating, notes };
        }
        // Also persist to brain database for long-term learning
        await this.database.saveFeedback(analysisId, robotName, rating, notes);
        // Feed into learning engine
        if (rating >= 4) {
            this.learner.learnFromSuccess(
                `${robotName}: ${notes || "good output"}`,
                rating / 5
            );
        } else {
            this.learner.learnFromFailure(
                `${robotName}: needs improvement`,
                notes || "low rating"
            );
        }

        // Persist to asset file if the session is product-scoped.
        // Look up the latest asset path via the freshness tracker so we
        // don't have to track it separately on the session.
        if (session?.productSlug) {
            try {
                const freshnessState = await this.freshness.getRobotFreshness(session.productSlug);
                const assetPath = freshnessState[robotName]?.assetPath;
                if (assetPath) {
                    await this.assetStore.appendFeedback(
                        session.productSlug,
                        assetPath,
                        { rating, notes }
                    );
                    console.log(`📝 Appended feedback to ${assetPath}`);
                }
            } catch (err) {
                console.error(`Failed to append feedback to asset: ${err.message}`);
            }
        }
    }

    /**
     * Get all results for a completed (or partially completed) analysis.
     */
    getFullResults(analysisId) {
        const session = this.sessions.get(analysisId);
        if (!session) return null;
        return {
            id: session.id,
            productIdea: session.productIdea,
            enrichedContext: session.enrichedContext,
            results: session.results,
            feedback: session.feedback,
            completedRobots: session.completedRobots,
        };
    }

    // ── Legacy: run all robots at once (backward compat for run.js) ──

    async analyzeBusiness(productIdea) {
        console.log("═══════════════════════════════════════════");
        console.log(`👑 ANALYZING: "${productIdea}"`);
        console.log("═══════════════════════════════════════════\n");

        const results = {};

        for (const name of ROBOT_ORDER) {
            console.log(`🤖 Running ${this.robots[name].name}...`);
            results[name] = await this.robots[name].analyze(productIdea);
        }

        // Map to the old keys for backward compat
        const mapped = {
            market: results.scout,
            competition: results.detective,
            users: results.people,
            profit: results.money,
            features: results.feature,
            roadmap: results.plan,
            priority: results.priority,
        };

        await this.database.saveAnalysis(productIdea, mapped);
        this.learner.learnFromSuccess(`Analyzed: ${productIdea}`, 0.85);

        return mapped;
    }

    showSummary() {
        console.log("\n═══════════════════════════════════════════");
        console.log("📊 === ANALYSIS SUMMARY ===");
        console.log("═══════════════════════════════════════════");
        this.memory.showAll();
    }
}

export { ROBOT_ORDER };
export default TeamLeader;