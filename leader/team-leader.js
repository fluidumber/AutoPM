import fs from "fs/promises";

import ScoutRobot from "../robots/scout-robot.js";
import DetectiveRobot from "../robots/detective-robot.js";
import PeopleRobot from "../robots/people-robot.js";
import MoneyRobot from "../robots/money-robot.js";
import FeatureRobot from "../robots/feature-robot.js";
import PlanRobot from "../robots/plan-robot.js";
import PriorityRobot from "../robots/priority-robot.js";
import InterviewRobot from "../robots/interview-robot.js";

// Phase 2 robots
import UserStoriesRobot      from "../robots/user-stories-robot.js";
import ScopeSpecRobot        from "../robots/scope-spec-robot.js";
import CustomerJourneysRobot from "../robots/customer-journeys-robot.js";
import FeasibilityTechRobot   from "../robots/feasibility-tech-robot.js";
import FeasibilityDesignRobot  from "../robots/feasibility-design-robot.js";
import KpisRobot               from "../robots/kpis-robot.js";
import DataPrivacyRobot        from "../robots/data-privacy-robot.js";
import GtmReadinessRobot       from "../robots/gtm-readiness-robot.js";
import RisksRegistryRobot      from "../robots/risks-registry-robot.js";
import DaciStakeholdersRobot   from "../robots/daci-stakeholders-robot.js";

import RobotMemory from "../brain/robot-memory.js";
import LearningEngine from "../brain/learning-engine.js";
import BrainDatabase from "../brain/brain-database.js";

import { WorkspaceManager } from "../src/workspace/workspace-manager.js";
import { AssetStore } from "../src/workspace/asset-store.js";
import { ContextStore } from "../src/workspace/context-store.js";
import { FreshnessTracker } from "../src/workspace/freshness-tracker.js";

// ── Robot registries ────────────────────────────────────────────────

/** Phase 1 run order — strategic discovery */
const ROBOT_ORDER = [
    "scout",
    "detective",
    "people",
    "money",
    "feature",
    "plan",
    "priority",
];

/** Phase 2 run order — execution definition */
const ROBOT_ORDER_PHASE_2 = [
    "user-stories",
    "scope-spec",
    "feasibility-tech",
    "feasibility-design",
    "customer-journeys",
    "data-privacy",
    "gtm-readiness",
    "risks-registry",
    "kpis",
    "daci-stakeholders",
];

/**
 * Gate rule: ALL Phase 1 robots must be fresh before any Phase 2 robot
 * can run.  This is the full set — no exceptions.
 */
const PHASE2_GATE_ROBOTS = ROBOT_ORDER;

class TeamLeader {
    constructor() {
        console.log("👑 === TEAM LEADER: Initializing ===");

        // Create all robots — Phase 1
        this.robots = {
            scout:     new ScoutRobot(),
            detective: new DetectiveRobot(),
            people:    new PeopleRobot(),
            money:     new MoneyRobot(),
            feature:   new FeatureRobot(),
            plan:      new PlanRobot(),
            priority:  new PriorityRobot(),

            // Phase 2
            "user-stories":        new UserStoriesRobot(),
            "scope-spec":          new ScopeSpecRobot(),
            "customer-journeys":   new CustomerJourneysRobot(),
            "feasibility-tech":    new FeasibilityTechRobot(),
            "feasibility-design":  new FeasibilityDesignRobot(),
            "kpis":                new KpisRobot(),
            "data-privacy":        new DataPrivacyRobot(),
            "gtm-readiness":       new GtmReadinessRobot(),
            "risks-registry":      new RisksRegistryRobot(),
            "daci-stakeholders":   new DaciStakeholdersRobot(),
        };
        this.interviewer = new InterviewRobot();

        // Create brain
        this.memory = new RobotMemory();
        this.database = new BrainDatabase();
        this.learner  = new LearningEngine(this.memory, this.database);

        // Workspace layer (product-scoped persistence). Optional — sessions
        // without a productSlug fall back to purely in-memory behaviour.
        this.workspace = new WorkspaceManager();
        this.assetStore = new AssetStore(this.workspace);
        this.contextStore = new ContextStore(this.workspace);
        this.freshness = new FreshnessTracker(this.workspace);

        // Active analysis sessions: analysisId -> session state
        this.sessions = new Map();

        // Propagate the database ready promise so callers can await full init.
        // Chain: after disk load, immediately hydrate the LearningEngine with
        // all persisted feedback so improvement hints survive server restarts.
        this.ready = this.database.ready.then(() => this._hydrateLearner());

        console.log("✅ All robots ready! 🤖🤖🤖🤖🤖🤖🤖🤖\n");
    }

    /**
     * Restore learning state from persisted feedback on boot.
     */
    _hydrateLearner() {
        const allFeedback = this.database.data.feedback || [];
        let hydratedCount = 0;
        for (const fb of allFeedback) {
            if (fb.rating >= 4) {
                this.learner.learnFromSuccess(
                    `${fb.robotName}: ${fb.notes || "good output"}`,
                    fb.rating / 5
                );
            } else {
                this.learner.learnFromFailure(
                    `${fb.robotName}: needs improvement`,
                    fb.notes || "low rating"
                );
            }
            hydratedCount++;
        }
        if (hydratedCount > 0) {
            console.log(`🧠 Hydrated learner with ${hydratedCount} historical feedback items`);
        }
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

    // ── Phase 2 helpers ──────────────────────────────────────────────

    /**
     * Build extended enrichedContext for a Phase 2 robot.
     *
     * Loads Phase 1 robot output files (Claude's generated analysis text) from
     * assets/*-output.md, and merges the Phase 2 context manifest from
     * context/phase2-context.json.  The result is passed to Phase 2 robot
     * analyze() methods in place of the base enrichedContext.
     *
     * @param {string} productSlug
     * @param {Object} baseContext - the session's enrichedContext
     * @returns {Promise<Object>} extended context with phase1Outputs + phase2Context
     */
    async _buildPhase2Context(productSlug, baseContext) {
        // Load Claude's generated output text for ALL robots — Phase 1 and Phase 2.
        // Phase 2 robots like risks-registry read feasibility-tech-output and
        // gtm-readiness-output, so we must load every available output file.
        // The map key is the robot name regardless of phase.
        const phase1Outputs = {};
        const allRobots = [...ROBOT_ORDER, ...ROBOT_ORDER_PHASE_2];
        for (const robot of allRobots) {
            const text = await this.assetStore.loadLatestRobotOutput(productSlug, robot);
            if (text) {
                phase1Outputs[robot] = text;
            }
        }

        // Load Phase 2 context manifest (scaffolded by promote-to-phase-2)
        let phase2Context = {};
        try {
            const p2Path = this.workspace.getPhase2ContextPath(productSlug);
            const raw = await fs.readFile(p2Path, "utf-8");
            phase2Context = JSON.parse(raw);
        } catch {
            // Phase 2 manifest not yet created — Phase 2 robots degrade gracefully
        }

        // Load DACI data (daci-stakeholders robot reads and confirms this)
        try {
            const daciPath = this.workspace.getDACIPath(productSlug);
            const raw = await fs.readFile(daciPath, "utf-8");
            phase2Context.daciData = JSON.parse(raw);
        } catch {
            // daci.json not yet written — daci-stakeholders robot will scaffold it
            phase2Context.daciData = null;
        }

        // Load aggregated research context (external research, surveys, experiment feedback)
        let researchContext = null;
        try {
            researchContext = await this.contextStore.loadResearchContext(productSlug);
        } catch {
            // No research entries — expected for many products
        }

        return {
            ...baseContext,
            phase1Outputs,
            phase2Context,
            researchContext,
        };
    }

    /**
     * Check whether all Phase 1 gate robots are fresh for a product.
     * Returns an array of robot names that are NOT fresh (empty = gate passed).
     *
     * @param {string} productSlug
     * @returns {Promise<string[]>} list of stale/missing robots
     */
    async checkPhase2Gate(productSlug) {
        const freshnessState = await this.freshness.getRobotFreshness(productSlug);
        return PHASE2_GATE_ROBOTS.filter(r => freshnessState[r]?.status !== "fresh");
    }

    /**
     * Run a single robot by name, store the result in the session.
     * If the session is tied to a product, the result is also persisted
     * to the product's assets/ folder and freshness is updated.
     *
     * For Phase 2 robots, additionally:
     *   - Enforces the Phase 2 gate (all Phase 1 must be fresh)
     *   - Builds extended context (Phase 1 outputs + Phase 2 manifest)
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

        // ── Phase 2 gate + context enrichment ───────────────────────
        let analysisContext = session.enrichedContext;

        if (ROBOT_ORDER_PHASE_2.includes(robotName)) {
            if (!session.productSlug) {
                throw new Error(
                    `Phase 2 robot '${robotName}' requires a productSlug. ` +
                    `Run run-robot with a productSlug so Phase 1 outputs can be loaded.`
                );
            }
            // Enforce gate: all Phase 1 must be fresh
            const blockedRobots = await this.checkPhase2Gate(session.productSlug);
            if (blockedRobots.length > 0) {
                throw new Error(
                    `Phase 2 gate blocked for '${robotName}': ` +
                    `Phase 1 robots not fresh — ${blockedRobots.join(", ")}. ` +
                    `Run all Phase 1 robots first, then retry.`
                );
            }
            // Build extended context from Phase 1 outputs + Phase 2 manifest
            analysisContext = await this._buildPhase2Context(session.productSlug, session.enrichedContext);
            console.log(`🔗 Phase 2 context built for '${robotName}' — ` +
                `Phase 1 outputs loaded: [${Object.keys(analysisContext.phase1Outputs).join(", ")}]`);
        }

        // Gather improvement hints from past feedback
        const hints = this.learner.getImprovementHints(robotName);

        // Build the prompt that goes into the robot — enriched context + hints
        console.log(`🤖 Running ${robot.name}...`);
        const result = await robot.analyze(analysisContext);

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
     *
     * analysisMarkdown — the full text Claude generated for this robot.  When
     *   provided, it is persisted as YYYY-MM-DD-<robot>-output.md so Phase 2
     *   robots can read it.  This is the atomic persistence point: callers
     *   should NOT rely on a separate save-robot-output call for the normal
     *   human-in-the-loop flow.
     *
     * bypassReason — escape hatch for headless/programmatic callers that have
     *   already persisted the output via save-robot-output.  When set,
     *   analysisMarkdown is not required.
     *
     * @param {string} analysisId
     * @param {string} robotName
     * @param {number} rating
     * @param {string} notes
     * @param {{ analysisMarkdown?: string|null, bypassReason?: string|null }} [opts]
     */
    async saveFeedback(analysisId, robotName, rating, notes, { analysisMarkdown = null, bypassReason = null } = {}) {
        const session = this.sessions.get(analysisId);
        if (session) {
            session.feedback[robotName] = { rating, notes };
        }

        // Persist the generated analysis text (atomic with the rating so it
        // cannot be skipped in the normal human-in-the-loop flow).
        if (analysisMarkdown && session?.productSlug) {
            try {
                await this.assetStore.saveRobotOutput(session.productSlug, robotName, analysisMarkdown);
                console.log(`💾 Saved ${robotName} output text (via feedback)`);
            } catch (err) {
                console.error(`Failed to save ${robotName} output: ${err.message}`);
            }
        }

        // Persist rating to brain database for long-term learning
        await this.database.saveFeedback(analysisId, robotName, rating, notes);

        // Feed into learning engine (tiered hypothesis system)
        await this.learner.recordFeedback(
            robotName,
            rating,
            notes || "",
            session?.productSlug || null
        );

        // Append rating block to the prompt-payload asset file so the history
        // file reflects the PM's assessment alongside the original analysis.
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

export { ROBOT_ORDER, ROBOT_ORDER_PHASE_2, PHASE2_GATE_ROBOTS };
export default TeamLeader;