import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import TeamLeader, { ROBOT_ORDER, ROBOT_ORDER_PHASE_2, PHASE2_GATE_ROBOTS } from "../leader/team-leader.js";
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
    `Run a SINGLE analysis robot and return its results. Call this one robot at a time so the user can review and give feedback before moving to the next.

Available robots — Phase 1 (strategic discovery, run first):
1. scout     — Market demand (TAM/SAM/SOM, growth, demand signals)
2. detective — Competitive landscape (competitors, gaps, moat)
3. people    — User personas (segments, pain points, behaviors)
4. money     — Financial projections (unit economics, revenue models)
5. feature   — Feature breakdown (must-have, nice-to-have, future)
6. plan      — Product roadmap (phased 12-18 month plan)
7. priority  — Feature prioritization (RICE scoring)

Available robots — Phase 2 (execution definition, requires all Phase 1 fresh):
8. user-stories — MoSCoW-tagged user stories derived from people + feature outputs

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
// Tool 3: FEEDBACK — capture user rating for a robot's output
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "feedback",
    `Save user feedback for a robot's analysis output. Call this after showing the user each robot's results and asking them to rate it.

The feedback is stored and used to improve future analyses:
- Ratings 4-5: recorded as successful patterns
- Ratings 1-3: recorded as areas to improve

If the analysis session is tied to a product (productSlug was used on run-robot), the feedback is also appended to the robot's asset markdown file on disk.

The learning engine will show improvement hints to robots on future runs.`,
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
            .describe(
                "User's improvement suggestions or comments, e.g. 'Add more specific TAM numbers' or 'Great competitive analysis'"
            ),
    },
    async ({ analysisId, robotName, rating, notes }) => {
        await teamLeader.saveFeedback(
            analysisId,
            robotName,
            rating,
            notes || ""
        );

        const nextRobot = teamLeader.getNextRobot(analysisId);

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        saved: true,
                        robotName,
                        rating,
                        notes: notes || "",
                        nextRobot,
                        message: nextRobot
                            ? `Feedback saved! Next up: ${nextRobot} robot.`
                            : "Feedback saved! All robots are done. Call 'generate-presentation' to create the final deliverable.",
                    }),
                },
            ],
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 4: GENERATE-PRESENTATION — prompt Claude to build HTML
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "generate-presentation",
    `Begin the presentation generation process.
This tool does NOT immediately create the file! 
If the user's design preferences (logo, fonts, theme) are missing from the database, this tool returns an instruction telling you to ask the user for them.
If the preferences exist, it returns all the analysis data + design preferences + instructions on how YOU (Claude) should generate the final HTML code.`,
    {
        analysisId: z
            .string()
            .describe("The analysis session ID to generate a presentation for"),
    },
    async ({ analysisId }) => {
        const data = teamLeader.getFullResults(analysisId);
        if (!data) {
            return {
                content: [{ type: "text", text: `Analysis session '${analysisId}' not found.` }],
            };
        }

        const prefs = teamLeader.database.getDesignPreferences();

        if (!prefs) {
            return {
                content: [{
                    type: "text", text: JSON.stringify({
                        actionRequired: "ask_user_for_preferences",
                        instructions: "The user has not set their presentation design preferences. Ask them for their preferred logo URL (or skip if none), font families, primary/accent colors, and overall visual theme (e.g., dark mode, corporate, playful). Wait for their reply, then call 'save-design-preferences'. Afterward, call 'generate-presentation' again."
                    }, null, 2)
                }]
            };
        }

        // Also save analysis data to DB like the old flow
        await teamLeader.database.saveAnalysis(data.productIdea, data.results);

        const prompt = {
            _claudeInstructions: {
                role: "You are a world-class Web Designer and Presentation expert.",
                mandate: [
                    "You are generating the final deliverable. Output a completely self-contained HTML document with inline CSS.",
                    "Use the design preferences provided to style the presentation (fonts, colors, theme, logo).",
                    "Do NOT use markdown outside of the final file. Just return the raw HTML file or use a markdown codeblock.",
                    "Take all the analysis data provided and format it into a stunning, responsive, web-based presentation.",
                    "Include a title slide, one gorgeous slide for each robot's output, and a final summary slide.",
                    "Once you have generated the HTML, call the 'save-presentation-file' tool to write it to disk."
                ]
            },
            designPreferences: prefs,
            analysisData: data
        };

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(prompt, null, 2),
                },
            ],
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
    "List all available ProductFlow analysis robots, their capabilities, and average user ratings from past feedback.",
    {},
    async () => {
        const robots = [
            { name: "Scout Robot", key: "scout", type: "market-demand", description: "Analyzes market demand and size (TAM/SAM/SOM)" },
            { name: "Detective Robot", key: "detective", type: "competitive-analysis", description: "Analyzes competitors, market gaps, and competitive moat" },
            { name: "People Robot", key: "people", type: "personas", description: "Creates detailed user personas with pain points and motivations" },
            { name: "Money Robot", key: "money", type: "financial", description: "Calculates financial projections and unit economics" },
            { name: "Feature Robot", key: "feature", type: "features", description: "Generates prioritized feature list (must-have, nice-to-have, future)" },
            { name: "Plan Robot", key: "plan", type: "roadmap", description: "Creates phased product roadmap (12-18 months)" },
            { name: "Priority Robot", key: "priority", type: "prioritization", description: "Prioritizes features using RICE scoring" },
        ];

        // Add average ratings from past feedback
        for (const robot of robots) {
            robot.averageRating = teamLeader.database.getRobotAverageRating(robot.key);
        }

        return {
            content: [
                { type: "text", text: JSON.stringify({ robots }, null, 2) },
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
// Tool 8: PM-PROFILE — read the PM's identity profile
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "pm-profile",
    `Retrieve the PM's profile (role, industry focus, preferred frameworks, products owned).
Returns { exists: false, actionRequired: 'setup' } if no profile exists — in that case, you should interview the PM to collect their details and then call 'pm-profile-save'.
If a profile exists but is older than 90 days, returns { exists: true, staleness: 'stale' } — ask the PM whether anything has changed before proceeding.`,
    {},
    async () => {
        await workspace.ensureWorkspace();
        const profile = await pmProfile.load();

        if (!profile) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        exists: false,
                        actionRequired: "setup",
                        instructions: "No PM profile found. Interview the user to gather: their name, role/title, industry focus, preferred frameworks (e.g. JTBD, RICE, OKRs), and preferred analysis depth. Then call 'pm-profile-save' with the collected fields.",
                        workspaceRoot: workspace.getRoot(),
                    }, null, 2)
                }]
            };
        }

        // Calculate staleness (90 day window for profile refresh check)
        const updatedAt = profile.updated ? new Date(profile.updated) : null;
        const ageDays = updatedAt
            ? Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24))
            : null;
        const staleness = ageDays !== null && ageDays > 90 ? "stale" : "fresh";

        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    exists: true,
                    staleness,
                    ageDays,
                    profile,
                    instructions: staleness === "stale"
                        ? "Profile is older than 90 days — ask the PM to confirm it is still accurate, or collect updates and call 'pm-profile-save'."
                        : "Profile is fresh. Reference it when running robots to tailor analyses to the PM's style.",
                }, null, 2)
            }]
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 9: PM-PROFILE-SAVE — persist a PM profile after interview
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "pm-profile-save",
    `Save or update the PM's profile. Call this after interviewing the PM on their role, industry focus, and working style. All fields are optional — unspecified fields keep their prior values.`,
    {
        name: z.string().optional().describe("PM's name, e.g. 'Anand Shrivastava'"),
        role: z.string().optional().describe("Title / role, e.g. 'Senior Product Leader'"),
        industryFocus: z.string().optional().describe("Industry focus, e.g. 'CCaaS, CPaaS, AI-driven CXM'"),
        preferredFrameworks: z.string().optional().describe("Preferred PM frameworks, e.g. 'JTBD, RICE, OKRs'"),
        analysisDepth: z.string().optional().describe("Depth preference, e.g. 'Deep' or 'Summary-first'"),
        productsOwned: z.array(z.string()).optional().describe("Slugs of products the PM owns"),
    },
    async (patch) => {
        const saved = await pmProfile.save(patch);
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    saved: true,
                    profile: saved,
                    path: workspace.getPmProfilePath(),
                    message: "PM profile saved. The file is human-editable — you can always edit it directly.",
                }, null, 2)
            }]
        };
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
  note            — ad-hoc note or observation
  url             — a link with optional commentary
  document        — a longer writeup (stored as its own file in context/documents/)
  analyst-report  — third-party research report pasted as text

Notes and URLs are appended to notes.md. Documents and analyst reports are
saved as individual markdown files in context/documents/.`,
    {
        productSlug: z.string().describe("Product slug to attach context to"),
        type: z.enum(["note", "url", "document", "analyst-report"]).describe("Context entry type"),
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
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        saved: true,
                        entry: saved,
                        message: `Context entry '${title}' saved to product '${productSlug}'.`,
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
        type: z.enum(["note", "url", "document", "analyst-report"]).optional().describe("Filter by entry type"),
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
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        saved: true,
                        robotName,
                        productSlug,
                        relPath,
                        absPath: `${teamLeader.workspace.getAssetsDir(productSlug)}/${relPath.split("/").pop()}`,
                        message: `${robotName} output saved. Phase 2 robots will use this file.`,
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
// Tool 18: PROMOTE-TO-PHASE-2 — gate check + Phase 2 context scaffold
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "promote-to-phase-2",
    `Promote a product from Phase 1 (strategic discovery) to Phase 2 (execution definition).

This tool:
1. Checks that ALL 7 Phase 1 robots are fresh for this product (gate enforcement).
2. Scaffolds context/phase2-context.json with initial values the PM can fill in.
3. Returns instructions telling Claude to present a Phase 1 summary to the PM and collect Phase 2 intake.

Do NOT call run-robot with a Phase 2 robot (user-stories, scope-spec, etc.) until this tool
returns { promoted: true }.  The gate is also enforced inside run-robot itself, but calling
promote-to-phase-2 first gives the PM a clear summary of what they are promoting.`,
    {
        productSlug: z.string().describe("The product slug to promote"),
        ownerName:   z.string().optional().describe("PM's name for the PDD owner field"),
        ownerRole:   z.string().optional().describe("PM's role, e.g. 'Senior Product Manager'"),
        ownerEmail:  z.string().optional().describe("PM's email for the PDD meta section"),
    },
    async ({ productSlug, ownerName, ownerRole, ownerEmail }) => {
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

        // Gate check
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

        // Scaffold phase2-context.json
        const p2Path = teamLeader.workspace.getPhase2ContextPath(productSlug);
        const pddDir = teamLeader.workspace.getPDDDir(productSlug);

        await fspath.mkdir(pddDir, { recursive: true });

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
                jira:       null,
                tdd:        null,
                figma:      null,
                confluence: null,
            },
            // PM-provided overrides — fill these in after reviewing Phase 1 outputs
            personaOverride:  "",
            featureOverride:  "",
            scopeOverride:    "",
        };

        // Idempotent — only scaffold if not already present
        let alreadyExisted = false;
        try {
            await fspath.access(p2Path);
            alreadyExisted = true;
        } catch {
            await fspath.writeFile(p2Path, JSON.stringify(phase2Manifest, null, 2), "utf-8");
        }

        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    promoted: true,
                    alreadyExisted,
                    productSlug,
                    pddVersion: phase2Manifest.pddVersion,
                    phase2ManifestPath: p2Path,
                    pddOutputDir: pddDir,
                    phase2Robots: ROBOT_ORDER_PHASE_2,
                    message: alreadyExisted
                        ? `Product '${productSlug}' is already in Phase 2. Manifest unchanged.`
                        : `Product '${productSlug}' promoted to Phase 2. You may now run Phase 2 robots.`,
                    instructions: [
                        "Phase 2 is unlocked. Run Phase 2 robots via 'run-robot' in the recommended order.",
                        "Recommended first robot: user-stories (tightest dependency graph).",
                        "Optional: edit context/phase2-context.json to add personaOverride, featureOverride, or scopeOverride before running robots.",
                        "After each Phase 2 robot runs, call 'save-robot-output' to persist Claude's analysis for downstream robots.",
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
                            "USER STORIES: Map from user-stories robot JSON output — preserve MoSCoW priority tags (Must Have / Should Have / Could Have / Won't Have).",
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