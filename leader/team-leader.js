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

        // Active analysis sessions: analysisId -> session state
        this.sessions = new Map();

        console.log("✅ All robots ready! 🤖🤖🤖🤖🤖🤖🤖🤖\n");
    }

    // ── Interview (stateful, one question at a time) ────────────────
    startInterview(rawIdea) {
        return this.interviewer.startInterview(rawIdea);
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
     */
    startAnalysis(enrichedContext) {
        const id = `analysis-${Date.now()}`;
        this.sessions.set(id, {
            id,
            enrichedContext,
            productIdea:
                enrichedContext.productIdea || enrichedContext.summary || id,
            results: {},
            feedback: {},
            completedRobots: [],
            startedAt: new Date().toISOString(),
        });
        console.log(`📋 Analysis session started: ${id}`);
        return id;
    }

    /**
     * Run a single robot by name, store the result in the session.
     */
    async runSingleRobot(analysisId, robotName) {
        const session = this.sessions.get(analysisId);
        if (!session) throw new Error(`Unknown analysis ID: ${analysisId}`);

        const robot = this.robots[robotName];
        if (!robot) throw new Error(`Unknown robot: ${robotName}`);

        // Gather improvement hints from past feedback
        const hints = this.learner.getImprovementHints(robotName);

        // Build the prompt that goes into the robot — enriched context + hints
        const contextStr =
            session.enrichedContext.summary || session.enrichedContext.productIdea;

        console.log(`🤖 Running ${robot.name}...`);
        const result = await robot.analyze(contextStr);

        // Attach improvement hints so Claude can see them
        result._improvementHints = hints;

        // Store in session
        session.results[robotName] = result;
        session.completedRobots.push(robotName);

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