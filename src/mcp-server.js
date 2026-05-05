import fs from "fs/promises";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import TeamLeader, { ROBOT_ORDER, ROBOT_ORDER_PHASE_2, PHASE2_GATE_ROBOTS } from "../leader/team-leader.js";
import { traverseGates } from "../leader/gate-traversal.js";
import { generatePresentation } from "../utils/presentation-generator.js";
import { renderMarkdown, renderHtml } from "../utils/pdd-renderer.js";
import { PDDComposer } from "./workspace/pdd-composer.js";
import { WorkspaceManager } from "./workspace/workspace-manager.js";
import { PMProfile } from "./workspace/pm-profile.js";
import { ProductRegistry } from "./workspace/product-registry.js";

// Redirect console.log to stderr — MCP uses stdio for JSON-RPC
console.log = (...args) => process.stderr.write(args.join(" ") + "\n");

// ── Bootstrap ────────────────────────────────────────────────────────
const teamLeader = new TeamLeader();
const workspace = new WorkspaceManager();
const pmProfile = new PMProfile(workspace);
const productRegistry = new ProductRegistry(workspace, pmProfile);
const pddComposer = new PDDComposer(workspace, teamLeader.assetStore);

const server = new McpServer({
    name: "productflow",
    version: "2.0.0",
});

// ── Active session helper ─────────────────────────────────────────────
// Reads active-session.json written by start-session.  Returns null when no
// session has been started (non-fatal — tools still function without it).
async function readActiveSession() {
    try {
        const raw = await fs.readFile(teamLeader.workspace.getActiveSessionPath(), "utf-8");
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

// ═════════════════════════════════════════════════════════════════════
// Tool 1: INTERVIEW — get PM questions for context gathering
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "interview",
    `Interactive PM-style interview — ONE question at a time.

FIRST CALL: Pass only 'businessIdea' to start the interview. Returns the first question.
  - Optional: pass 'productSlug' to tie the interview to an existing product so answers persist to disk.
  - Optional: pass 'useEarlierResearch: true' (requires productSlug) to reuse fresh prior answers — those questions will be pre-filled and skipped.
SUBSEQUENT CALLS: Pass 'interviewSessionId' + 'answer' (the user's reply). Returns the next question.
SKIP: Pass 'interviewSessionId' + 'action' = 'skip' to use the default answer.

The interview robot ANALYSES each answer:
- If the answer covers a future question, that question is AUTO-SKIPPED
- If the answer is too vague/shallow, a FOLLOW-UP question is asked
- Progress dynamically updates as questions are skipped or covered

When all questions are done, returns type="complete" with the enriched context to pass to 'run-robot'.
The completion payload also includes 'reusedAnswerIds' listing which answers were reused from prior research.

WORKFLOW:
1. Call with just businessIdea (+ optional productSlug / useEarlierResearch) → get first question
2. Show the question to the user, wait for their reply
3. Call again with interviewSessionId + answer → get next question
4. Repeat until type="complete"
5. Use the enrichedContext from the completion response to call 'run-robot'`,
    {
        businessIdea: z
            .string()
            .optional()
            .describe("The raw business idea. Required on FIRST call only."),
        interviewSessionId: z
            .string()
            .optional()
            .describe(
                "Session ID returned from previous call. Required on SUBSEQUENT calls."
            ),
        answer: z
            .string()
            .optional()
            .describe("The user's answer to the current question."),
        action: z
            .enum(["answer", "skip"])
            .optional()
            .describe(
                "Set to 'skip' to use the default answer and move on. Defaults to 'answer'."
            ),
        productSlug: z
            .string()
            .optional()
            .describe(
                "Optional product slug. If provided on the FIRST call, ties the interview to that product so answers persist to disk."
            ),
        useEarlierResearch: z
            .boolean()
            .optional()
            .describe(
                "If true and productSlug is provided, reuse fresh prior answers from the product's context — those questions are pre-filled and skipped in the interview loop."
            ),
    },
    async ({ businessIdea, interviewSessionId, answer, action, productSlug, useEarlierResearch }) => {
        let result;

        if (!interviewSessionId && businessIdea) {
            // First call — start interview (may reuse prior answers)
            result = await teamLeader.startInterview(businessIdea, {
                productSlug: productSlug || null,
                useEarlierResearch: !!useEarlierResearch,
            });
        } else if (interviewSessionId && action === "skip") {
            // Skip current question
            result = teamLeader.skipInterviewQuestion(interviewSessionId);
        } else if (interviewSessionId && answer) {
            // Process answer
            result = teamLeader.answerInterviewQuestion(
                interviewSessionId,
                answer
            );
        } else {
            result = {
                error: "Provide either 'businessIdea' to start, or 'interviewSessionId' + 'answer' to continue.",
            };
        }

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 2: RUN-ROBOT — run one robot at a time
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "run-robot",
    `Run a SINGLE analysis robot and return its results. Call one robot at a time so the PM can review and give feedback before proceeding.

Available robots — Phase 1 (strategic discovery, run first):
 1. scout          — Market demand (TAM/SAM/SOM, growth signals, demand validation)
 2. detective      — Competitive landscape (competitors, gaps, differentiators, moat)
 3. people         — User personas (segments, pain points, behaviors, jobs-to-be-done)
 4. money          — Financial model (unit economics, CAC/LTV/ARR/NRR/GRR, 3-scenario projections, Vega-Lite charts)
 5. feature        — Feature breakdown (MoSCoW-tagged, must-have vs nice-to-have vs future)
 6. plan           — Product roadmap (phased 12-18 month plan with milestones)
 7. priority       — Feature prioritization (RICE scoring, effort vs impact)

Available robots — Phase 2 (execution definition — all 7 Phase 1 robots must be fresh first):
 8. user-stories       — MoSCoW-tagged user stories derived from people + feature outputs
 9. scope-spec         — Scope, assumptions, constraints, and critical-change flag
10. feasibility-tech   — Architecture, technical concerns, third-party vendors, infrastructure deps
11. feasibility-design — Design principles, wireflow (screen-by-screen), accessibility commitments
12. customer-journeys  — End-to-end journey narratives per persona with step-by-step flows
13. data-privacy       — InfoSec, legal, and certification impact matrix (GDPR, SOC 2, etc.)
14. gtm-readiness      — CX stage matrix, rollout waves, Preview → GA criteria, pricing model
15. risks-registry     — Structured risk register across 5 risk categories with mitigations
16. kpis               — Adoption, retention, usage, and revenue KPIs with targets + source systems
17. daci-stakeholders  — DACI table + key contacts (persists across runs, updates incrementally)

Phase 2 prerequisite: call 'promote-to-phase-2' and receive { promoted: true } before running any Phase 2 robot.

If 'productSlug' is provided:
  - Results are persisted to the product's assets/ folder as markdown.
  - On subsequent calls, fresh results are reused automatically (see freshness windows).
  - Pass 'forceRerun: true' to re-run and overwrite a still-fresh result.

IMPORTANT: After showing the user this robot's output, ask them to rate it 1-5 and suggest improvements. Then call the 'feedback' tool before running the next robot.`,
    {
        analysisId: z
            .string()
            .optional()
            .describe(
                "Analysis session ID. If not provided, a new session is created automatically."
            ),
        robotName: z
            .enum([
                // Phase 1 — strategic discovery
                "scout", "detective", "people", "money", "feature", "plan", "priority",
                // Phase 2 — execution definition
                "user-stories", "scope-spec", "customer-journeys",
                "feasibility-tech", "feasibility-design", "kpis",
                "data-privacy", "gtm-readiness", "risks-registry", "daci-stakeholders",
            ])
            .describe("Which robot to run"),
        enrichedContext: z
            .string()
            .describe(
                "JSON string of enriched context from user interview answers. Must include at minimum: {\"productIdea\": \"...\", \"answers\": {...}, \"summary\": \"...\"}"
            ),
        productSlug: z
            .string()
            .optional()
            .describe(
                "Optional product slug. If provided, results persist to the product's assets/ folder and freshness is tracked for automatic reuse."
            ),
        forceRerun: z
            .boolean()
            .optional()
            .describe(
                "If true, re-run the robot even if a fresh cached result exists. Only meaningful when productSlug is provided."
            ),
    },
    async ({ analysisId, robotName, enrichedContext, productSlug, forceRerun }) => {
        // Parse context safely exactly once
        let context;
        if (typeof enrichedContext === "string") {
            try {
                context = JSON.parse(enrichedContext);
            } catch (e) {
                return {
                    content: [
                        { type: "text", text: JSON.stringify({ error: `Invalid enrichedContext JSON: ${e.message}` }, null, 2) }
                    ]
                };
            }
        } else if (typeof enrichedContext === "object" && enrichedContext !== null) {
            context = enrichedContext; // Already parsed, use directly
        } else {
            return {
                content: [
                    { type: "text", text: JSON.stringify({ error: "enrichedContext must be a JSON string or object" }, null, 2) }
                ]
            };
        }

        // Validate required fields
        if (!context.productIdea && !context.summary) {
            return {
                content: [
                    { type: "text", text: JSON.stringify({ error: "enrichedContext must include at least 'productIdea' or 'summary'" }, null, 2) }
                ]
            };
        }
        if (!context.answers || typeof context.answers !== "object") {
            return {
                content: [
                    { type: "text", text: JSON.stringify({ error: "enrichedContext must include an 'answers' object with interview responses" }, null, 2) }
                ]
            };
        }

        // Validate product slug if provided — product must exist on disk
        if (productSlug) {
            const product = await productRegistry.get(productSlug);
            if (!product) {
                return {
                    content: [
                        { type: "text", text: JSON.stringify({ error: `Unknown product: ${productSlug}. Call 'product-create' first or check 'product-list'.` }, null, 2) }
                    ]
                };
            }
        }

        // Start or reuse session
        let sessionId = analysisId;
        if (!sessionId) {
            sessionId = teamLeader.startAnalysis(context, { productSlug: productSlug || null });
        } else if (!teamLeader.sessions.has(sessionId)) {
            // Re-create session if not found (server may have restarted)
            sessionId = teamLeader.startAnalysis(context, { productSlug: productSlug || null });
        }

        // Run the robot
        const result = await teamLeader.runSingleRobot(sessionId, robotName, {
            forceRerun: !!forceRerun,
        });

        // Get session state
        const state = teamLeader.getAnalysisState(sessionId);

        // Soft session guard — hint if no active start-session call was made
        const activeSession = await readActiveSession();
        const sessionHint = (!activeSession || (productSlug && activeSession.productSlug !== productSlug))
            ? "No active session found for this product. Call 'start-session' with productSlug to see gate status and recommended next steps."
            : null;

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(
                        {
                            analysisId: sessionId,
                            robotName,
                            productSlug: productSlug || null,
                            reused: !!result?._reused,
                            result,
                            progress: {
                                completed: state.completedRobots,
                                remaining: state.remainingRobots,
                                nextRobot: teamLeader.getNextRobot(sessionId),
                            },
                            ...(sessionHint ? { sessionHint } : {}),
                        },
                        null,
                        2
                    ),
                },
            ],
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 3: FEEDBACK — capture user rating + persist robot output
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "feedback",
    `Save user feedback for a robot's analysis output. Call this after showing the user each robot's results and asking them to rate it.

REQUIRED: You MUST provide either 'analysisMarkdown' or 'bypassReason' — never neither.

  analysisMarkdown — the full analysis text Claude generated for this robot. Providing it here
    persists it atomically alongside the rating so Phase 2 robots can read Phase 1 outputs.
    This is the normal path for every human-in-the-loop run.

  bypassReason — escape hatch for headless / programmatic callers that have already persisted
    the output via 'save-robot-output'. Describe why the text is not being passed here.
    Example: "output already saved via save-robot-output before feedback was available".

Feedback ratings:
  4-5 → recorded as successful patterns (learning engine improves future runs)
  1-3 → recorded as areas to improve

If the session is tied to a product, the rating is also appended to the robot's asset file on disk.`,
    {
        analysisId: z.string().describe("The analysis session ID"),
        robotName: z
            .enum([
                // Phase 1
                "scout", "detective", "people", "money", "feature", "plan", "priority",
                // Phase 2
                "user-stories", "scope-spec", "customer-journeys",
                "feasibility-tech", "feasibility-design", "kpis",
                "data-privacy", "gtm-readiness", "risks-registry", "daci-stakeholders",
            ])
            .describe("Which robot to rate"),
        rating: z
            .number()
            .min(1)
            .max(5)
            .describe("User rating 1-5 (1=poor, 5=excellent)"),
        notes: z
            .string()
            .optional()
            .describe("Improvement suggestions or comments, e.g. 'Add specific TAM numbers'"),
        analysisMarkdown: z
            .string()
            .optional()
            .describe("The full analysis text Claude generated for this robot. Pass this to persist the output atomically with the rating. Required unless bypassReason is set."),
        bypassReason: z
            .string()
            .optional()
            .describe("Escape hatch — explain why analysisMarkdown is not provided (e.g. 'saved via save-robot-output'). Required if analysisMarkdown is absent."),
    },
    async ({ analysisId, robotName, rating, notes, analysisMarkdown, bypassReason }) => {
        // Enforce: one of the two must be present
        if (!analysisMarkdown && !bypassReason) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        error: "Missing required field: provide 'analysisMarkdown' (the analysis text Claude generated) or 'bypassReason' (why it is being omitted). This ensures Phase 2 robots always have Phase 1 output files to read.",
                        hint: "Pass the full markdown text of Claude's analysis as 'analysisMarkdown'.",
                    }, null, 2),
                }],
            };
        }

        await teamLeader.saveFeedback(
            analysisId,
            robotName,
            rating,
            notes || "",
            { analysisMarkdown: analysisMarkdown || null, bypassReason: bypassReason || null }
        );

        const nextRobot = teamLeader.getNextRobot(analysisId);

        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    saved: true,
                    robotName,
                    rating,
                    notes:           notes || "",
                    outputPersisted: !!analysisMarkdown,
                    bypassReason:    bypassReason || null,
                    nextRobot,
                    message: nextRobot
                        ? `Feedback saved! Next up: ${nextRobot} robot.`
                        : "Feedback saved! All robots are done. Call 'generate-presentation' to create the final deliverable.",
                }, null, 2),
            }],
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 4: GENERATE-PRESENTATION — prompt Claude to build HTML
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "generate-presentation",
    `Begin the presentation generation process. The presentation is a STRATEGIC artifact — it covers Phase 1 analysis only and is designed for stakeholder buy-in before Phase 2 execution begins.

This tool does NOT immediately create the file.

TWO INPUT MODES (prefer productSlug):
  productSlug — loads Phase 1 robot outputs from the workspace (survives server restarts, regeneratable any time). This is the preferred path.
  analysisId  — loads from the in-memory session (deprecated, lost on server restart). Only use if productSlug is unavailable.

FLOW:
  1. If design preferences are missing → returns actionRequired: "ask_user_for_preferences".
  2. If preferences exist → returns Phase 1 robot outputs + design preferences + instructions for Claude to generate HTML.
  3. Claude generates the HTML and calls 'save-presentation-file' to write it to disk.

Can be regenerated any time Phase 1 outputs are on disk — no re-runs required.`,
    {
        productSlug: z
            .string()
            .optional()
            .describe("Preferred: the product slug. Loads Phase 1 outputs from disk — survives restarts and can be regenerated any time."),
        analysisId: z
            .string()
            .optional()
            .describe("Deprecated fallback: in-memory analysis session ID. Use productSlug instead."),
    },
    async ({ productSlug, analysisId }) => {
        // ── Validate: need at least one source ───────────────────────
        if (!productSlug && !analysisId) {
            return {
                content: [{ type: "text", text: JSON.stringify({
                    error: "Provide 'productSlug' (preferred) or 'analysisId' (deprecated fallback).",
                }, null, 2) }],
            };
        }

        // ── Check design preferences ─────────────────────────────────
        const prefs = teamLeader.database.getDesignPreferences();
        if (!prefs) {
            return {
                content: [{ type: "text", text: JSON.stringify({
                    actionRequired: "ask_user_for_preferences",
                    instructions: "No presentation design preferences found. Ask the PM for: logo URL (optional), font family, primary colour, and visual theme (e.g. 'Dark and Modern', 'Corporate Minimalist'). Then call 'save-design-preferences' and retry 'generate-presentation'.",
                }, null, 2) }],
            };
        }

        // ── Load Phase 1 data ────────────────────────────────────────
        let phase1Data;
        let dataSource;

        if (productSlug) {
            // Verify product exists
            const product = await productRegistry.get(productSlug);
            if (!product) {
                return {
                    content: [{ type: "text", text: JSON.stringify({
                        error: `Unknown product: ${productSlug}. Call 'product-create' first.`,
                    }, null, 2) }],
                };
            }

            // Load from workspace — survives restarts, regeneratable any time
            phase1Data = await pddComposer.assemblePhase1(productSlug);
            dataSource  = "workspace";

            if (phase1Data.robotsPresent.length === 0) {
                return {
                    content: [{ type: "text", text: JSON.stringify({
                        error: `No Phase 1 robot outputs found for '${productSlug}'. Run at least one Phase 1 robot (scout, detective, people, money, feature, plan, priority) and submit feedback before generating a presentation.`,
                        robotsMissing: phase1Data.robotsMissing,
                    }, null, 2) }],
                };
            }
        } else {
            // Deprecated in-memory fallback
            const inMemory = teamLeader.getFullResults(analysisId);
            if (!inMemory) {
                return {
                    content: [{ type: "text", text: JSON.stringify({
                        error: `Analysis session '${analysisId}' not found. Pass 'productSlug' instead — it loads from disk and survives server restarts.`,
                    }, null, 2) }],
                };
            }
            phase1Data = inMemory;
            dataSource  = "in-memory-session (deprecated — pass productSlug for persistence)";
            await teamLeader.database.saveAnalysis(inMemory.productIdea, inMemory.results);
        }

        // ── Build instruction payload ─────────────────────────────────
        const payload = {
            _claudeInstructions: {
                role: "You are a world-class Product Strategist and Web Designer producing a stakeholder presentation to secure investment and buy-in for a new product.",
                mandate: [
                    "OUTPUT FORMAT: A self-contained HTML document with inline CSS. May use Vega-Lite CDN for financial charts (see CHARTS below).",
                    "DESIGN: Apply the designPreferences (font, colours, theme, logo) throughout — every slide must reflect these choices consistently.",
                    "STRUCTURE: Title slide → Executive Context slide → one rich slide per Phase 1 robot output → Investment Case summary slide.",
                    "CONTENT SOURCE: Read each robot's analysis from robotOutputs.<robotName>.raw (markdown text). Synthesise insights into human-readable narrative — do NOT paste raw JSON or markdown verbatim.",
                    "SPECIFICITY: Every claim must reference this specific product. Generic statements ('the product will serve users') are not acceptable.",
                    "MISSING ROBOTS: If a robot is listed in robotsMissing, gracefully omit that slide rather than inventing content.",
                    "CHARTS: If robotOutputs.money.raw contains Vega-Lite JSON specs (```json blocks with '$schema' containing 'vega-lite'), render them using vegaEmbed. Add these CDN scripts to the HTML <head>: <script src='https://cdn.jsdelivr.net/npm/vega@5/build/vega.min.js'></script> <script src='https://cdn.jsdelivr.net/npm/vega-lite@5/build/vega-lite.min.js'></script> <script src='https://cdn.jsdelivr.net/npm/vega-embed@6/build/vega-embed.min.js'></script>. For each chart spec, create a <div id='chart-N'> and call vegaEmbed('#chart-N', spec, {renderer:'svg', actions:false}) in a <script> block.",
                    "SAVE: After generating the HTML, call 'save-presentation-file' to write it to disk. Use a filename like '<slug>-strategy-presentation.html'.",
                ],
                robotLabels: {
                    scout:     { title: "Market Opportunity",        icon: "🔍" },
                    detective: { title: "Competitive Landscape",      icon: "🔎" },
                    people:    { title: "Target Users & Personas",    icon: "👥" },
                    money:     { title: "Financial Projections",      icon: "💰" },
                    feature:   { title: "Feature Strategy",           icon: "📝" },
                    plan:      { title: "Product Roadmap",            icon: "🗺️" },
                    priority:  { title: "Prioritisation",             icon: "⭐" },
                },
            },
            dataSource,
            designPreferences: prefs,
            productName:   phase1Data.productMeta?.name || productSlug || "Product",
            robotsPresent: phase1Data.robotsPresent,
            robotsMissing: phase1Data.robotsMissing,
            robotOutputs:  phase1Data.robotOutputs,
            assembledAt:   phase1Data.assembledAt,
        };

        return {
            content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 4.1: SAVE-DESIGN-PREFERENCES
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "save-design-preferences",
    "Save the user's presentation design preferences to the database.",
    {
        themeStyle: z.string().describe("e.g. 'Dark and Modern', 'Corporate Minimalist', 'Playful'"),
        primaryColor: z.string().describe("e.g. '#6c63ff', 'blue', etc."),
        fontFamily: z.string().describe("e.g. 'Inter', 'Roboto', 'serif'"),
        logoUrl: z.string().optional().describe("URL to a logo image, if provided"),
    },
    async ({ themeStyle, primaryColor, fontFamily, logoUrl }) => {
        const prefs = { themeStyle, primaryColor, fontFamily, logoUrl };
        await teamLeader.database.saveDesignPreferences(prefs);
        return {
            content: [{ type: "text", text: `Design preferences saved successfully! Now call generate-presentation.` }]
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 4.2: SAVE-PRESENTATION-FILE
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "save-presentation-file",
    "Save the raw HTML string generated by Claude into an actual HTML file in the plans directory.",
    {
        filename: z.string().describe("The name of the file, e.g. 'my-product-presentation.html'"),
        htmlContent: z.string().describe("The full HTML source code for the presentation"),
    },
    async ({ filename, htmlContent }) => {
        const fs = await import("fs/promises");
        const path = await import("path");
        const { fileURLToPath } = await import("url");

        // Resolve absolute path to the project root, not the arbitrary cwd Claude Desktop uses
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const PLANS_DIR = path.join(__dirname, "..", "plans");

        await fs.mkdir(PLANS_DIR, { recursive: true });

        const safeName = filename.endsWith(".html") ? filename : `${filename}.html`;
        const filepath = path.join(PLANS_DIR, safeName);

        await fs.writeFile(filepath, htmlContent, "utf-8");
        return {
            content: [{ type: "text", text: `Success! Presentation beautifully rendered and saved to ${filepath}` }]
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 5: ROBOTS-LIST — list available robots
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "robots-list",
    `List all available ProductFlow analysis robots with their capabilities, phase grouping, staleness windows, and average user ratings.

Phase 1 robots run first (strategic discovery) — no prerequisites.
Phase 2 robots run after Phase 1 is complete and promote-to-phase-2 has been confirmed.`,
    {},
    async () => {
        const phase1Robots = [
            { phase: 1, key: "scout",     type: "market-demand",        description: "Market demand — TAM/SAM/SOM, growth signals, demand validation" },
            { phase: 1, key: "detective", type: "competitive-analysis",  description: "Competitive landscape — competitors, gaps, differentiators, moat" },
            { phase: 1, key: "people",    type: "personas",              description: "User personas — segments, pain points, behaviors, jobs-to-be-done" },
            { phase: 1, key: "money",     type: "financial",             description: "Financial model — unit economics, CAC/LTV/ARR/NRR/GRR, 3-scenario projections, Vega-Lite charts" },
            { phase: 1, key: "feature",   type: "features",              description: "Feature breakdown — MoSCoW-tagged, must-have vs nice-to-have vs future" },
            { phase: 1, key: "plan",      type: "roadmap",               description: "Product roadmap — phased 12-18 month plan with milestones" },
            { phase: 1, key: "priority",  type: "prioritization",        description: "Feature prioritization — RICE scoring, effort vs impact matrix" },
        ];

        const phase2Robots = [
            { phase: 2, key: "user-stories",       type: "user-stories",   description: "MoSCoW-tagged user stories from people + feature outputs" },
            { phase: 2, key: "scope-spec",         type: "scope",          description: "Scope, assumptions, constraints, and critical-change flag" },
            { phase: 2, key: "feasibility-tech",   type: "feasibility",    description: "Architecture, tech concerns, third-party vendors, infrastructure deps" },
            { phase: 2, key: "feasibility-design", type: "design",         description: "Design principles, wireflow (screen-by-screen), accessibility commitments" },
            { phase: 2, key: "customer-journeys",  type: "journeys",       description: "End-to-end journey narratives per persona with step-by-step flows" },
            { phase: 2, key: "data-privacy",       type: "compliance",     description: "InfoSec, legal, and certification impact matrix (GDPR, SOC 2, etc.)" },
            { phase: 2, key: "gtm-readiness",      type: "go-to-market",   description: "CX stage matrix, rollout waves, Preview → GA criteria, pricing model" },
            { phase: 2, key: "risks-registry",     type: "risk",           description: "Structured risk register across 5 risk categories with mitigations" },
            { phase: 2, key: "kpis",               type: "metrics",        description: "Adoption, retention, usage, and revenue KPIs with targets + source systems" },
            { phase: 2, key: "daci-stakeholders",  type: "stakeholders",   description: "DACI table + key contacts — persists across runs, updates incrementally" },
        ];

        const allRobots = [...phase1Robots, ...phase2Robots];
        // Enrich with average ratings from past feedback
        for (const robot of allRobots) {
            robot.averageRating = teamLeader.database.getRobotAverageRating(robot.key);
        }

        return {
            content: [
                { type: "text", text: JSON.stringify({
                    phase1: phase1Robots,
                    phase2: phase2Robots,
                    total: allRobots.length,
                    note: "Phase 2 robots require all 7 Phase 1 robots to be fresh. Call 'promote-to-phase-2' before running any Phase 2 robot.",
                }, null, 2) },
            ],
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 6: HISTORY — past analyses
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "history",
    "Retrieve the history of past product analyses stored in the brain database.",
    {},
    async () => {
        const analyses = teamLeader.database.getAllAnalyses();
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(
                        { total: analyses.length, recent: analyses.slice(-5) },
                        null,
                        2
                    ),
                },
            ],
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 7: RESET — clear all data
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "reset",
    "Clear all saved analysis data and feedback from the brain database.",
    {},
    async () => {
        await teamLeader.database.clearAll();
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: "All data and feedback cleared.",
                    }),
                },
            ],
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 8: PM-PROFILE — read the active persona's profile
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "pm-profile",
    `Retrieve the active PM persona's profile (role, industry focus, preferred frameworks, products owned).

Returns { exists: false, actionRequired: 'setup' } if no profile exists — interview the PM and call 'pm-profile-save'.
If the profile is older than 90 days, returns staleness: 'stale' — confirm it is still accurate before proceeding.

To see all available personas, call 'pm-persona-list'.
To switch to a different persona, call 'pm-persona-switch'.`,
    {},
    async () => {
        await workspace.ensureWorkspace();
        const profile = await pmProfile.load();

        if (!profile) {
            const personas = await pmProfile.listPersonas();
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        exists: false,
                        actionRequired: "setup",
                        availablePersonas: personas,
                        instructions: personas.length > 0
                            ? `No active persona. Existing personas: ${personas.map(p => p.slug).join(", ")}. Call 'pm-persona-switch' to activate one, or 'pm-profile-save' to create a new default persona.`
                            : "No PM profile found. Interview the PM to gather: name, role/title, industry focus, preferred frameworks (e.g. JTBD, RICE, OKRs), and analysis depth. Then call 'pm-profile-save'.",
                        workspaceRoot: workspace.getRoot(),
                    }, null, 2)
                }]
            };
        }

        const updatedAt = profile.updated ? new Date(profile.updated) : null;
        const ageDays   = updatedAt
            ? Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24))
            : null;
        const staleness = ageDays !== null && ageDays > 90 ? "stale" : "fresh";

        const allPersonas = await pmProfile.listPersonas();

        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    exists: true,
                    staleness,
                    ageDays,
                    profile,
                    allPersonas,
                    instructions: staleness === "stale"
                        ? "Profile is older than 90 days — ask the PM to confirm it is still accurate, or collect updates and call 'pm-profile-save'."
                        : "Profile is fresh. Reference it when running robots to tailor analyses to the PM's style.",
                }, null, 2)
            }]
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 9: PM-PROFILE-SAVE — persist a PM persona profile
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "pm-profile-save",
    `Save or update the active PM persona's profile. All fields are optional — unspecified fields keep their prior values.
If no persona is active yet, creates a "default" persona automatically.`,
    {
        name:               z.string().optional().describe("PM's name, e.g. 'Anand Shrivastava'"),
        role:               z.string().optional().describe("Title / role, e.g. 'Senior Product Leader'"),
        industryFocus:      z.string().optional().describe("Industry focus, e.g. 'CCaaS, CPaaS, AI-driven CXM'"),
        preferredFrameworks: z.string().optional().describe("Preferred PM frameworks, e.g. 'JTBD, RICE, OKRs'"),
        analysisDepth:      z.string().optional().describe("Depth preference, e.g. 'Deep' or 'Summary-first'"),
        productsOwned:      z.array(z.string()).optional().describe("Slugs of products the PM owns"),
    },
    async (patch) => {
        const saved = await pmProfile.save(patch);
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    saved: true,
                    profile: saved,
                    path: workspace.getPersonaProfilePath(saved.personaSlug),
                    message: `PM profile saved for persona '${saved.personaSlug}'. The file is human-editable.`,
                }, null, 2)
            }]
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 9a: PM-PERSONA-LIST — list all PM personas
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "pm-persona-list",
    `List all PM personas stored in the workspace. Each persona has its own profile, staleness overrides, and products context.
Use this at session start to confirm which persona is active, or to switch to a different industry focus.`,
    {},
    async () => {
        await workspace.ensureWorkspace();
        const personas = await pmProfile.listPersonas();
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    count: personas.length,
                    personas,
                    instructions: personas.length === 0
                        ? "No personas yet. Call 'pm-profile-save' to create a default persona."
                        : "Use 'pm-persona-switch' to change the active persona, or 'pm-persona-create' to add a new one.",
                }, null, 2)
            }]
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 9b: PM-PERSONA-CREATE — create a new PM persona
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "pm-persona-create",
    `Create a new PM persona with an optional initial profile. Does NOT switch to the new persona — call 'pm-persona-switch' to activate it.

A persona is an industry-specific PM context (e.g. "ccaas-pm", "ai-cxm-pm"). Different personas can have different staleness windows and product portfolios.`,
    {
        slug:               z.string().describe("URL-safe persona identifier, e.g. 'ccaas-pm', 'ai-cxm-pm'"),
        name:               z.string().optional().describe("PM name for this persona"),
        role:               z.string().optional().describe("Role in this persona context"),
        industryFocus:      z.string().optional().describe("Industry focus for this persona"),
        preferredFrameworks: z.string().optional().describe("Preferred frameworks for this persona"),
        analysisDepth:      z.string().optional().describe("Analysis depth for this persona"),
    },
    async ({ slug, ...profileData }) => {
        const { alreadyExisted } = await pmProfile.createPersona(slug, profileData);
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    created: !alreadyExisted,
                    alreadyExisted,
                    slug,
                    path: workspace.getPersonaProfilePath(slug),
                    message: alreadyExisted
                        ? `Persona '${slug}' already exists. Call 'pm-persona-switch' to activate it.`
                        : `Persona '${slug}' created. Call 'pm-persona-switch' to activate it.`,
                }, null, 2)
            }]
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 9c: PM-PERSONA-SWITCH — switch the active PM persona
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "pm-persona-switch",
    `Switch the active PM persona. The persona must already exist — create it first with 'pm-persona-create' if needed.

After switching, all subsequent calls to 'pm-profile', 'pm-profile-save', and 'run-robot' will use the new persona's profile and staleness windows.`,
    {
        slug: z.string().describe("The persona slug to activate, e.g. 'ccaas-pm'"),
    },
    async ({ slug }) => {
        try {
            const profile = await pmProfile.switchPersona(slug);
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        switched: true,
                        activePersona: slug,
                        profile,
                        message: `Active persona is now '${slug}'.`,
                    }, null, 2)
                }]
            };
        } catch (err) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({ error: err.message }, null, 2)
                }]
            };
        }
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 10: PRODUCT-LIST — list all products the PM owns
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "product-list",
    `List all products the PM has created in their workspace. Use this to let the PM pick which product they want to work on in the current session.`,
    {},
    async () => {
        const products = await productRegistry.list();
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    count: products.length,
                    products: products.map(p => ({
                        slug: p.slug,
                        name: p.name,
                        overview: p.overview,
                        stage: p.stage,
                        updated: p.updated,
                    })),
                    instructions: products.length === 0
                        ? "No products yet. Ask the PM which product they want to analyse, then call 'product-create'."
                        : "Ask the PM to pick a product by slug, or to create a new one via 'product-create'.",
                }, null, 2)
            }]
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 11: PRODUCT-CREATE — scaffold a new product
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "product-create",
    `Create a new product in the PM's workspace. Scaffolds the directory structure (context/, assets/, product.md, freshness.json) and adds the product to the PM profile's Products Owned list. Idempotent — creating a product that already exists returns the existing one.`,
    {
        name: z.string().describe("Human-readable product name, e.g. 'XpertIN AI'"),
        overview: z.string().optional().describe("1-2 sentence product description"),
        stage: z.string().optional().describe("e.g. 'idea', 'pre-seed', 'bootstrapped'"),
        targetMarket: z.string().optional().describe("Geography + segment, e.g. 'India, B2C + B2B2C'"),
        competitors: z.array(z.string()).optional().describe("Known competitor names"),
        tags: z.array(z.string()).optional().describe("Tags for categorisation, e.g. ['edtech', 'b2c']"),
    },
    async (input) => {
        const { slug, alreadyExisted, product } = await productRegistry.create(input);
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    slug,
                    alreadyExisted,
                    product,
                    paths: {
                        root: workspace.getProductDir(slug),
                        context: workspace.getContextDir(slug),
                        assets: workspace.getAssetsDir(slug),
                    },
                    message: alreadyExisted
                        ? `Product '${slug}' already exists — returning existing record.`
                        : `Product '${slug}' created. Context and assets folders are ready.`,
                }, null, 2)
            }]
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 12: PRODUCT-GET — read a specific product's metadata
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "product-get",
    `Retrieve full metadata for a specific product by its slug.`,
    {
        slug: z.string().describe("The product slug, e.g. 'xpertin-ai'"),
    },
    async ({ slug }) => {
        const product = await productRegistry.get(slug);
        if (!product) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({ error: `Product not found: ${slug}` }, null, 2)
                }]
            };
        }
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    product,
                    paths: {
                        root: workspace.getProductDir(slug),
                        context: workspace.getContextDir(slug),
                        assets: workspace.getAssetsDir(slug),
                    },
                }, null, 2)
            }]
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 13: CONTEXT-ADD — add PM-provided context to a product
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "context-add",
    `Attach a piece of PM-provided context to a product. Context entries feed
future analyses — robots see them alongside interview answers.

Types:
  note                — ad-hoc note or observation
  url                 — a link with optional commentary
  document            — a longer writeup (stored as its own file in context/documents/)
  analyst-report      — third-party research report pasted as text
  research            — external user research (interview transcripts, persona studies, etc.)
  survey-result       — results from user surveys or questionnaires
  experiment-feedback — feedback from A/B tests, prototype testing, or multivariate experiments

Notes and URLs are appended to notes.md. Documents, analyst reports, research,
survey results, and experiment feedback are saved as individual markdown files
in context/documents/.

IMPORTANT: Adding research, survey-result, experiment-feedback, or analyst-report
entries will automatically mark affected robots as stale so they re-run with the
new evidence on the next invocation.`,
    {
        productSlug: z.string().describe("Product slug to attach context to"),
        type: z.enum(["note", "url", "document", "analyst-report", "research", "survey-result", "experiment-feedback"]).describe("Context entry type"),
        title: z.string().describe("Short human-readable title for this entry"),
        content: z.string().describe("The note body, URL, or document contents"),
        source: z.string().optional().describe("Original source URL or attribution"),
    },
    async ({ productSlug, type, title, content, source }) => {
        const product = await productRegistry.get(productSlug);
        if (!product) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({ error: `Unknown product: ${productSlug}` }, null, 2)
                }]
            };
        }

        try {
            const saved = await teamLeader.contextStore.add(productSlug, { type, title, content, source });

            // Trigger staleness invalidation for research-flavoured types
            const RESEARCH_TYPES = ["research", "survey-result", "experiment-feedback", "analyst-report"];
            let invalidatedRobots = [];
            if (RESEARCH_TYPES.includes(type)) {
                invalidatedRobots = await teamLeader.freshness.invalidateOnResearch(productSlug, type);
            }

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        saved: true,
                        entry: saved,
                        invalidatedRobots,
                        message: invalidatedRobots.length > 0
                            ? `Context entry '${title}' saved. Robots marked stale due to new ${type}: ${invalidatedRobots.join(", ")}. Re-run these robots to incorporate the new evidence.`
                            : `Context entry '${title}' saved to product '${productSlug}'.`,
                    }, null, 2)
                }]
            };
        } catch (err) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({ error: err.message }, null, 2)
                }]
            };
        }
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 14: CONTEXT-LIST — list context entries for a product
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "context-list",
    `List all context entries attached to a product. Optionally filter by type.`,
    {
        productSlug: z.string().describe("Product slug"),
        type: z.enum(["note", "url", "document", "analyst-report", "research", "survey-result", "experiment-feedback"]).optional().describe("Filter by entry type"),
    },
    async ({ productSlug, type }) => {
        const product = await productRegistry.get(productSlug);
        if (!product) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({ error: `Unknown product: ${productSlug}` }, null, 2)
                }]
            };
        }
        const entries = await teamLeader.contextStore.list(productSlug, { type });
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    productSlug,
                    count: entries.length,
                    entries,
                }, null, 2)
            }]
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 15: CONTEXT-GET — retrieve a single context entry
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "context-get",
    `Retrieve the full content of a single context entry by its id.`,
    {
        productSlug: z.string().describe("Product slug"),
        id: z.string().describe("Context entry id (from context-list)"),
    },
    async ({ productSlug, id }) => {
        const entry = await teamLeader.contextStore.get(productSlug, id);
        if (!entry) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({ error: `Context entry not found: ${id}` }, null, 2)
                }]
            };
        }
        return {
            content: [{
                type: "text",
                text: JSON.stringify(entry, null, 2)
            }]
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 16: FRESHNESS-CHECK — see what is fresh/stale for a product
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "freshness-check",
    `Show which robot analyses and interview answers are fresh, stale, or
missing for a product. Use this BEFORE starting an interview or running
robots to decide what can be reused and what should be refreshed.

Each robot reports one of:
  fresh    — last run is within the staleness window (reuse automatically)
  stale    — older than the staleness window (re-run recommended)
  missing  — never run

The response also includes the staleness window in days per robot so the
user can make informed decisions.`,
    {
        productSlug: z.string().describe("Product slug"),
    },
    async ({ productSlug }) => {
        const product = await productRegistry.get(productSlug);
        if (!product) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({ error: `Unknown product: ${productSlug}` }, null, 2)
                }]
            };
        }

        const [robotFreshness, interviewFreshness] = await Promise.all([
            teamLeader.freshness.getRobotFreshness(productSlug),
            teamLeader.freshness.getInterviewFreshness(productSlug),
        ]);

        // Summarise what the user can reuse vs. needs to refresh
        const freshRobots = [];
        const staleRobots = [];
        const missingRobots = [];
        for (const [robot, state] of Object.entries(robotFreshness)) {
            if (state.status === "fresh") freshRobots.push(robot);
            else if (state.status === "stale") staleRobots.push(robot);
            else missingRobots.push(robot);
        }

        let freshAnswerCount = 0;
        let staleAnswerCount = 0;
        for (const state of Object.values(interviewFreshness)) {
            if (state.status === "fresh") freshAnswerCount++;
            else staleAnswerCount++;
        }

        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    productSlug,
                    summary: {
                        robots: {
                            fresh: freshRobots,
                            stale: staleRobots,
                            missing: missingRobots,
                        },
                        interviewAnswers: {
                            fresh: freshAnswerCount,
                            stale: staleAnswerCount,
                            total: freshAnswerCount + staleAnswerCount,
                        },
                    },
                    robots: robotFreshness,
                    interviewAnswers: interviewFreshness,
                    instructions: (freshRobots.length > 0 || freshAnswerCount > 0)
                        ? "Ask the PM whether to reuse the fresh artifacts or force a re-run. Pass 'useEarlierResearch: true' to 'interview' to pre-fill fresh answers, and pass 'forceRerun: true' to 'run-robot' to ignore cached results."
                        : "Nothing fresh to reuse — run the interview and robots from scratch.",
                }, null, 2)
            }]
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 16b: STALENESS-POLICY — show resolved staleness windows
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "staleness-policy",
    `Show the resolved staleness windows (in days) for every ProductFlow artifact.

Resolution order (highest precedence wins):
  1. Per-product override  — products/<slug>/staleness-overrides.json
  2. Per-persona override  — profiles/<slug>/staleness-overrides.json
  3. Project policy        — config/staleness-policy.json
  4. Compiled-in defaults

Each entry shows: windowDays, phase, provenanceSource (which layer set this value).

Use this tool to explain to the PM why a robot is marked stale, or to review
the current effective windows before recommending whether to re-run.`,
    {
        productSlug: z.string().optional().describe("Include to show product-level overrides"),
        personaSlug: z.string().optional().describe("Include to show persona-level overrides (Track 2)"),
    },
    async ({ productSlug, personaSlug }) => {
        const resolved = await teamLeader.freshness.getResolvedPolicy({
            personaSlug: personaSlug || null,
            productSlug: productSlug || null,
        });

        const rows = Object.entries(resolved.robots).map(([key, windowDays]) => ({
            robot:           key,
            windowDays,
            provenanceSource: resolved.provenance[key] ?? "compiled-default",
        }));

        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    personaSlug:        personaSlug || null,
                    productSlug:        productSlug || null,
                    interviewAnswers: {
                        windowDays: resolved.interviewWindowDays,
                    },
                    robots: rows,
                    note: "To override a window, create staleness-overrides.json at the product or persona path shown in WorkspaceManager.",
                }, null, 2),
            }],
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 17: SAVE-ROBOT-OUTPUT — persist Claude's generated analysis text
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "save-robot-output",
    `Save the raw analysis text that Claude generated for a robot to the product's assets folder.

This is distinct from the prompt payload saved by run-robot.  This tool saves the ACTUAL ANALYSIS TEXT
Claude produced — the content that Phase 2 robots read as their primary input.

Call this immediately after Claude generates a robot's analysis, passing the full markdown text.

File pattern: assets/YYYY-MM-DD-<robotName>-output.md

IMPORTANT: Call this tool after EVERY Phase 1 robot run if the product will eventually go to Phase 2.
Phase 2 robots (user-stories, scope-spec, etc.) read these output files to derive their analysis.`,
    {
        productSlug: z.string().describe("The product slug"),
        robotName: z
            .enum([
                "scout", "detective", "people", "money", "feature", "plan", "priority",
                "user-stories", "scope-spec", "customer-journeys",
                "feasibility-tech", "feasibility-design", "kpis",
                "data-privacy", "gtm-readiness", "risks-registry", "daci-stakeholders",
            ])
            .describe("Which robot produced this output"),
        markdownText: z.string().describe("The full analysis text Claude generated for this robot"),
    },
    async ({ productSlug, robotName, markdownText }) => {
        const product = await productRegistry.get(productSlug);
        if (!product) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({ error: `Unknown product: ${productSlug}. Call 'product-create' first.` }, null, 2)
                }]
            };
        }

        try {
            const relPath = await teamLeader.assetStore.saveRobotOutput(productSlug, robotName, markdownText);
            const absPath = `${teamLeader.workspace.getAssetsDir(productSlug)}/${relPath.split("/").pop()}`;
            
            let viewerPath = null;
            if (robotName === "user-stories") {
                try {
                    const { generateExperimentViewer } = await import("./ui/generate-viewer.js");
                    const jsonData = JSON.parse(markdownText);
                    viewerPath = await generateExperimentViewer(absPath, jsonData);
                } catch (e) {
                    // Ignore parsing/generation errors
                }
            }

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        saved: true,
                        robotName,
                        productSlug,
                        relPath,
                        absPath,
                        viewerPath,
                        message: viewerPath
                            ? `${robotName} output saved. A stunning visual experiment selector was generated at: ${viewerPath}. IMPORTANT: Tell the user to open this HTML file in their browser, make their selection, and paste the copied command back here.`
                            : `${robotName} output saved. Phase 2 robots will use this file.`,
                    }, null, 2)
                }]
            };
        } catch (err) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({ error: err.message }, null, 2)
                }]
            };
        }
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 18: PROMOTE-TO-PHASE-2 — two-call confirmation gate
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "promote-to-phase-2",
    `Promote a product from Phase 1 (strategic discovery) to Phase 2 (execution definition).

TWO-CALL PATTERN — promotion requires explicit PM confirmation:

CALL 1 — Review (omit 'confirm'):
  1. Verifies all 7 Phase 1 robots are fresh (gate check).
  2. Loads Phase 1 robot output files and extracts one-line summaries per robot.
  3. Surfaces persona, feature, and competitor candidates for PM review.
  4. Writes a pending-promotion.json with a confirmationToken (14-day expiry).
  5. Returns requiresConfirmation: true — present the summaries to the PM and ask them to confirm.

CALL 2 — Confirm (confirm: true + confirmationToken):
  1. Verifies the token is valid and not expired.
  2. Writes context/phase2-context.json with any PM-supplied overrides.
  3. Deletes pending-promotion.json (token is single-use).
  4. Returns { promoted: true } — Phase 2 robots are now unlocked.

Override fields accepted only on Call 2:
  personaOverride, featureOverride, scopeOverride,
  ownerName, ownerRole, ownerEmail,
  linkJira, linkTdd, linkFigma, linkConfluence.

Do NOT call run-robot with any Phase 2 robot (user-stories, scope-spec, etc.)
until this tool returns { promoted: true }.`,
    {
        productSlug:       z.string().describe("The product slug to promote"),
        confirm:           z.boolean().optional().describe("Set true for Call 2 — commits the promotion"),
        confirmationToken: z.string().optional().describe("Token returned by Call 1 (required when confirm: true)"),
        // Call-2-only override fields
        personaOverride:   z.string().optional().describe("Override the primary persona name (Call 2 only)"),
        featureOverride:   z.string().optional().describe("Override the primary feature set summary (Call 2 only)"),
        scopeOverride:     z.string().optional().describe("Override the scope statement (Call 2 only)"),
        ownerName:         z.string().optional().describe("PM's full name for the PDD owner field (Call 2 only)"),
        ownerRole:         z.string().optional().describe("PM's role, e.g. 'Senior Product Manager' (Call 2 only)"),
        ownerEmail:        z.string().optional().describe("PM's email for the PDD meta section (Call 2 only)"),
        linkJira:          z.string().optional().describe("Link to Jira project or epic (Call 2 only)"),
        linkTdd:           z.string().optional().describe("Link to Technical Design Doc (Call 2 only)"),
        linkFigma:         z.string().optional().describe("Link to Figma design file (Call 2 only)"),
        linkConfluence:    z.string().optional().describe("Link to Confluence space (Call 2 only)"),
        experimentClusterCount: z.number().min(1).max(5).optional().describe("Number of alternative solution clusters to generate (Call 2 only, default 1)"),
    },
    async ({
        productSlug, confirm, confirmationToken,
        personaOverride, featureOverride, scopeOverride,
        ownerName, ownerRole, ownerEmail,
        linkJira, linkTdd, linkFigma, linkConfluence,
        experimentClusterCount,
    }) => {
        const fspath = await import("fs/promises");
        const crypto = await import("crypto");

        const product = await productRegistry.get(productSlug);
        if (!product) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({ error: `Unknown product: ${productSlug}` }, null, 2)
                }]
            };
        }

        // ── CALL 2: Confirm ───────────────────────────────────────────
        if (confirm === true) {
            if (!confirmationToken) {
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            error: "confirmationToken is required when confirm: true. Call promote-to-phase-2 without 'confirm' first to get a token.",
                        }, null, 2)
                    }]
                };
            }

            // Load pending-promotion.json
            const pendingPath = teamLeader.workspace.getPendingPromotionPath(productSlug);
            let pending;
            try {
                const raw = await fspath.readFile(pendingPath, "utf-8");
                pending = JSON.parse(raw);
            } catch {
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            error: "No pending promotion found for this product. Call promote-to-phase-2 without 'confirm' to generate a review summary and token.",
                        }, null, 2)
                    }]
                };
            }

            // Verify token
            if (pending.token !== confirmationToken) {
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({ error: "Invalid confirmationToken." }, null, 2)
                    }]
                };
            }

            // Check expiry
            if (new Date() > new Date(pending.expiresAt)) {
                await fspath.unlink(pendingPath).catch(() => {});
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            error: "Promotion token has expired (14-day window). Call promote-to-phase-2 again (without 'confirm') to generate a fresh review.",
                        }, null, 2)
                    }]
                };
            }

            // Write phase2-context.json (idempotent — skip if already present)
            const p2Path = teamLeader.workspace.getPhase2ContextPath(productSlug);
            const pddDir = teamLeader.workspace.getPDDDir(productSlug);
            await fspath.mkdir(pddDir, { recursive: true });

            let alreadyExisted = false;
            try {
                await fspath.access(p2Path);
                alreadyExisted = true;
            } catch { /* new promotion */ }

            if (!alreadyExisted) {
                const phase2Manifest = {
                    promotedAt: new Date().toISOString(),
                    promotedFromPhase1: ROBOT_ORDER,
                    pddVersion: "1.0.0",
                    pddStatus:  "DRAFT",
                    owner: {
                        name:  ownerName  || "",
                        role:  ownerRole  || "",
                        email: ownerEmail || "",
                    },
                    links: {
                        jira:       linkJira       || null,
                        tdd:        linkTdd        || null,
                        figma:      linkFigma      || null,
                        confluence: linkConfluence || null,
                    },
                    // Default to best candidate from Phase 1 review if PM didn't supply override
                    personaOverride: personaOverride || pending.candidates?.personas?.[0] || "",
                    featureOverride: featureOverride || pending.candidates?.features?.[0] || "",
                    scopeOverride:   scopeOverride   || "",
                    experimentClusterCount: experimentClusterCount || 1,
                };
                await fspath.writeFile(p2Path, JSON.stringify(phase2Manifest, null, 2), "utf-8");
            }

            // Delete the pending token — single-use
            await fspath.unlink(pendingPath).catch(() => {});

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        promoted: true,
                        alreadyExisted,
                        productSlug,
                        pddVersion: "1.0.0",
                        phase2ManifestPath: p2Path,
                        pddOutputDir: pddDir,
                        phase2Robots: ROBOT_ORDER_PHASE_2,
                        message: alreadyExisted
                            ? `Product '${productSlug}' is already in Phase 2. Manifest unchanged.`
                            : `Product '${productSlug}' confirmed and promoted to Phase 2.`,
                        instructions: [
                            "Phase 2 is unlocked. Run Phase 2 robots via 'run-robot' in the recommended order.",
                            "Recommended first robot: user-stories (tightest dependency graph).",
                            "After each Phase 2 robot runs, call 'save-robot-output' to persist Claude's analysis for downstream robots.",
                        ],
                    }, null, 2)
                }]
            };
        }

        // ── CALL 1: Review ────────────────────────────────────────────

        // Gate check — all 7 Phase 1 robots must be fresh
        const blockedRobots = await teamLeader.checkPhase2Gate(productSlug);
        if (blockedRobots.length > 0) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        promoted: false,
                        gateBlocked: true,
                        blockedRobots,
                        message: `Cannot promote to Phase 2: the following Phase 1 robots are not fresh — ${blockedRobots.join(", ")}. Run them first, then retry.`,
                    }, null, 2)
                }]
            };
        }

        // Load Phase 1 outputs for the review summary
        let assemblyPayload;
        try {
            assemblyPayload = await pddComposer.assemblePhase1(productSlug);
        } catch (err) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({ error: `Failed to load Phase 1 outputs: ${err.message}` }, null, 2)
                }]
            };
        }

        // One-line summaries — first ~300 chars, stripped of markdown syntax
        const phase1Summaries = {};
        for (const [robot, data] of Object.entries(assemblyPayload.robotOutputs)) {
            if (data?.raw) {
                const cleaned = data.raw
                    .replace(/^#{1,6}\s+.*/gm, "")     // strip headings
                    .replace(/\*\*|__|~~|`{1,3}/g, "")  // strip inline markers
                    .replace(/\s+/g, " ")
                    .trim();
                phase1Summaries[robot] = cleaned.slice(0, 300) + (cleaned.length > 300 ? "…" : "");
            }
        }

        // Persona candidates — "Persona:" labels in people robot output
        const personaCandidates = [];
        const peopleRaw = assemblyPayload.robotOutputs?.people?.raw || "";
        for (const m of peopleRaw.matchAll(/\bPersona\s*[:#–\-]?\s*([^\n.]{3,60})/gi)) {
            const name = m[1].trim().replace(/\*\*/g, "");
            if (name && !personaCandidates.includes(name)) personaCandidates.push(name);
            if (personaCandidates.length >= 3) break;
        }

        // Feature candidates — H2/H3 headings from feature robot output
        const featureCandidates = [];
        const featureRaw = assemblyPayload.robotOutputs?.feature?.raw || "";
        for (const m of featureRaw.matchAll(/^#{2,3}\s+(.+)$/gm)) {
            const name = m[1].trim().replace(/\*\*/g, "").slice(0, 80);
            if (name && !featureCandidates.includes(name)) featureCandidates.push(name);
            if (featureCandidates.length >= 5) break;
        }

        // Competitor candidates from product metadata
        const competitorCandidates = (product.competitors || [])
            .filter(c => c && !c.startsWith("_("));

        // Generate a single-use confirmation token
        const token = crypto
            .createHash("sha256")
            .update(`${productSlug}|${Date.now()}|${Math.random()}`)
            .digest("hex")
            .slice(0, 32);

        const now       = new Date();
        const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days

        const pending = {
            token,
            createdAt:  now.toISOString(),
            expiresAt:  expiresAt.toISOString(),
            productSlug,
            robotsReviewed: Object.keys(assemblyPayload.robotOutputs),
            candidates: {
                personas:    personaCandidates,
                features:    featureCandidates,
                competitors: competitorCandidates,
            },
        };

        const pendingPath = teamLeader.workspace.getPendingPromotionPath(productSlug);
        await fspath.writeFile(pendingPath, JSON.stringify(pending, null, 2), "utf-8");

        // Draft phase2-context.json for PM to review before confirming (not yet written to disk)
        const draftPhase2Context = {
            pddVersion: "1.0.0",
            pddStatus:  "DRAFT",
            owner: { name: "", role: "", email: "" },
            links: { jira: null, tdd: null, figma: null, confluence: null },
            personaOverride: personaCandidates[0] || "",
            featureOverride: featureCandidates[0] || "",
            scopeOverride:   "",
            experimentClusterCount: 1,
        };

        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    requiresConfirmation: true,
                    productSlug,
                    productName:       product.name,
                    confirmationToken: token,
                    tokenExpiresAt:    expiresAt.toISOString(),
                    gateStatus:        "passed",
                    robotsReviewed:    Object.keys(assemblyPayload.robotOutputs),
                    robotsMissing:     assemblyPayload.robotsMissing,
                    phase1Summaries,
                    candidates:        pending.candidates,
                    draftPhase2Context,
                    instructions: [
                        "Walk the PM through the phase1Summaries — one robot at a time.",
                        "Show the candidates (personas, features, competitors) and ask the PM to confirm or override each.",
                        "Ask: 'Are you satisfied with Phase 1 and ready to lock it and move to Phase 2?'",
                        "When the PM confirms, call promote-to-phase-2 again with: confirm=true, confirmationToken copied from this response, and any PM-supplied overrides.",
                        "Available overrides on the confirm call: personaOverride, featureOverride, scopeOverride, experimentClusterCount (1-5), ownerName, ownerRole, ownerEmail, linkJira, linkTdd, linkFigma, linkConfluence.",
                    ],
                }, null, 2)
            }]
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 19: GENERATE-PDD — assemble PDD JSON from all robot outputs
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "generate-pdd",
    `Assemble a Product Definition Document (PDD) for a product that has completed Phase 2.

HOW IT WORKS:
1. This tool loads every robot output saved to disk (Phase 1 + Phase 2) via save-robot-output.
2. It returns a structured assemblyPayload with all those outputs, plus metadata.
3. Claude uses that payload to compose the final PDD JSON according to the schema provided.
4. After Claude generates the PDD JSON, call 'save-pdd' with the full JSON to persist it.

WHEN TO CALL:
- After all required Phase 2 robots have run and their outputs saved via 'save-robot-output'.
- Can be called with partial output (not all robots need to have run) — missing sections will
  be marked as incomplete in the PDD status tracker.

WORKFLOW:
1. Call generate-pdd → receive assemblyPayload
2. Claude assembles PDD JSON using the payload (role + mandate + schema all included)
3. Call save-pdd with the JSON Claude produced`,
    {
        productSlug: z.string().describe("The product slug"),
        pddVersion:  z.string().optional().describe("Explicit version override, e.g. '1.2.0'. Defaults to auto-incrementing the patch version."),
    },
    async ({ productSlug, pddVersion }) => {
        const product = await productRegistry.get(productSlug);
        if (!product) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({ error: `Unknown product: ${productSlug}. Call 'product-create' first.` }, null, 2)
                }]
            };
        }

        let assemblyPayload;
        try {
            assemblyPayload = await pddComposer.assemble(productSlug);
        } catch (err) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({ error: `Assembly failed: ${err.message}` }, null, 2)
                }]
            };
        }

        // Determine target version — auto-increment patch from phase2-context.json or default
        let targetVersion = pddVersion;
        if (!targetVersion) {
            const currentVersion = assemblyPayload.phase2Context?.pddVersion || "1.0.0";
            const parts = String(currentVersion).split(".").map(Number);
            parts[2] = (parts[2] || 0) + 1;
            targetVersion = parts.join(".");
        }

        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    action: "assemble-pdd",
                    productSlug,
                    targetVersion,
                    assemblyPayload,

                    _claudeInstructions: {
                        role: "You are a senior product manager completing a Product Definition Document (PDD). Your job is to map every robot output in the assemblyPayload to the PDD schema below — producing a complete, specific, non-generic PDD JSON that can be rendered to Notion-compatible markdown and presented to an executive sponsor.",

                        mandate: [
                            "MAP EVERY AVAILABLE ROBOT OUTPUT: For each section in the PDD schema, look for the corresponding robot output in assemblyPayload.robotOutputs. Use the 'json' field if available (Phase 2 robots with structured JSON), otherwise derive from the 'raw' field (Phase 1 narrative text).",
                            "MISSING SECTIONS ARE OK: If a robot hasn't run, mark that section as null in the PDD. The sectionStatus array in daciData will already reflect what's missing. Do not invent content for sections with no robot output.",
                            "META BLOCK: Populate from assemblyPayload.productMeta (name, slug), assemblyPayload.phase2Context (version, status, owner), and the targetVersion provided.",
                            "DACI + KEY CONTACTS + SECTION STATUS: Copy directly from assemblyPayload.daciData if present. If daciData is null, derive from the daci-stakeholders robot output JSON if available.",
                            "SCOPE: Map from the scope-spec robot JSON output — criticalChange, coreFunctionalities, nonCoreFunctionalities, rolesAndPermissions, outOfScope, assumptions, constraints, limitations.",
                            "USER STORIES: Map from user-stories robot JSON output. If the output contains 'experimentClusters', check assemblyPayload.experimentSelection to determine which stories to include (whole-cluster mode filters by clusterId, cherry-pick mode filters by storyIds). If no selection exists, use the first cluster. Preserve MoSCoW priority tags (Must Have / Should Have / Could Have / Won't Have).",
                            "CUSTOMER JOURNEYS: Map from customer-journeys robot JSON output — preserve all steps, emotional annotations, friction points, delight moments.",
                            "FEASIBILITY TECH: Map from feasibility-tech robot JSON — architectureOverview, architectureDiagramMermaid (valid Mermaid only), technicalConcerns[], thirdPartyVendors[], securityAndCompliance, infrastructureDependencies[].",
                            "FEASIBILITY DESIGN: Map from feasibility-design robot JSON — designPrinciples[], wireflow[], accessibilityCommitments[].",
                            "DATA PRIVACY: Map from data-privacy robot JSON — array of {area, impact, description, mitigation}.",
                            "COMPETITOR ANALYSIS: Derive from detective robot raw text — extract the core competitive insight as a concise 2-3 paragraph narrative.",
                            "ROADMAP: Derive from plan robot raw text — extract the phase-by-phase roadmap as a concise narrative.",
                            "RISKS: Map from risks-registry robot JSON — array of {category, risk, probability, impact, mitigation, owner}.",
                            "GTM READINESS: Map from gtm-readiness robot JSON — cxStageMatrix[], provisioning, rollout, previewToGA, pricingAndMonetization, supportAndTroubleshooting.",
                            "KPIS: Map from kpis robot JSON — northStar, adoption[], retention[], usage[], revenue[], feedbackMechanisms[].",
                            "APPENDIX: Populate from assemblyPayload metadata — robotsPresent, robotsMissing, assembledAt.",
                            "EXECUTIVE SUMMARY: Write a 150-200 word executive summary synthesising the product vision, target market, key differentiator, delivery timeline, and top 3 risks. Derive every claim from the robot outputs — no generic filler.",
                            "FEATURE OVERVIEW: Write a 100-150 word feature overview synthesising the scout + people robot outputs. Focus on what the product does, who it serves, and why it matters.",
                            "SPECIFICITY BAR: Every sentence must be specific to this product. 'The product will serve users' is not acceptable. 'The product serves mid-market B2B enterprises in MENA seeking to unify CX across voice, chat, and AI channels' is acceptable.",
                            "OUTPUT ONLY JSON: Return a single JSON object matching the schema exactly. No markdown fences. No commentary outside the JSON.",
                        ],

                        pddSchema: {
                            meta: {
                                productName: "string",
                                slug:        "string",
                                version:     "string",
                                status:      "DRAFT | REVIEW | APPROVED",
                                owner: { name: "string", role: "string", email: "string" },
                                createdAt:   "ISO timestamp",
                                lastUpdated: "ISO timestamp",
                            },
                            executiveSummary:  "string — 150-200 words synthesising vision, market, differentiator, timeline, top 3 risks",
                            featureOverview:   "string — 100-150 words synthesising scout + people outputs",
                            daci: {
                                driver:       { name: "string", role: "string" },
                                approver:     { name: "string", role: "string" },
                                contributors: [{ name: "string", role: "string" }],
                                informed:     [{ name: "string", role: "string" }],
                            },
                            keyContacts:  [{ name: "string", role: "string", company: "string", email: "string" }],
                            sectionStatus: [{ section: "string", draftComplete: "boolean", finalComplete: "boolean" }],
                            scope: {
                                criticalChange:          "boolean",
                                coreFunctionalities:     "string or string[]",
                                nonCoreFunctionalities:  "string or string[]",
                                rolesAndPermissions:     "string or string[]",
                                outOfScope:              ["string"],
                                assumptions:             ["string"],
                                constraints:             ["string"],
                                limitations:             ["string"],
                            },
                            userStories: [{ priority: "string", persona: "string", story: "string", acceptanceCriteria: ["string"] }],
                            customerJourneys: [{
                                persona: "string", title: "string",
                                steps: [{ stepNumber: "integer", action: "string", detail: "string" }],
                            }],
                            feasibilityTech: {
                                architectureOverview:       "string",
                                architectureDiagramMermaid: "string — valid Mermaid diagram syntax",
                                technicalConcerns:          [{ area: "string", severity: "string", description: "string", mitigation: "string" }],
                                thirdPartyVendors:          [{ vendor: "string", purpose: "string", risk: "string" }],
                                securityAndCompliance:      "string",
                                infrastructureDependencies: ["string"],
                            },
                            feasibilityDesign: {
                                designPrinciples:        [{ principle: "string", rationale: "string" }],
                                wireflow:                [{ screenNumber: "integer", screenName: "string", description: "string" }],
                                accessibilityCommitments: ["string"],
                            },
                            competitorAnalysis: "string — concise 2-3 paragraph narrative from detective output",
                            roadmap:            "string — concise phase-by-phase narrative from plan output",
                            dataPrivacy:  [{ area: "string", impact: "string", description: "string", mitigation: "string" }],
                            risks:        [{ category: "string", risk: "string", probability: "string", impact: "string", mitigation: "string", owner: "string" }],
                            gtmReadiness: {
                                cxStageMatrix:           [{}],
                                provisioning:            "string",
                                rollout:                 { plan: "string", regions: ["string"], waves: [{}] },
                                previewToGA:             "string",
                                pricingAndMonetization:  "string",
                                supportAndTroubleshooting: "string",
                            },
                            kpis: {
                                northStar:          { metric: "string", definition: "string", rationale: "string" },
                                adoption:           [{ kpi: "string", target: "string", timeframe: "string", sourceSystem: "string" }],
                                retention:          [{ kpi: "string", target: "string", timeframe: "string", sourceSystem: "string" }],
                                usage:              [{ kpi: "string", target: "string", timeframe: "string", sourceSystem: "string" }],
                                revenue:            [{ kpi: "string", target: "string", timeframe: "string", sourceSystem: "string" }],
                                feedbackMechanisms: ["string"],
                            },
                            appendix: {
                                robotsPresent:  ["string"],
                                robotsMissing:  ["string"],
                                assembledAt:    "ISO timestamp",
                            },
                        },
                    },
                }, null, 2)
            }]
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 20: SAVE-PDD — persist the PDD JSON Claude assembled
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "save-pdd",
    `Persist the PDD JSON that Claude assembled via 'generate-pdd'.

This tool:
1. Validates the PDD JSON has a meta block with productName + version.
2. Saves three files to assets/pdd/:
     pdd-<slug>-v<version>.json     — machine-readable PDD
     pdd-<slug>-v<version>.md       — Notion-compatible markdown
     pdd-<slug>-latest.md           — copy of latest version (overwritten on every save)
3. Optionally renders an HTML file to plans/ directory.
4. Updates pddVersion in context/phase2-context.json.

Call this immediately after Claude generates the PDD JSON from 'generate-pdd'.`,
    {
        productSlug:  z.string().describe("The product slug"),
        pddJson:      z.string().describe("The full PDD JSON string that Claude generated"),
        renderHtmlFlag: z.boolean().optional().describe("Set true to also save an HTML version to plans/. Default false."),
    },
    async ({ productSlug, pddJson: pddJsonStr, renderHtmlFlag }) => {
        const fspath = await import("fs/promises");
        const ppath  = await import("path");

        const product = await productRegistry.get(productSlug);
        if (!product) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({ error: `Unknown product: ${productSlug}` }, null, 2)
                }]
            };
        }

        // Parse the PDD JSON
        let pddJson;
        try {
            const trimmed = pddJsonStr.trim();
            // Handle fenced JSON (shouldn't happen, but defensive)
            const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
            pddJson = JSON.parse(fenceMatch ? fenceMatch[1].trim() : trimmed);
        } catch (err) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({ error: `PDD JSON parse failed: ${err.message}` }, null, 2)
                }]
            };
        }

        // Validate meta block
        if (!pddJson.meta?.productName || !pddJson.meta?.version) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({ error: "PDD JSON must have meta.productName and meta.version" }, null, 2)
                }]
            };
        }

        const version = pddJson.meta.version;
        const pddDir  = workspace.getPDDDir(productSlug);
        await fspath.mkdir(pddDir, { recursive: true });

        const jsonFileName   = `pdd-${productSlug}-v${version}.json`;
        const mdFileName     = `pdd-${productSlug}-v${version}.md`;
        const latestFileName = `pdd-${productSlug}-latest.md`;

        const jsonPath   = ppath.join(pddDir, jsonFileName);
        const mdPath     = ppath.join(pddDir, mdFileName);
        const latestPath = ppath.join(pddDir, latestFileName);

        // Render markdown
        const markdownText = renderMarkdown(pddJson);

        // Save all three files
        await Promise.all([
            fspath.writeFile(jsonPath,   JSON.stringify(pddJson, null, 2), "utf-8"),
            fspath.writeFile(mdPath,     markdownText, "utf-8"),
            fspath.writeFile(latestPath, markdownText, "utf-8"),
        ]);

        // Optional HTML export
        let htmlPath = null;
        if (renderHtmlFlag) {
            const plansDir = ppath.join(process.env.HOME || "~", ".productflow", "plans");
            await fspath.mkdir(plansDir, { recursive: true });
            const htmlFileName = `pdd-${productSlug}-v${version}.html`;
            htmlPath = ppath.join(plansDir, htmlFileName);
            const htmlContent = renderHtml(pddJson);
            await fspath.writeFile(htmlPath, htmlContent, "utf-8");
        }

        // Update pddVersion in phase2-context.json
        try {
            const p2Path = workspace.getPhase2ContextPath(productSlug);
            const raw = await fspath.readFile(p2Path, "utf-8");
            const manifest = JSON.parse(raw);
            manifest.pddVersion = version;
            manifest.pddStatus  = pddJson.meta.status || manifest.pddStatus;
            manifest.lastPddAt  = new Date().toISOString();
            await fspath.writeFile(p2Path, JSON.stringify(manifest, null, 2), "utf-8");
        } catch {
            // phase2-context.json may not exist if called without promote-to-phase-2 — non-fatal
        }

        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    saved: true,
                    productSlug,
                    version,
                    files: {
                        json:   jsonPath,
                        markdown: mdPath,
                        latest:  latestPath,
                        html:    htmlPath || "(not rendered)",
                    },
                    summary: {
                        sectionsPopulated: Object.keys(pddJson).filter(k => pddJson[k] !== null && k !== "meta"),
                        robotsPresent:     pddJson.appendix?.robotsPresent || [],
                        robotsMissing:     pddJson.appendix?.robotsMissing || [],
                    },
                    message: `PDD v${version} saved. Share ${latestFileName} with stakeholders or open the HTML in a browser.`,
                    nextSteps: [
                        "Review the markdown in assets/pdd/ — it is Notion-paste-ready.",
                        "Use 'generate-presentation' to create a slide deck from the PDD.",
                        "Re-run any missing robots and call 'generate-pdd' + 'save-pdd' again to increment the version.",
                    ],
                }, null, 2)
            }]
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 21: PRODUCT-STATUS — full G1–G8 gate report for a product
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "product-status",
    `Show the current workflow status for a product across all G1–G8 gates.

Gates evaluated (in order):
  G1 PM Profile exists   →  G2 Product created   →  G3 Interview answered
  G4 Phase 1 complete    →  G5 Phase 2 promoted   →  G6 Phase 2 in progress
  G7 PDD exported        →  G8 Presentation generated

Returns which gates passed, which are blocked, the highest consecutive gate reached,
and a precise next-action instruction for the PM.

Use this tool to orient the PM at the start of any session, or whenever they ask
"where are we?" or "what should I do next?".`,
    {
        productSlug: z.string().describe("The product slug to check"),
    },
    async ({ productSlug }) => {
        const product = await productRegistry.get(productSlug);
        if (!product) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        error: `Unknown product: ${productSlug}. Call 'product-list' to see available products.`
                    }, null, 2)
                }]
            };
        }

        const report = await traverseGates(
            { workspace: teamLeader.workspace, freshness: teamLeader.freshness },
            productSlug
        );

        return {
            content: [{
                type: "text",
                text: JSON.stringify({ productName: product.name, ...report }, null, 2)
            }]
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 22: START-SESSION — recommended entry point for every session
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "start-session",
    `Begin a ProductFlow work session. Call this at the start of every conversation.

Evaluates all G1–G8 workflow gates and returns a structured status report showing
exactly where the PM is in the 5-step process:

  G1 PM Profile exists   →  G2 Product created   →  G3 Interview answered
  G4 Phase 1 complete    →  G5 Phase 2 promoted   →  G6 Phase 2 in progress
  G7 PDD exported        →  G8 Presentation generated

Writes active-session.json so run-robot can attach a sessionHint if no session is active.

Returns the current gate level and the precise next action — use this to greet the PM
and guide them to their next step without asking open-ended questions.`,
    {
        productSlug: z.string().optional().describe("Product to resume. Omit for a product-agnostic PM profile check."),
    },
    async ({ productSlug }) => {
        const report = await traverseGates(
            { workspace: teamLeader.workspace, freshness: teamLeader.freshness },
            productSlug || null
        );

        // Persist active-session.json so other tools can reference the current product
        const sessionRecord = {
            productSlug: productSlug || null,
            startedAt:   new Date().toISOString(),
            highestGate: report.highestConsecutivePassed,
            nextBlocker: report.nextBlocker,
        };
        try {
            await teamLeader.workspace.ensureWorkspace();
            await fs.writeFile(
                teamLeader.workspace.getActiveSessionPath(),
                JSON.stringify(sessionRecord, null, 2),
                "utf-8"
            );
        } catch (err) {
            console.error(`Failed to write active-session.json: ${err.message}`);
        }

        // Enrich with product name if it exists
        let productName = productSlug || null;
        if (productSlug) {
            const product = await productRegistry.get(productSlug).catch(() => null);
            if (product) productName = product.name;
        }

        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    sessionStarted: true,
                    productSlug:    productSlug || null,
                    productName,
                    ...report,
                    instructions: [
                        `Current gate: ${report.highestConsecutivePassed === "none" ? "No gates passed yet" : report.highestConsecutivePassed + " of G8"}.`,
                        `Next action: ${report.nextAction}`,
                        "Present a brief gate summary to the PM (✅ completed gates, 👉 next step) and guide them forward without asking open-ended questions.",
                    ],
                }, null, 2)
            }]
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool: ADD-RESEARCH — convenience wrapper for adding external research
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "add-research",
    `Add external research data to a product. This is a convenience wrapper
around 'context-add' specifically for research-flavoured content.

Use this when the PM wants to:
  - Upload user interview transcripts or notes
  - Paste survey results or analysis findings
  - Record feedback from prototype testing or A/B experiments
  - Add competitive intelligence or analyst reports

The research data will be automatically aggregated and fed to all Phase 2
robots via the enrichedContext.researchContext field. Adding research also
marks affected robots as stale so they re-run with the new evidence.

WORKFLOW:
  1. PM provides research content → call this tool
  2. Check which robots are now stale → call 'freshness-check'
  3. Re-run stale robots → call 'run-robot' with forceRerun: true`,
    {
        productSlug: z.string().describe("Product slug to attach research to"),
        researchType: z.enum(["research", "survey-result", "experiment-feedback", "analyst-report"])
            .describe("Type of research: 'research' for user studies/transcripts, 'survey-result' for survey data, 'experiment-feedback' for A/B test results, 'analyst-report' for third-party reports"),
        title: z.string().describe("Short title, e.g. 'Q2 User Interview Findings' or 'Checkout Flow A/B Test Results'"),
        content: z.string().describe("The full research content — paste transcripts, survey summaries, or findings"),
        source: z.string().optional().describe("Source attribution, e.g. 'UserTesting.com session 2026-04-15'"),
    },
    async ({ productSlug, researchType, title, content, source }) => {
        const product = await productRegistry.get(productSlug);
        if (!product) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({ error: `Unknown product: ${productSlug}. Call 'product-create' first.` }, null, 2)
                }]
            };
        }

        try {
            const saved = await teamLeader.contextStore.add(productSlug, {
                type: researchType,
                title,
                content,
                source,
            });

            const invalidatedRobots = await teamLeader.freshness.invalidateOnResearch(productSlug, researchType);

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        saved: true,
                        entry: saved,
                        researchType,
                        invalidatedRobots,
                        message: invalidatedRobots.length > 0
                            ? `Research '${title}' saved. The following robots are now stale and should be re-run to incorporate the new evidence: ${invalidatedRobots.join(", ")}.`
                            : `Research '${title}' saved to product '${productSlug}'.`,
                        nextSteps: [
                            "Call 'freshness-check' to see the updated staleness state.",
                            "Re-run stale robots with 'run-robot' (forceRerun: true) to incorporate the new research.",
                        ],
                    }, null, 2)
                }]
            };
        } catch (err) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({ error: err.message }, null, 2)
                }]
            };
        }
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool: SELECT-EXPERIMENT — converge from multiple experiment clusters
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "select-experiment",
    `Select the winning experiment cluster (or cherry-pick stories) after
reviewing multi-cluster output from the user-stories robot.

When UserStoriesRobot generates multiple experiment clusters (because
experimentClusterCount > 1 in phase2Context), the PM reviews the competing
solution hypotheses and selects the best approach.

Three selection modes:
  1. WHOLE CLUSTER: Pass a single 'clusterId' to accept one cluster entirely.
  2. CHERRY-PICK: Pass an array of 'storyIds' from any cluster to build a hybrid.
  3. CLEAR: Pass neither to remove any previous selection.

The selection is stored in context/experiment-selection.json and read by
'generate-pdd' when assembling the final PDD.`,
    {
        productSlug: z.string().describe("Product slug"),
        clusterId: z.string().optional().describe("The winning cluster ID, e.g. 'cluster-A'. Mutually exclusive with storyIds."),
        storyIds: z.array(z.string()).optional().describe("Cherry-picked story IDs from any cluster, e.g. ['US-A-001', 'US-B-003']. Mutually exclusive with clusterId."),
        rationale: z.string().optional().describe("PM's rationale for this selection — stored for traceability"),
    },
    async ({ productSlug, clusterId, storyIds, rationale }) => {
        const product = await productRegistry.get(productSlug);
        if (!product) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({ error: `Unknown product: ${productSlug}` }, null, 2)
                }]
            };
        }

        if (clusterId && storyIds?.length) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        error: "Provide either 'clusterId' (whole cluster) OR 'storyIds' (cherry-pick), not both.",
                    }, null, 2)
                }]
            };
        }

        const selection = {
            selectedAt: new Date().toISOString(),
            mode: clusterId ? "whole-cluster" : (storyIds?.length ? "cherry-pick" : "cleared"),
            clusterId: clusterId || null,
            storyIds: storyIds || [],
            rationale: rationale || null,
        };

        try {
            const selPath = workspace.getContextDir(productSlug) + "/experiment-selection.json";
            await workspace.ensureProductStructure(productSlug);
            await fs.writeFile(selPath, JSON.stringify(selection, null, 2), "utf-8");

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        saved: true,
                        selection,
                        message: selection.mode === "cleared"
                            ? "Experiment selection cleared. PDD will use all stories."
                            : selection.mode === "whole-cluster"
                                ? `Selected cluster '${clusterId}'. PDD will use only stories from this cluster.`
                                : `Cherry-picked ${storyIds.length} stories across clusters. PDD will use only these stories.`,
                        nextStep: "Call 'generate-pdd' to assemble the PDD with the selected experiment cluster.",
                    }, null, 2)
                }]
            };
        } catch (err) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({ error: err.message }, null, 2)
                }]
            };
        }
    }
);

// ── Start ────────────────────────────────────────────────────────────
async function main() {
    // Wait for the brain database to finish loading from disk before
    // accepting connections — prevents serving stale/empty data.
    await teamLeader.ready;
    await workspace.ensureWorkspace();

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("🚀 ProductFlow MCP Server v2.0 running on stdio");
}

main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
});